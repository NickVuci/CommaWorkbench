import { clear } from './dom.js';

export function renderEdoTable(tbodyEl, edos, selectedEdo){
  if(!tbodyEl) return;
  clear(tbodyEl);
  if(!edos || edos.length===0){
    const tr=document.createElement('tr');
    const td=document.createElement('td'); td.colSpan=1; td.className='hint';
    td.textContent='Select a comma to view its tempered EDOs.';
    tr.appendChild(td); tbodyEl.appendChild(tr);
    return;
  }
  edos.forEach((edo, idx)=>{
    const tr=document.createElement('tr');
    tr.dataset.edo=String(edo);
    tr.classList.add('table-row-selectable');
    if(selectedEdo===edo) tr.classList.add('selected');
    const td=document.createElement('td'); td.textContent=String(edo)+'-EDO';
    tr.appendChild(td);
    tbodyEl.appendChild(tr);
  });
}
