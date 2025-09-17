import { l1, vecEq } from '../core/number.js';
import { applySteps } from '../core/monzo.js';
import { clear } from './dom.js';

export function renderPumpTable(tbodyEl, steps, pumps, comma){
  clear(tbodyEl);
  for(let i=0;i<pumps.length;i++){
    const x=pumps[i]; const L=l1(x); const chk=applySteps(steps,x);
    const parts=[]; for(let j=0;j<x.length;j++){ const k=x[j]; if(!k) continue; parts.push((k>=0? '+'+String(k):String(k))+'·'+steps[j].name); }
    const tr=document.createElement('tr');
    const a=document.createElement('td'); a.textContent=String(i+1);
    const b=document.createElement('td'); b.className='mono'; b.textContent=parts.join('  +  ')||'all zeros';
    const c1=document.createElement('td'); c1.textContent=String(L);
    const d=document.createElement('td'); d.className='mono'; d.textContent='<'+chk.join(', ')+'>'+ (vecEq(chk,comma)?' ✅':'');
    tr.appendChild(a); tr.appendChild(b); tr.appendChild(c1); tr.appendChild(d); tbodyEl.appendChild(tr);
  }
}

// Compute simple equivalences "a=b" where step_i and step_j differ by the comma monzo
export function findStepEquivalences(steps, comma){
  const n = steps.length; if(n<2) return [];
  const eq = [];
  const keyOf = (mz)=> mz.join(',');
  const keyMinus = (mz)=> mz.map((v,i)=> v - (comma[i]||0));
  const keyPlus  = (mz)=> mz.map((v,i)=> v + (comma[i]||0));
  // Build lookup from monzo key to index
  const indexByKey = new Map();
  for(let i=0;i<n;i++){ indexByKey.set(keyOf(steps[i].monzo), i); }
  for(let i=0;i<n;i++){
    const si = steps[i].monzo;
    const kMinus = keyOf(keyMinus(si));
    const j1 = indexByKey.get(kMinus);
    if(j1!==undefined && j1>i){ eq.push(steps[i].name.split(' ')[0] + '=' + steps[j1].name.split(' ')[0]); }
    const kPlus = keyOf(keyPlus(si));
    const j2 = indexByKey.get(kPlus);
    if(j2!==undefined && j2>i){ eq.push(steps[j2].name.split(' ')[0] + '=' + steps[i].name.split(' ')[0]); }
  }
  return eq;
}

// Render simple equivalences using findStepEquivalences
export function renderPumpEquivalences(containerEl, steps, comma){
  if(!containerEl) return;
  containerEl.innerHTML='';
  const eq = findStepEquivalences(steps, comma);
  if(eq.length===0){ containerEl.style.display='none'; return; }
  containerEl.style.display='block';
  eq.slice(0,24).forEach(txt=>{
    const chip = document.createElement('span'); chip.className='chip'; chip.textContent = txt; containerEl.appendChild(chip);
  });
}
