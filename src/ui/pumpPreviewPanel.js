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
      fmtHz(row.freqHzJI || row.freqHz)
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

function buildSparklinePoints(walk){
  const hasEdo = walk.points.some((pt)=> Number.isFinite(pt.cumulativeEDO));
  const basePoint = { cumulativeJI: 0, cumulativeEDO: hasEdo ? 0 : null };
  const pts = [basePoint];
  walk.points.forEach((pt)=>{
    pts.push({
      cumulativeJI: Number.isFinite(pt.cumulativeJI) ? pt.cumulativeJI : 0,
      cumulativeEDO: Number.isFinite(pt.cumulativeEDO) ? pt.cumulativeEDO : (hasEdo ? null : null)
    });
  });
  return pts;
}

function renderSparkline(container, walk){
  if(!container) return;
  clear(container);
  if(!walk || !Array.isArray(walk.points) || walk.points.length===0){
    const empty=document.createElement('div');
    empty.className='chart-empty';
    empty.textContent='Select a pump to view the trajectory.';
    container.appendChild(empty);
    return { dots: [] };
  }
  const width = container.clientWidth || 320;
  const height = 140;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Pump trajectory sparkline');
  const pts = buildSparklinePoints(walk);
  const values=[];
  pts.forEach((pt)=>{
    if(Number.isFinite(pt.cumulativeJI)) values.push(pt.cumulativeJI);
    if(Number.isFinite(pt.cumulativeEDO)) values.push(pt.cumulativeEDO);
  });
  if(values.length===0) values.push(0);
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const span = Math.max(1e-6, max - min || 1);
  const stepX = pts.length>1 ? width/(pts.length-1) : width;
  const scaleY = (val)=> height - ((val - min)/span)*height;

  function buildPath(key){
    let d='';
    let started=false;
    pts.forEach((pt, idx)=>{
      const val = pt[key];
      if(!Number.isFinite(val)) { started=false; return; }
      const x = idx * stepX;
      const y = scaleY(val);
      d += (started ? ' L ' : 'M ') + x + ' ' + y;
      started=true;
    });
    return d;
  }

  if(min < 0 && max > 0){
    const zeroY = scaleY(0);
    const axis = document.createElementNS(svgNS, 'line');
    axis.setAttribute('x1', '0');
    axis.setAttribute('y1', String(zeroY));
    axis.setAttribute('x2', String(width));
    axis.setAttribute('y2', String(zeroY));
    axis.setAttribute('class', 'sparkline-axis');
    svg.appendChild(axis);
  }

  const jiPath = document.createElementNS(svgNS, 'path');
  jiPath.setAttribute('class', 'sparkline-path ji');
  jiPath.setAttribute('d', buildPath('cumulativeJI'));
  svg.appendChild(jiPath);

  const hasEdo = pts.some((pt)=> Number.isFinite(pt.cumulativeEDO));
  if(hasEdo){
    const edoPath = document.createElementNS(svgNS, 'path');
    edoPath.setAttribute('class', 'sparkline-path edo');
    edoPath.setAttribute('d', buildPath('cumulativeEDO'));
    svg.appendChild(edoPath);
  }

  const dots = [];
  pts.forEach((pt, idx)=>{
    if(!Number.isFinite(pt.cumulativeJI)) return;
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('class', 'sparkline-dot');
    if(idx===0) dot.classList.add('base');
    dot.dataset.pointIndex = String(idx);
    dot.setAttribute('cx', String(idx * stepX));
    dot.setAttribute('cy', String(scaleY(pt.cumulativeJI)));
    dot.setAttribute('r', '4');
    svg.appendChild(dot);
    dots.push(dot);
  });

  container.appendChild(svg);
  return { dots };
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
  const walkTableEl = container.querySelector('[data-slot="walkTable"]');
  const jiChip = container.querySelector('[data-mode="ji"]');
  const edoChip = container.querySelector('[data-mode="edo"]');
  let activeDots = [];

  function setActiveWalkPoint(index){
    if(!activeDots || activeDots.length===0){ return; }
    activeDots.forEach((dot)=>{
      const match = Number(dot.dataset.pointIndex) === index;
      dot.classList.toggle('active', index!=null && match);
    });
  }

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
    setActiveWalkPoint(null);
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
    const chartState = renderSparkline(chartEl, payload.walk);
    activeDots = chartState && Array.isArray(chartState.dots) ? chartState.dots : [];
    setActiveWalkPoint(null);
    renderWalkTable(walkTableEl, payload.walk);
  }

  showIdle();
  return {
    showIdle,
    showPump,
    setModeAvailability,
    setActiveWalkPoint
  };
}
