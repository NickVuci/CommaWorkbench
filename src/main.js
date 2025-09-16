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

function onSelectComma(idx){
  var primes = parsePrimeInput(primeInput.value);
  var steps = stepsSelected(); var coeffBound = Number(document.getElementById('coeffBound').value)||6;
  var c = lastCommas[idx].monzo; var pumps = enumeratePumps(c, steps, coeffBound); kpiPumps.textContent=String(pumps.length);
  renderPumpTable(pumpTableBody, steps, pumps, c);
}

/* ===== Orchestration ===== */
document.getElementById('regenStepsBtn').addEventListener('click', function(){ buildStepsChips(); });
document.getElementById('clearStepsBtn').addEventListener('click', function(){ var boxes=stepsChips.querySelectorAll('input[type=checkbox]'); for(var i=0;i<boxes.length;i++){ boxes[i].checked=false; } });

document.getElementById('runBtn').addEventListener('click', function(){
  var primes = parsePrimeInput(primeInput.value);
  if (primes.length<2){ alert('Provide at least two primes. Example: 5  (≙ 2,3,5)'); return; }
  var expBound = Number(document.getElementById('expBound').value)||5;
  var maxCents = Number(document.getElementById('maxCents').value)||30;
  var Nmin = Number(document.getElementById('edoMin').value)||5;
  var Nmax = Number(document.getElementById('edoMax').value)||72;
  lastCommas = enumerateNotableCommas(primes, expBound, maxCents);
  lastMatches = new Map(); var pairCount=0; for(var i=0;i<lastCommas.length;i++){ var c=lastCommas[i]; var ed=edosTemperingComma(c.monzo,primes,Nmin,Nmax); lastMatches.set(c.monzo.join(','),ed); pairCount+=ed.length; }
  kpiCommas.textContent=String(lastCommas.length); kpiPairs.textContent=String(pairCount); renderCommas(primes); pumpTableBody.innerHTML=''; kpiPumps.textContent='0';
});

document.getElementById('clearBtn').addEventListener('click', function(){ commaTableBody.innerHTML=''; pumpTableBody.innerHTML=''; kpiCommas.textContent='0'; kpiPairs.textContent='0'; kpiPumps.textContent='0'; });

/* ===== Self-tests ===== */
// test rendering handled in testsUI via renderTestResults; below we still assemble results inline

document.getElementById('testBtn').addEventListener('click', function(){
  var results=[];
  // Test 1: parsePrimeInput single limit
  var pA=parsePrimeInput('5'); var passA = pA.length===3 && pA[0]===2 && pA[1]===3 && pA[2]===5; results.push({ name:'parsePrimeInput("5") → 2,3,5', ok:passA, notes:'out='+pA.join(',') });
  // Test 2: parsePrimeInput subgroup
  var pB=parsePrimeInput('2,5,7'); var passB = pB.length===3 && pB[0]===2 && pB[1]===5 && pB[2]===7; results.push({ name:'parsePrimeInput("2,5,7") sorted', ok:passB, notes:'out='+pB.join(',') });
  // Test 3: cents(81/80)
  var cval = Math.abs(centsFromMonzo([-4,4,-1],[2,3,5])); results.push({ name:'cents(81/80) ≈ 21.5¢', ok:Math.abs(cval-21.506)<=0.25, notes:'cents='+cval.toFixed(3) });
  // Test 4: EDOs tempering syntonic include 12 and 19
  var edos = edosTemperingComma([-4,4,-1],[2,3,5],5,72); var has12=edos.indexOf(12)>=0; var has19=edos.indexOf(19)>=0; results.push({ name:'EDOs killing 81/80 include 12 & 19', ok:has12 && has19, notes:'found='+edos.slice(0,10).join(',')+'…' });
  // Test 5: vocabulary generation includes 9/8 when primes include 3 and oddLimit≥9
  var vocab = generateIntervalsForVocabulary([2,3,5],9,200); var hasNineOverEight=false; for(var i=0;i<vocab.length;i++){ if(vocab[i].name.indexOf('9/8')===0){ hasNineOverEight=true; break; } }
  results.push({ name:'Auto-steps include 9/8 with 5-limit, odd≤9', ok:hasNineOverEight, notes:'count='+String(vocab.length) });
  var tbody=document.querySelector('#testTable tbody');
  renderTestResults(tbody, results);
});

/* ===== Boot ===== */
buildStepsChips();
