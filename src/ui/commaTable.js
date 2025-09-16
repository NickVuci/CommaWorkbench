import { clear } from './dom.js';

function ratioFromMonzo(mz, primes){
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

export function renderCommaTable(tbodyEl, commas, primes, edoMatches){
  clear(tbodyEl);
  commas.forEach((row, idx)=>{
    const edos = edoMatches.get(row.monzo.join(','))||[];
    const tr = document.createElement('tr');
    const td1=document.createElement('td'); td1.textContent=String(idx+1);
    const td2=document.createElement('td'); td2.className='mono'; td2.textContent=ratioFromMonzo(row.monzo,primes);
    const td3=document.createElement('td'); td3.className='mono'; td3.textContent='<'+row.monzo.join(', ')+'>';
    const td4=document.createElement('td'); td4.textContent=String(row.cents.toFixed(3));
    const td5=document.createElement('td');
    if(edos.length){ td5.textContent=edos.join(', ');} else { const sp=document.createElement('span'); sp.className='hint'; sp.textContent='none in range'; td5.appendChild(sp);} 
    const td6=document.createElement('td');
    const btn=document.createElement('button'); btn.className='secondary'; btn.textContent='Pumps'; btn.setAttribute('data-index', String(idx));
    btn.addEventListener('click', ()=>{
      const ev = new CustomEvent('comma:pumps', { detail:{ index: idx }, bubbles:true });
      tbodyEl.dispatchEvent(ev);
    });
    td6.appendChild(btn);
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5); tr.appendChild(td6);
    tbodyEl.appendChild(tr);
  });
}
