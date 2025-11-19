import { l1, vecEq } from './core/number.js';
import { applySteps, centsFromMonzo } from './core/monzo.js';
import { parsePrimeInput } from './core/primes.js';
import { generateIntervalsForVocabulary } from './theory/intervals.js';
import { enumerateNotableCommas, enumerateNotableCommasAsync } from './theory/commas.js';
import { edosTemperingComma } from './theory/edos.js';
import { enumeratePumpsAsync } from './theory/pumps.js';
import { buildStepsChips as buildStepsChipsUI, stepsSelected as stepsSelectedUI } from './ui/stepsUI.js';
import { renderCommaTable } from './ui/commaTable.js';
import { renderEdoPanel } from './ui/edoTable.js';
import { renderPumpTable, renderPumpEquivalences, canonicalizePumps } from './ui/pumpTable.js';
import { renderTestResults } from './ui/testsUI.js';
import { runSelfTests } from './tests/selfTests.js';

/* imports replace previous in-file implementations */

/* ===== UI state ===== */
var stepsChips = document.getElementById('stepsChips');
var primeInput = document.getElementById('primeInput');
var oddLimitInput = document.getElementById('oddLimit');
var maxStepsShownInput = document.getElementById('maxStepsShown');
var maxCentDeviationInput = document.getElementById('maxCentDeviation');
var pumpTableBody = document.querySelector('#pumpTable tbody');
var pumpProgress = document.getElementById('pumpProgress');
var pumpCancelBtn = document.getElementById('pumpCancel');
var pumpEtaEl = document.getElementById('pumpEta');
var pumpStatusEl = document.getElementById('pumpStatus');
var pumpEquivalencesEl = document.getElementById('pumpEquivalences');
var canonicalizeToggle = document.getElementById('canonicalizePumps');
var runPumpsBtn = document.getElementById('runPumpsBtn');
// Track the currently active pump search to avoid stale UI updates
var currentPumpRunId = 0;
var currentPumpCancel = null;
var commaTableBody = document.querySelector('#commaTable tbody');
var edoPanel = document.getElementById('edoPanel');
var kpiCommas = document.getElementById('kpiCommas');
var kpiPairs  = document.getElementById('kpiPairs');
var kpiPumps  = document.getElementById('kpiPumps');
var kpiSteps  = document.getElementById('kpiSteps');
var runBtn = document.getElementById('runBtn');
var clearBtn = document.getElementById('clearBtn');
var testBtn = document.getElementById('testBtn');
var lastCommas=[]; var lastMatches=new Map(); var generatedSteps=[];
var selectedCommaIndex = -1;

if(commaTableBody){
  commaTableBody.addEventListener('click', function(ev){
    var target = ev.target;
    if(!target) return;
    var row = target.closest('tr[data-index]');
    if(!row) return;
    var idx = Number(row.dataset.index);
    if(Number.isNaN(idx)) return;
    setSelectedComma(idx);
  });
}

function buildStepsChips(){
  var primes = parsePrimeInput(primeInput.value);
  var oddL = Number(oddLimitInput.value)||11; var maxSteps = Number(maxStepsShownInput.value)||60;
  generatedSteps = generateIntervalsForVocabulary(primes, oddL, maxSteps);
  if(kpiSteps) kpiSteps.textContent = String(generatedSteps.length);
  buildStepsChipsUI(stepsChips, generatedSteps, 5);
}
function stepsSelected(){
  return stepsSelectedUI(stepsChips, generatedSteps);
}

function renderCommas(primes){
  renderCommaTable(commaTableBody, lastCommas, primes);
  if(selectedCommaIndex >= lastCommas.length){ selectedCommaIndex = -1; }
  updateCommaSelectionHighlight();
  updateSelectedCommaPanel(primes);
}

function updateCommaSelectionHighlight(){
  if(!commaTableBody) return;
  var rows = commaTableBody.querySelectorAll('tr[data-index]');
  for(var i=0;i<rows.length;i++){
    var row = rows[i];
    var idx = Number(row.dataset.index);
    if(idx === selectedCommaIndex){ row.classList.add('selected'); }
    else { row.classList.remove('selected'); }
  }
}

function updateSelectedCommaPanel(primes){
  if(!edoPanel) return;
  var primesList = primes || parsePrimeInput(primeInput.value);
  if(selectedCommaIndex < 0 || selectedCommaIndex >= lastCommas.length){
    renderEdoPanel(edoPanel, null, primesList, []);
    if(kpiPairs) kpiPairs.textContent='0';
    return;
  }
  var comma = lastCommas[selectedCommaIndex];
  var key = comma.monzo.join(',');
  var edos = lastMatches.get(key) || [];
  renderEdoPanel(edoPanel, comma, primesList, edos);
  if(kpiPairs) kpiPairs.textContent = String(edos.length);
}

function setSelectedComma(idx){
  if(idx<0 || idx>=lastCommas.length) return;
  if(selectedCommaIndex === idx) return;
  selectedCommaIndex = idx;
  updateCommaSelectionHighlight();
  updateSelectedCommaPanel();
  cancelPumpSearch();
  clearPumpDisplays('Ready to run the pump search for the selected comma.');
}

function clearSelectedComma(){
  selectedCommaIndex = -1;
  updateCommaSelectionHighlight();
  updateSelectedCommaPanel();
  cancelPumpSearch();
  clearPumpDisplays('Select a comma and rerun the pump search.');
}

function cancelPumpSearch(){
  if(currentPumpCancel){
    try{ currentPumpCancel(); }
    catch(e){}
    currentPumpCancel = null;
  }
  if(runPumpsBtn) runPumpsBtn.disabled = false;
}

function clearPumpDisplays(message){
  if(pumpEquivalencesEl){ pumpEquivalencesEl.innerHTML=''; pumpEquivalencesEl.style.display='none'; }
  if(pumpProgress) pumpProgress.style.display='none';
  if(pumpTableBody) pumpTableBody.innerHTML='';
  if(pumpEtaEl) pumpEtaEl.textContent='ETA: —';
  if(pumpStatusEl) pumpStatusEl.textContent = message || 'Select "Run Pump Search" once ready.';
  if(kpiPumps) kpiPumps.textContent='0';
}

// (busy overlay removed)

function runPumpSearchForComma(idx){
  if(idx<0 || idx>=lastCommas.length) return;
  if(selectedCommaIndex !== idx){ setSelectedComma(idx); }
  // Prepare UI
  // Cancel any previous pump run to avoid interleaved updates
  cancelPumpSearch();
  if(runPumpsBtn) runPumpsBtn.disabled = true;
  if(pumpEquivalencesEl){ pumpEquivalencesEl.innerHTML=''; pumpEquivalencesEl.style.display='none'; }
  if(pumpTableBody) pumpTableBody.innerHTML='';
  if(kpiPumps) kpiPumps.textContent='0';
  if(pumpEtaEl) pumpEtaEl.textContent='ETA: —';
  if(pumpStatusEl) pumpStatusEl.textContent='Starting…';
  if(pumpProgress) pumpProgress.style.display='block';

  // Defer to allow overlay to paint
  setTimeout(function(){
    var primes = parsePrimeInput(primeInput.value);
    var steps = stepsSelected();
    var coeffBound = Number(document.getElementById('coeffBound').value)||6;
  var l1Cap = Number(document.getElementById('maxL1Steps').value)||Infinity;
    var c = lastCommas[idx].monzo;

  // Show equivalences implied by the comma and selected steps at the start only
  renderPumpEquivalences(pumpEquivalencesEl, steps, c);

    // Pre-run estimate and confirmation
  var k = steps.length; if(k===0){ if(pumpProgress) pumpProgress.style.display='none'; if(pumpStatusEl) pumpStatusEl.textContent='Select interval steps before running the pump search.'; if(runPumpsBtn) runPumpsBtn.disabled=false; return; }
    var estWork = Math.pow(2*coeffBound+1, Math.floor(k/2));
    // crude calibration to time (ms): scale factor beta; adjust if needed
    var beta = 0.02; // ms per unit (tunable)
    var estMs = Math.min(60000, estWork * beta);
    if(estWork > 2e6){
      var go = confirm('This pump search may be large.\n\nEstimated work: ~'+estWork.toLocaleString()+' states\nApprox time: ~'+Math.round(estMs/1000)+' s\n\nProceed?');
      if(!go){ if(pumpProgress) pumpProgress.style.display='none'; if(pumpStatusEl) pumpStatusEl.textContent='Pump search cancelled.'; if(runPumpsBtn) runPumpsBtn.disabled=false; return; }
    }

    // Stamp this run so only latest updates touch the UI
    var runId = (++currentPumpRunId);
    var start = performance.now();
    var lastProgressTs = start;
    var cancelHandle = null;
    var running = true;

    function updateProgress(meta){
      if(runId !== currentPumpRunId) return; // ignore stale
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
    function onCancel(){ if(runId !== currentPumpRunId) return; if(currentPumpCancel){ currentPumpCancel(); setCancelEnabled(false); pumpStatusEl.textContent+=' • cancelling…'; } }
  if(pumpCancelBtn){ pumpCancelBtn.onclick = onCancel; }

    // Start async enumeration
  cancelHandle = enumeratePumpsAsync(c, steps, { coeffBound, l1Cap, /* no cap or time limit by default */ chunkMs: 12, iterativeDeepen: true }, {
      onProgress: (meta)=>{ updateProgress(meta); },
  onBatch: (pumps)=>{ if(runId !== currentPumpRunId) return; const shown = canonicalizeToggle && canonicalizeToggle.checked ? canonicalizePumps(pumps, steps) : pumps; kpiPumps.textContent=String(shown.length); renderPumpTable(pumpTableBody, steps, shown, c); },
      onDone: (final, meta)=>{
        if(runId !== currentPumpRunId) return; running=false; setCancelEnabled(false); currentPumpCancel = null; if(runPumpsBtn) runPumpsBtn.disabled=false;
  const shown = canonicalizeToggle && canonicalizeToggle.checked ? canonicalizePumps(final, steps) : final;
  kpiPumps.textContent=String(shown.length); renderPumpTable(pumpTableBody, steps, shown, c);
        var note = meta.partial? (meta.reason==='time-budget'? 'Partial (time capped)':'Partial (cancelled)') : (meta.capped? 'Capped at max' : 'Complete');
        pumpStatusEl.textContent = note + ' • ' + String(final.length)+' shown';
        if(pumpProgress) pumpProgress.style.display='none';
      }
    });
    // Expose cancel for this run so new runs can cancel the previous one
    currentPumpCancel = cancelHandle && cancelHandle.cancel ? cancelHandle.cancel : null;
  }, 0);
}

/* ===== Orchestration ===== */
document.getElementById('regenStepsBtn').addEventListener('click', function(){ buildStepsChips(); });
document.getElementById('selectAllStepsBtn').addEventListener('click', function(){ var boxes=stepsChips.querySelectorAll('input[type=checkbox]'); for(var i=0;i<boxes.length;i++){ boxes[i].checked=true; } });
document.getElementById('clearStepsBtn').addEventListener('click', function(){ var boxes=stepsChips.querySelectorAll('input[type=checkbox]'); for(var i=0;i<boxes.length;i++){ boxes[i].checked=false; } });

if(runPumpsBtn){
  runPumpsBtn.addEventListener('click', function(){
    if(selectedCommaIndex < 0 || selectedCommaIndex >= lastCommas.length){
      alert('Select a comma in Step 1 first.');
      return;
    }
    runPumpSearchForComma(selectedCommaIndex);
  });
}

runBtn.addEventListener('click', function(){
  var primes = parsePrimeInput(primeInput.value);
  if (primes.length<2){ alert('Provide at least two primes. Example: 5  (≙ 2,3,5)'); return; }
  // Keep the steps vocabulary in sync with current primes/odd limit when running a query
  buildStepsChips();
  cancelPumpSearch();
  selectedCommaIndex = -1;
  updateCommaSelectionHighlight();
  updateSelectedCommaPanel(primes);
  clearPumpDisplays('Building comma catalog…');
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
      lastMatches = new Map();
      for(var i=0;i<lastCommas.length;i++){
        var c=lastCommas[i];
        var ed=edosTemperingComma(c.monzo,primes,Nmin,Nmax);
        lastMatches.set(c.monzo.join(','),ed);
      }
      selectedCommaIndex = -1;
      kpiCommas.textContent=String(lastCommas.length);
      kpiPairs.textContent='0';
      renderCommas(primes);
      clearPumpDisplays('Select a comma and run the pump search.');
      pumpProgress.style.display='none';
      runBtn.disabled=false; clearBtn.disabled=false; testBtn.disabled=false;
    }
  });
});

document.getElementById('clearBtn').addEventListener('click', function(){
  lastCommas=[]; lastMatches=new Map();
  if(commaTableBody) commaTableBody.innerHTML='';
  clearSelectedComma();
  if(kpiCommas) kpiCommas.textContent='0';
  if(kpiPairs) kpiPairs.textContent='0';
  clearPumpDisplays('Waiting for comma results.');
});

/* ===== Self-tests ===== */
// test rendering handled in testsUI via renderTestResults; below we still assemble results inline

document.getElementById('testBtn').addEventListener('click', function(){
  var tbody=document.querySelector('#testTable tbody');
  var results = runSelfTests({
    parsePrimeInput,
    centsFromMonzo,
    edosTemperingComma,
    generateIntervalsForVocabulary,
    canonicalizePumps
  });
  renderTestResults(tbody, results);
});

/* ===== Boot ===== */
buildStepsChips();
updateSelectedCommaPanel(parsePrimeInput(primeInput.value));
clearPumpDisplays('Select a comma and run the pump search.');
