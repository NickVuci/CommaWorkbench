import { clear } from './dom.js';
import { ratioFromMonzo } from './commaTable.js';

export function renderEdoTable(tbodyEl, commas, primes, edoMatches){
  if(!tbodyEl) return;
  clear(tbodyEl);
  if(!commas || commas.length===0){
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=3; td.className='hint';
    td.textContent='Run a comma search to list the EDOs that temper each result.';
    tr.appendChild(td); tbodyEl.appendChild(tr);
    return;
  }
  commas.forEach((row, idx)=>{
    const edos = edoMatches.get(row.monzo.join(','))||[];
    const tr=document.createElement('tr');
    const td1=document.createElement('td'); td1.textContent=String(idx+1);
    const td2=document.createElement('td'); td2.className='mono'; td2.textContent=ratioFromMonzo(row.monzo, primes);
    const td3=document.createElement('td');
    if(edos.length){ td3.textContent=edos.join(', '); }
    else {
      const span=document.createElement('span'); span.className='hint'; span.textContent='none in range';
      td3.appendChild(span);
    }
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbodyEl.appendChild(tr);
  });
}
