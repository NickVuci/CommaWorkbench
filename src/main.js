import { l1, vecEq } from './core/number.js';
import { applySteps, centsFromMonzo } from './core/monzo.js';
import { parsePrimeInput } from './core/primes.js';
import { generateIntervalsForVocabulary } from './theory/intervals.js';
import { enumerateNotableCommas } from './theory/commas.js';
import { edosTemperingComma } from './theory/edos.js';
import { enumeratePumps } from './theory/pumps.js';
import { buildStepsChips as buildStepsChipsUI, stepsSelected as stepsSelectedUI } from './ui/stepsUI.js';
import { renderCommaTable } from './ui/commaTable.js';
import { renderPumpTable } from './ui/pumpTable.js';
import { renderTestResults } from './ui/testsUI.js';
import { runSelfTests } from './tests/selfTests.js';

/* imports replace previous in-file implementations */

/* ===== UI state ===== */
var stepsChips = document.getElementById('stepsChips');
var primeInput = document.getElementById('primeInput');
var oddLimitInput = document.getElementById('oddLimit');
var maxStepsShownInput = document.getElementById('maxStepsShown');
var pumpTableBody = document.querySelector('#pumpTable tbody');
var commaTableBody = document.querySelector('#commaTable tbody');
var kpiCommas = document.getElementById('kpiCommas');
var kpiPairs  = document.getElementById('kpiPairs');
var kpiPumps  = document.getElementById('kpiPumps');
var busyOverlay = document.getElementById('busyOverlay');
var runBtn = document.getElementById('runBtn');
var clearBtn = document.getElementById('clearBtn');
var testBtn = document.getElementById('testBtn');
var busyTextEl = document.getElementById('busyText');
var lastCommas=[]; var lastMatches=new Map(); var generatedSteps=[];

// Handle pump button clicks emitted as custom events from the comma table
commaTableBody.addEventListener('comma:pumps', function(ev){ onSelectComma(ev.detail.index); });

function buildStepsChips(){
  var primes = parsePrimeInput(primeInput.value);
  var oddL = Number(oddLimitInput.value)||11; var maxSteps = Number(maxStepsShownInput.value)||60;
  generatedSteps = generateIntervalsForVocabulary(primes, oddL, maxSteps);
  buildStepsChipsUI(stepsChips, generatedSteps, 5);
}
function stepsSelected(){
  return stepsSelectedUI(stepsChips, generatedSteps);
}

function ratioFromMonzo(mz, primes){ var num=[]; var den=[]; for(var i=0;i<mz.length;i++){ var e=mz[i], p=primes[i]; if(e>0) num.push(e===1? String(p):String(p)+'^'+String(e)); else if(e<0) den.push(e===-1? String(p):String(p)+'^'+String(-e)); } var N=num.length? num.join('·'):'1'; var D=den.length? den.join('·'):'1'; return N+'/'+D; }

function renderCommas(primes){
  renderCommaTable(commaTableBody, lastCommas, primes, lastMatches);
}

function showBusy(text){ if(busyTextEl) busyTextEl.textContent = text||'Working…'; if(busyOverlay) busyOverlay.style.display='flex'; }
function hideBusy(){ if(busyOverlay) busyOverlay.style.display='none'; }

function onSelectComma(idx){
  showBusy('Finding pumps…');
  // Defer heavy work to next tick to allow overlay to paint
  setTimeout(function(){
    try{
      var primes = parsePrimeInput(primeInput.value);
      var steps = stepsSelected(); var coeffBound = Number(document.getElementById('coeffBound').value)||6;
      var c = lastCommas[idx].monzo; var pumps = enumeratePumps(c, steps, coeffBound); kpiPumps.textContent=String(pumps.length);
      renderPumpTable(pumpTableBody, steps, pumps, c);
    } finally {
      hideBusy();
    }
  }, 0);
}

/* ===== Orchestration ===== */
document.getElementById('regenStepsBtn').addEventListener('click', function(){ buildStepsChips(); });
document.getElementById('clearStepsBtn').addEventListener('click', function(){ var boxes=stepsChips.querySelectorAll('input[type=checkbox]'); for(var i=0;i<boxes.length;i++){ boxes[i].checked=false; } });

runBtn.addEventListener('click', function(){
  var primes = parsePrimeInput(primeInput.value);
  if (primes.length<2){ alert('Provide at least two primes. Example: 5  (≙ 2,3,5)'); return; }
  // Keep the steps vocabulary in sync with current primes/odd limit when running a query
  buildStepsChips();
  var expBound = Number(document.getElementById('expBound').value)||5;
  var maxCents = Number(document.getElementById('maxCents').value)||30;
  var Nmin = Number(document.getElementById('edoMin').value)||5;
  var Nmax = Number(document.getElementById('edoMax').value)||72;
  // Show busy state and disable interacting controls during computation
  showBusy('Enumerating commas…');
  runBtn.disabled=true; clearBtn.disabled=true; testBtn.disabled=true;
  // Defer heavy work to next tick to allow overlay to paint
  setTimeout(function(){
    try{
      lastCommas = enumerateNotableCommas(primes, expBound, maxCents);
      lastMatches = new Map(); var pairCount=0; for(var i=0;i<lastCommas.length;i++){ var c=lastCommas[i]; var ed=edosTemperingComma(c.monzo,primes,Nmin,Nmax); lastMatches.set(c.monzo.join(','),ed); pairCount+=ed.length; }
      kpiCommas.textContent=String(lastCommas.length); kpiPairs.textContent=String(pairCount); renderCommas(primes); pumpTableBody.innerHTML=''; kpiPumps.textContent='0';
    } finally {
      hideBusy();
      runBtn.disabled=false; clearBtn.disabled=false; testBtn.disabled=false;
    }
  }, 0);
});

document.getElementById('clearBtn').addEventListener('click', function(){ commaTableBody.innerHTML=''; pumpTableBody.innerHTML=''; kpiCommas.textContent='0'; kpiPairs.textContent='0'; kpiPumps.textContent='0'; });

/* ===== Self-tests ===== */
// test rendering handled in testsUI via renderTestResults; below we still assemble results inline

document.getElementById('testBtn').addEventListener('click', function(){
  var tbody=document.querySelector('#testTable tbody');
  var results = runSelfTests({
    parsePrimeInput,
    centsFromMonzo,
    edosTemperingComma,
    generateIntervalsForVocabulary
  });
  renderTestResults(tbody, results);
});

/* ===== Boot ===== */
buildStepsChips();
