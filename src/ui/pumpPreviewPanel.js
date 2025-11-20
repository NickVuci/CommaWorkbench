import { clear } from './dom.js';

const noopPanel = {
  showIdle(){},
  showPump(){},
  setModeAvailability(){ }
};

function describePump(pump, steps){
  if(!pump) return '—';
  const parts=[];
  for(let i=0;i<pump.length;i++){
    const coeff = pump[i];
    if(!coeff) continue;
    const label = steps && steps[i] ? steps[i].name : 'step '+String(i+1);
    parts.push((coeff>=0? '+'+coeff : String(coeff)) + '·' + label);
  }
  return parts.join('  ');
}

function fmtCents(value){
  if(!Number.isFinite(value)) return '—';
  return (Math.abs(value) < 0.001 ? '0.000' : value.toFixed(3)) + '¢';
}

function fmtHz(value){
  if(!Number.isFinite(value)) return '—';
  return value.toFixed(2) + ' Hz';
}

function renderWalkTable(container, walk){
  if(!container) return;
  clear(container);
  if(!walk || !Array.isArray(walk.points) || walk.points.length===0){
    container.classList.add('placeholder');
    container.textContent = 'Pump has no active coefficients yet.';
    return;
  }
  container.classList.remove('placeholder');
  const table = document.createElement('table');
  table.className = 'pump-walk-table';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['#','Step','Coeff','Δ (JI)','Σ JI','Σ EDO','Pitch'].forEach((label)=>{
    const th=document.createElement('th'); th.textContent=label; trh.appendChild(th);
  });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody=document.createElement('tbody');
  walk.points.forEach((row)=>{
    const tr=document.createElement('tr');
    const cells=[
      row.index,
      row.stepName,
      row.coeff,
      fmtCents(row.deltaJI),
      fmtCents(row.cumulativeJI),
      row.cumulativeEDO==null? '—' : fmtCents(row.cumulativeEDO),
      fmtHz(row.freqHz)
    ];
    cells.forEach((cell, idx)=>{
      const td=document.createElement('td');
      if(idx>=3 && typeof cell==='string' && cell.includes('¢')) td.classList.add('mono');
      td.textContent = typeof cell==='number'? String(cell) : cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function buildSummaryText(payload){
  const walk = payload && payload.walk;
  if(!walk || !walk.summary) return describePump(payload && payload.pump, payload && payload.steps);
  const total = walk.summary.totalAbsMoves || 0;
  const net = walk.summary.netCents || 0;
  const base = walk.summary.basePitchHz ? fmtHz(walk.summary.basePitchHz) : '';
  const edoStep = walk.summary.edoStepSize;
  const edoPart = walk.summary.edo ? ` • ${walk.summary.edo} EDO (Δ ${(edoStep || 0).toFixed(3)}¢)` : '';
  return `${total} moves • closure ${fmtCents(net)} • base ${base}${edoPart}`;
}

export function initPumpPreviewPanel(container){
  if(!container) return noopPanel;
  const emptyEl = container.querySelector('[data-slot="empty"]');
  const bodyEl = container.querySelector('[data-slot="body"]');
  const titleEl = container.querySelector('[data-slot="title"]');
  const summaryEl = container.querySelector('[data-slot="summary"]');
  const noteEl = container.querySelector('[data-slot="note"]');
  const chartEl = container.querySelector('[data-slot="chart"]');
  const jiChip = container.querySelector('[data-mode="ji"]');
  const edoChip = container.querySelector('[data-mode="edo"]');

  function setModeAvailability(opts){
    const edoEnabled = !!(opts && opts.edoEnabled);
    const edoValue = opts && Number.isFinite(opts.edoValue) ? Number(opts.edoValue) : null;
    if(edoChip){
      edoChip.classList.toggle('muted', !edoEnabled);
      edoChip.textContent = edoEnabled ? `${edoValue || '?'} EDO (planned)` : 'Select an EDO to enable';
    }
    if(jiChip){
      jiChip.textContent = 'JI (planned)';
    }
  }

  function showIdle(opts){
    container.dataset.state = 'idle';
    if(emptyEl){
      emptyEl.textContent = (opts && opts.message) || 'Select a pump row to stage audio + stack view experiments.';
    }
    if(bodyEl){
      bodyEl.setAttribute('aria-hidden','true');
    }
    setModeAvailability({ edoEnabled: !!(opts && opts.edoEnabled), edoValue: opts && opts.edoValue });
  }

  function showPump(payload){
    if(!payload || !Array.isArray(payload.pump)){
      showIdle(payload);
      return;
    }
    container.dataset.state = 'active';
    if(bodyEl){
      bodyEl.removeAttribute('aria-hidden');
    }
    setModeAvailability({ edoEnabled: !!payload.edoEnabled, edoValue: payload.edoValue });
    if(titleEl){
      const title = typeof payload.title === 'string' ? payload.title : 'Pump preview';
      titleEl.textContent = title;
    }
    if(summaryEl){
      summaryEl.textContent = describePump(payload.pump, payload.steps);
    }
    if(noteEl){
      noteEl.textContent = buildSummaryText(payload);
    }
    if(chartEl){
      renderWalkTable(chartEl, payload.walk);
    }
  }

  showIdle();
  return {
    showIdle,
    showPump,
    setModeAvailability
  };
}
