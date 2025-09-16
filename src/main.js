import { l1, vecEq } from './core/number.js';
import { applySteps, centsFromMonzo } from './core/monzo.js';
import { parsePrimeInput } from './core/primes.js';
import { generateIntervalsForVocabulary } from './theory/intervals.js';
import { enumerateNotableCommas, enumerateNotableCommasAsync } from './theory/commas.js';
import { edosTemperingComma } from './theory/edos.js';
import { enumeratePumpsAsync } from './theory/pumps.js';
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
var pumpProgress = document.getElementById('pumpProgress');
var pumpCancelBtn = document.getElementById('pumpCancel');
var pumpEtaEl = document.getElementById('pumpEta');
var pumpStatusEl = document.getElementById('pumpStatus');
var commaTableBody = document.querySelector('#commaTable tbody');
var kpiCommas = document.getElementById('kpiCommas');
var kpiPairs  = document.getElementById('kpiPairs');
var kpiPumps  = document.getElementById('kpiPumps');
var runBtn = document.getElementById('runBtn');
var clearBtn = document.getElementById('clearBtn');
var testBtn = document.getElementById('testBtn');
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

// (busy overlay removed)

function onSelectComma(idx){
  // Prepare UI
  pumpTableBody.innerHTML='';
  kpiPumps.textContent='0';
  pumpEtaEl.textContent='ETA: —';
  pumpStatusEl.textContent='Starting…';
  if(pumpProgress) pumpProgress.style.display='block';

  // Defer to allow overlay to paint
  setTimeout(function(){
    var primes = parsePrimeInput(primeInput.value);
    var steps = stepsSelected();
    var coeffBound = Number(document.getElementById('coeffBound').value)||6;
    var c = lastCommas[idx].monzo;

    // Pre-run estimate and confirmation
    var k = steps.length; if(k===0){ hideBusy(); if(pumpProgress) pumpProgress.style.display='none'; return; }
    var estWork = Math.pow(2*coeffBound+1, Math.floor(k/2));
    // crude calibration to time (ms): scale factor beta; adjust if needed
    var beta = 0.02; // ms per unit (tunable)
    var estMs = Math.min(60000, estWork * beta);
    if(estWork > 2e6){
      var go = confirm('This pump search may be large.\n\nEstimated work: ~'+estWork.toLocaleString()+' states\nApprox time: ~'+Math.round(estMs/1000)+' s\n\nProceed?');
      if(!go){ if(pumpProgress) pumpProgress.style.display='none'; return; }
    }

    var start = performance.now();
    var lastProgressTs = start;
    var cancelHandle = null;
    var running = true;

    function updateProgress(meta){
      var now = performance.now();
      var elapsed = now - start;
      // percent based on B progress if iterative, or time-based fallback
      var percent = Math.max(0, Math.min(100, Math.round((elapsed / Math.max(estMs, 500)) * 100)));
      var fill = pumpProgress.querySelector('.fill'); if(fill) fill.style.width = percent+'%';
      pumpEtaEl.textContent = 'ETA: '+(estMs>0? Math.max(0, Math.round((estMs - elapsed)/1000))+' s':'—');
      pumpStatusEl.textContent = 'B='+meta.B+' • '+meta.phase+' • '+meta.found+' found';
    }

    // Wire cancel button
    function setCancelEnabled(e){ if(pumpCancelBtn) pumpCancelBtn.disabled = !e; }
    setCancelEnabled(true);
    function onCancel(){ if(cancelHandle){ cancelHandle.cancel(); setCancelEnabled(false); pumpStatusEl.textContent+=' • cancelling…'; } }
  if(pumpCancelBtn){ pumpCancelBtn.onclick = onCancel; }

    // Start async enumeration
    cancelHandle = enumeratePumpsAsync(c, steps, { coeffBound, maxSolutions: 200, timeBudgetMs: 3000, chunkMs: 12, iterativeDeepen: true }, {
      onProgress: (meta)=>{ updateProgress(meta); },
      onBatch: (pumps)=>{ kpiPumps.textContent=String(pumps.length); renderPumpTable(pumpTableBody, steps, pumps, c); },
      onDone: (final, meta)=>{
        running=false; setCancelEnabled(false);
        kpiPumps.textContent=String(final.length); renderPumpTable(pumpTableBody, steps, final, c);
        var note = meta.partial? (meta.reason==='time-budget'? 'Partial (time capped)':'Partial (cancelled)') : (meta.capped? 'Capped at max' : 'Complete');
        pumpStatusEl.textContent = note + ' • ' + String(final.length)+' shown';
        if(pumpProgress) pumpProgress.style.display='none';
      }
    });
  }, 0);
}

/* ===== Orchestration ===== */
document.getElementById('regenStepsBtn').addEventListener('click', function(){ buildStepsChips(); });
document.getElementById('selectAllStepsBtn').addEventListener('click', function(){ var boxes=stepsChips.querySelectorAll('input[type=checkbox]'); for(var i=0;i<boxes.length;i++){ boxes[i].checked=true; } });
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
  // Reset progress UI for the commas phase
  if(pumpProgress) pumpProgress.style.display='block';
  pumpTableBody.innerHTML='';
  pumpEtaEl.textContent='ETA: —';
  pumpStatusEl.textContent='Building comma catalog…';
  runBtn.disabled=true; clearBtn.disabled=true; testBtn.disabled=true;
  // Pre-run estimate for commas (grid size minus zero)
  var lenPerDim=[]; for(var i=0;i<primes.length;i++){ lenPerDim.push((2*expBound+1)); }
  var totalStates = lenPerDim.reduce((p,x)=> p*x,1) - 1;
  var estMs = Math.min(15000, totalStates * 0.01);
  if(totalStates > 5e6){
    var go = confirm('This comma enumeration may be large.\n\nStates: ~'+totalStates.toLocaleString()+'\nApprox time: ~'+Math.round(estMs/1000)+' s\n\nProceed?');
    if(!go){ pumpProgress.style.display='none'; runBtn.disabled=false; clearBtn.disabled=false; testBtn.disabled=false; return; }
  }

  var start = performance.now();
  var cancelCommas = enumerateNotableCommasAsync(primes, expBound, maxCents, { chunkMs: 12, timeBudgetMs: 3000 }, {
    onProgress: (meta)=>{
      var elapsed = meta.elapsed;
      var percent = meta.percent || Math.round((elapsed/Math.max(estMs,500))*100);
      percent = Math.max(0, Math.min(100, percent));
      var fill = pumpProgress.querySelector('.fill'); if(fill) fill.style.width = percent+'%';
      pumpEtaEl.textContent = 'ETA: '+(estMs>0? Math.max(0, Math.round((estMs - elapsed)/1000))+' s':'—');
      pumpStatusEl.textContent = 'Enumerating commas… '+percent+'%';
    },
    onBatch: (items)=>{
      // update counts progressively if desired
    },
    onDone: (all, meta)=>{
      lastCommas = all;
      lastMatches = new Map(); var pairCount=0; for(var i=0;i<lastCommas.length;i++){ var c=lastCommas[i]; var ed=edosTemperingComma(c.monzo,primes,Nmin,Nmax); lastMatches.set(c.monzo.join(','),ed); pairCount+=ed.length; }
      kpiCommas.textContent=String(lastCommas.length); kpiPairs.textContent=String(pairCount); renderCommas(primes); pumpTableBody.innerHTML=''; kpiPumps.textContent='0';
      pumpProgress.style.display='none';
      runBtn.disabled=false; clearBtn.disabled=false; testBtn.disabled=false;
    }
  });
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
