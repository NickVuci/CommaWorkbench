import { l1, vecEq } from './core/number.js';
import { applySteps, centsFromMonzo } from './core/monzo.js';
import { parsePrimeInput } from './core/primes.js';
import { generateIntervalsForVocabulary } from './theory/intervals.js';
import { enumerateNotableCommas } from './theory/commas.js';
import { edosTemperingComma } from './theory/edos.js';
import { enumeratePumps } from './theory/pumps.js';

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

function buildStepsChips(){
  stepsChips.innerHTML='';
  var primes = parsePrimeInput(primeInput.value);
  var oddL = Number(oddLimitInput.value)||11; var maxSteps = Number(maxStepsShownInput.value)||60;
  generatedSteps = generateIntervalsForVocabulary(primes, oddL, maxSteps);
  for(var i=0;i<generatedSteps.length;i++){
    var it = generatedSteps[i];
    var lab = document.createElement('label'); lab.className='chip';
    var box = document.createElement('input'); box.type='checkbox'; box.value=String(i);
    // default: preselect a handful of smallest
    if(i<5) box.checked=true;
    var span = document.createElement('span'); span.textContent = it.name;
    lab.appendChild(box); lab.appendChild(span); stepsChips.appendChild(lab);
  }
}
function stepsSelected(){
  var boxes = stepsChips.querySelectorAll('input[type=checkbox]'); var out=[];
  for(var i=0;i<boxes.length;i++){ var b=boxes[i]; if(b.checked){ var idx=Number(b.value); var it=generatedSteps[idx]; if(it) out.push({ name:it.name, monzo:it.monzo }); } }
  return out;
}

function ratioFromMonzo(mz, primes){ var num=[]; var den=[]; for(var i=0;i<mz.length;i++){ var e=mz[i], p=primes[i]; if(e>0) num.push(e===1? String(p):String(p)+'^'+String(e)); else if(e<0) den.push(e===-1? String(p):String(p)+'^'+String(-e)); } var N=num.length? num.join('·'):'1'; var D=den.length? den.join('·'):'1'; return N+'/'+D; }

function renderCommaTable(primes){
  commaTableBody.innerHTML='';
  for(var idx=0; idx<lastCommas.length; idx++){
    var row = lastCommas[idx]; var edos = lastMatches.get(row.monzo.join(','))||[];
    var tr = document.createElement('tr');
    var td1=document.createElement('td'); td1.textContent=String(idx+1);
    var td2=document.createElement('td'); td2.className='mono'; td2.textContent=ratioFromMonzo(row.monzo,primes);
    var td3=document.createElement('td'); td3.className='mono'; td3.textContent='<'+row.monzo.join(', ')+'>';
    var td4=document.createElement('td'); td4.textContent=String(row.cents.toFixed(3));
    var td5=document.createElement('td'); if(edos.length){ td5.textContent=edos.join(', ');} else { var sp=document.createElement('span'); sp.className='hint'; sp.textContent='none in range'; td5.appendChild(sp);} 
    var td6=document.createElement('td'); var btn=document.createElement('button'); btn.className='secondary'; btn.textContent='Pumps'; btn.setAttribute('data-index', String(idx)); td6.appendChild(btn);
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5); tr.appendChild(td6); commaTableBody.appendChild(tr);
  }
  var btns = commaTableBody.querySelectorAll('button');
  for(var b=0;b<btns.length;b++){ btns[b].addEventListener('click', function(){ var idx=Number(this.getAttribute('data-index')); onSelectComma(idx); }); }
}

function onSelectComma(idx){
  var primes = parsePrimeInput(primeInput.value);
  var steps = stepsSelected(); var coeffBound = Number(document.getElementById('coeffBound').value)||6;
  var c = lastCommas[idx].monzo; var pumps = enumeratePumps(c, steps, coeffBound); kpiPumps.textContent=String(pumps.length);
  pumpTableBody.innerHTML='';
  for(var i=0;i<pumps.length && i<200;i++){
    var x=pumps[i]; var l=l1(x); var chk=applySteps(steps,x); var parts=[]; for(var j=0;j<x.length;j++){ var k=x[j]; if(!k) continue; parts.push((k>=0? '+'+String(k):String(k))+'·'+steps[j].name); }
    var tr=document.createElement('tr'); var a=document.createElement('td'); a.textContent=String(i+1); var b=document.createElement('td'); b.className='mono'; b.textContent=parts.join('  +  ')||'all zeros'; var c1=document.createElement('td'); c1.textContent=String(l); var d=document.createElement('td'); d.className='mono'; d.textContent='<'+chk.join(', ')+'>'+ (vecEq(chk,c)?' ✅':'');
    tr.appendChild(a); tr.appendChild(b); tr.appendChild(c1); tr.appendChild(d); pumpTableBody.appendChild(tr);
  }
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
  kpiCommas.textContent=String(lastCommas.length); kpiPairs.textContent=String(pairCount); renderCommaTable(primes); pumpTableBody.innerHTML=''; kpiPumps.textContent='0';
});

document.getElementById('clearBtn').addEventListener('click', function(){ commaTableBody.innerHTML=''; pumpTableBody.innerHTML=''; kpiCommas.textContent='0'; kpiPairs.textContent='0'; kpiPumps.textContent='0'; });

/* ===== Self-tests ===== */
function addTestRow(idx, name, ok, notes){ var tbody=document.querySelector('#testTable tbody'); var tr=document.createElement('tr'); var td1=document.createElement('td'); td1.textContent=String(idx); var td2=document.createElement('td'); td2.textContent=name; var td3=document.createElement('td'); td3.innerHTML= ok? '<span class="pass">PASS</span>':'<span class="fail">FAIL</span>'; var td4=document.createElement('td'); td4.textContent=notes||''; tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tbody.appendChild(tr); }

document.getElementById('testBtn').addEventListener('click', function(){
  var tbody=document.querySelector('#testTable tbody'); tbody.innerHTML=''; var t=1;
  // Test 1: parsePrimeInput single limit
  var pA=parsePrimeInput('5'); var passA = pA.length===3 && pA[0]===2 && pA[1]===3 && pA[2]===5; addTestRow(t++, 'parsePrimeInput("5") → 2,3,5', passA, 'out='+pA.join(','));
  // Test 2: parsePrimeInput subgroup
  var pB=parsePrimeInput('2,5,7'); var passB = pB.length===3 && pB[0]===2 && pB[1]===5 && pB[2]===7; addTestRow(t++, 'parsePrimeInput("2,5,7") sorted', passB, 'out='+pB.join(','));
  // Test 3: cents(81/80)
  var cval = Math.abs(centsFromMonzo([-4,4,-1],[2,3,5])); addTestRow(t++, 'cents(81/80) ≈ 21.5¢', Math.abs(cval-21.506)<=0.25, 'cents='+cval.toFixed(3));
  // Test 4: EDOs tempering syntonic include 12 and 19
  var edos = edosTemperingComma([-4,4,-1],[2,3,5],5,72); var has12=edos.indexOf(12)>=0; var has19=edos.indexOf(19)>=0; addTestRow(t++, 'EDOs killing 81/80 include 12 & 19', has12 && has19, 'found='+edos.slice(0,10).join(',')+'…');
  // Test 5: vocabulary generation includes 9/8 when primes include 3 and oddLimit≥9
  var vocab = generateIntervalsForVocabulary([2,3,5],9,200); var hasNineOverEight=false; for(var i=0;i<vocab.length;i++){ if(vocab[i].name.indexOf('9/8')===0){ hasNineOverEight=true; break; } } addTestRow(t++, 'Auto-steps include 9/8 with 5-limit, odd≤9', hasNineOverEight, 'count='+String(vocab.length));
});

/* ===== Boot ===== */
buildStepsChips();
