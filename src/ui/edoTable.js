import { clear } from './dom.js';
import { ratioFromMonzo } from './commaTable.js';

export function renderEdoPanel(panelEl, comma, primes, edoList){
  if(!panelEl) return;
  clear(panelEl);
  if(!comma){
    const hint=document.createElement('div');
    hint.className='hint';
    hint.textContent='Select a comma in Step 1 to inspect the EDOs that temper it.';
    panelEl.appendChild(hint);
    return;
  }

  const ratio = ratioFromMonzo(comma.monzo, primes);
  const meta=document.createElement('div'); meta.className='selected-comma-meta';
  meta.appendChild(metaBlock('Ratio', ratio, true));
  meta.appendChild(metaBlock('Monzo', '<'+comma.monzo.join(', ')+'>', true));
  meta.appendChild(metaBlock('Size', String(comma.cents.toFixed(3))+'¢', false));
  panelEl.appendChild(meta);

  const edoHeader=document.createElement('div');
  edoHeader.className='hint';
  edoHeader.textContent='Tempered by';
  panelEl.appendChild(edoHeader);

  const edosContainer=document.createElement('div');
  edosContainer.className='edo-list';
  if(edoList && edoList.length){
    edoList.forEach((edo)=>{
      const pill=document.createElement('div');
      pill.className='edo-pill';
      pill.textContent=String(edo)+'-EDO';
      edosContainer.appendChild(pill);
    });
  }else{
    const empty=document.createElement('div');
    empty.className='empty';
    empty.textContent='No EDOs in the configured range temper this comma.';
    edosContainer.appendChild(empty);
  }
  panelEl.appendChild(edosContainer);
}

function metaBlock(label, value, mono){
  const wrap=document.createElement('div');
  const lab=document.createElement('div'); lab.className='label'; lab.textContent=label;
  const val=document.createElement('div'); val.className='value'+(mono?' mono':''); val.textContent=value;
  wrap.appendChild(lab); wrap.appendChild(val);
  return wrap;
}
