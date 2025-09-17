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

// Render simple equivalences "a=b" where step_i and step_j differ by the comma monzo
export function renderPumpEquivalences(containerEl, steps, comma){
  if(!containerEl) return;
  containerEl.innerHTML='';
  const n = steps.length; if(n<2){ containerEl.style.display='none'; return; }
  const eq = [];
  function monzoEq(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return false; } return true; }
  // We want steps i and j such that steps[i].monzo - steps[j].monzo == comma OR == -comma
  for(let i=0;i<n;i++){
    for(let j=i+1;j<n;j++){
      const si = steps[i].monzo, sj = steps[j].monzo;
      const diff = si.map((v,idx)=> v - (sj[idx]||0));
      if(monzoEq(diff, comma)){
        eq.push(steps[i].name.split(' ')[0] + '=' + steps[j].name.split(' ')[0]);
      } else {
        const diff2 = sj.map((v,idx)=> v - (si[idx]||0));
        if(monzoEq(diff2, comma)){
          eq.push(steps[j].name.split(' ')[0] + '=' + steps[i].name.split(' ')[0]);
        }
      }
    }
  }
  if(eq.length===0){ containerEl.style.display='none'; return; }
  containerEl.style.display='block';
  eq.slice(0,24).forEach(txt=>{
    const chip = document.createElement('span'); chip.className='chip'; chip.textContent = txt; containerEl.appendChild(chip);
  });
}
