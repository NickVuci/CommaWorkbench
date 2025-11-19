import { clear } from './dom.js';

export function renderEdoTable(tbodyEl, edos, selectedEdo){
  if(!tbodyEl) return;
  clear(tbodyEl);
  if(!edos || edos.length===0){
    const tr=document.createElement('tr');
    const td=document.createElement('td'); td.colSpan=3; td.className='hint';
    td.textContent='Select a comma to view its tempered EDOs.';
    tr.appendChild(td); tbodyEl.appendChild(tr);
    return;
  }
  edos.forEach((edo, idx)=>{
    const tr=document.createElement('tr');
    tr.dataset.edo=String(edo);
    tr.classList.add('table-row-selectable');
    if(selectedEdo===edo) tr.classList.add('selected');
    const td1=document.createElement('td'); td1.textContent=String(idx+1);
    const td2=document.createElement('td'); td2.textContent=String(edo)+'-EDO';
    const td3=document.createElement('td'); td3.textContent=String((1200/edo).toFixed(2)); td3.className='mono';
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbodyEl.appendChild(tr);
  });
}
