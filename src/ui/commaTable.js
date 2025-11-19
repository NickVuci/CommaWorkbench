import { clear } from './dom.js';

export function ratioFromMonzo(mz, primes){
  const num=[]; const den=[];
  for(let i=0;i<mz.length;i++){
    const e=mz[i], p=primes[i];
    if(e>0) num.push(e===1? String(p):String(p)+'^'+String(e));
    else if(e<0) den.push(e===-1? String(p):String(p)+'^'+String(-e));
  }
  const N=num.length? num.join('·'):'1';
  const D=den.length? den.join('·'):'1';
  return N+'/'+D;
}

export function renderCommaTable(tbodyEl, commas, primes){
  clear(tbodyEl);
  if(!commas || commas.length===0){
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=3; td.className='hint';
    td.textContent='No commas found for these settings. Try increasing exponent bound or max cents, or include prime 3 in the subgroup.';
    tr.appendChild(td); tbodyEl.appendChild(tr);
    return;
  }
  commas.forEach((row, idx)=>{
    const tr = document.createElement('tr');
    tr.dataset.index = String(idx);
    tr.classList.add('table-row-selectable');
    const td2=document.createElement('td'); td2.className='mono'; td2.textContent=ratioFromMonzo(row.monzo,primes);
    const td3=document.createElement('td'); td3.className='mono'; td3.textContent='<'+row.monzo.join(', ')+'>';
    const td4=document.createElement('td'); td4.textContent=String(row.cents.toFixed(3));
    tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
    tbodyEl.appendChild(tr);
  });
}
