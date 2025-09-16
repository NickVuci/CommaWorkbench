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
