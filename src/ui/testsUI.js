import { clear } from './dom.js';

export function addTestRow(tbodyEl, idx, name, ok, notes){
  const tr=document.createElement('tr');
  const td1=document.createElement('td'); td1.textContent=String(idx);
  const td2=document.createElement('td'); td2.textContent=name;
  const td3=document.createElement('td'); td3.innerHTML= ok? '<span class="pass">PASS</span>':'<span class="fail">FAIL</span>';
  const td4=document.createElement('td'); td4.textContent=notes||'';
  tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tbodyEl.appendChild(tr);
}

export function renderTestResults(tbodyEl, results){
  clear(tbodyEl);
  results.forEach((r, i)=> addTestRow(tbodyEl, i+1, r.name, r.ok, r.notes));
}
