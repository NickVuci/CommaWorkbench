import { clear } from './dom.js';

const noopPanel = {
  showIdle(){},
  showPump(){},
  setModeAvailability(){ }
};

function fmtCents(value){
  if(!Number.isFinite(value)) return '—';
  return (Math.abs(value) < 0.001 ? '0.000' : value.toFixed(3)) + '¢';
}

function fmtHz(value){
  if(!Number.isFinite(value)) return '—';
  return value.toFixed(2) + ' Hz';
}

function renderWalkTable(container, walk, mode){
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
  ['#','Step','Δ (JI)','Σ JI','Σ EDO','Pitch'].forEach((label)=>{
    const th=document.createElement('th'); th.textContent=label; trh.appendChild(th);
  });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody=document.createElement('tbody');
  const useEdoPitch = mode === 'edo';
  walk.points.forEach((row)=>{
    const tr=document.createElement('tr');
    const pitchHz = useEdoPitch && Number.isFinite(row.freqHzEDO) ? row.freqHzEDO : (Number.isFinite(row.freqHzJI) ? row.freqHzJI : row.freqHz);
    const cells=[
      row.index,
      row.stepName,
      fmtCents(row.deltaJI),
      fmtCents(row.cumulativeJI),
      row.cumulativeEDO==null? '—' : fmtCents(row.cumulativeEDO),
      fmtHz(pitchHz)
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
    return { dotsByMode: { ji: [], edo: [] } };
  }
  const width = container.clientWidth || 320;
  const height = 140;
  const paddingX = 16;
  const paddingY = 12;
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
  const innerWidth = Math.max(1, width - paddingX * 2);
  const innerHeight = Math.max(1, height - paddingY * 2);
  const getX = (idx)=>{
    if(pts.length<=1) return paddingX + innerWidth/2;
    return paddingX + (innerWidth/(pts.length-1)) * idx;
  };
  const getY = (val)=> height - paddingY - ((val - min)/span) * innerHeight;

  function buildPath(key){
    let d='';
    let started=false;
    pts.forEach((pt, idx)=>{
      const val = pt[key];
      if(!Number.isFinite(val)) { started=false; return; }
      const x = getX(idx);
      const y = getY(val);
      d += (started ? ' L ' : 'M ') + x + ' ' + y;
      started=true;
    });
    return d;
  }

  if(min < 0 && max > 0){
    const zeroY = getY(0);
    const axis = document.createElementNS(svgNS, 'line');
    axis.setAttribute('x1', String(paddingX));
    axis.setAttribute('y1', String(zeroY));
    axis.setAttribute('x2', String(width - paddingX));
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

  const dotsByMode = { ji: [], edo: [] };
  function appendDot(mode, idx, value){
    if(!Number.isFinite(value)) return;
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('class', 'sparkline-dot mode-'+mode);
    dot.dataset.pointIndex = String(idx);
    dot.dataset.mode = mode;
    if(idx===0) dot.classList.add('base');
    dot.setAttribute('cx', String(getX(idx)));
    dot.setAttribute('cy', String(getY(value)));
    dot.setAttribute('r', '4');
    svg.appendChild(dot);
    if(!dotsByMode[mode]) dotsByMode[mode]=[];
    dotsByMode[mode].push(dot);
  }

  pts.forEach((pt, idx)=>{
    appendDot('ji', idx, pt.cumulativeJI);
    appendDot('edo', idx, pt.cumulativeEDO);
  });

  container.appendChild(svg);
  return { dotsByMode };
}

export function initPumpPreviewPanel(container){
  if(!container) return noopPanel;
  const emptyEl = container.querySelector('[data-slot="empty"]');
  const bodyEl = container.querySelector('[data-slot="body"]');
  const titleEl = container.querySelector('[data-slot="title"]');
  const chartEl = container.querySelector('[data-slot="chart"]');
  const walkTableEl = container.querySelector('[data-slot="walkTable"]');
  const jiChip = container.querySelector('[data-mode="ji"]');
  const edoChip = container.querySelector('[data-mode="edo"]');
  let activeDots = { ji: [], edo: [] };
  let currentMode = 'ji';

  function setActiveWalkPoint(index, mode){
    const targetMode = (mode === 'edo' || mode === 'ji') ? mode : currentMode;
    const hasIndex = Number.isFinite(index);
    const dotGroups = (activeDots && typeof activeDots === 'object') ? activeDots : {};
    Object.keys(dotGroups).forEach((key)=>{
      const dots = dotGroups[key] || [];
      dots.forEach((dot)=>{
        const match = hasIndex && key === targetMode && Number(dot.dataset.pointIndex) === index;
        dot.classList.toggle('active', !!match);
      });
    });
  }

  function setActiveMode(mode){
    const nextMode = (mode === 'edo' && (!edoChip || !edoChip.classList.contains('muted'))) ? 'edo' : 'ji';
    currentMode = nextMode;
    container.dataset.mode = nextMode;
    setActiveWalkPoint(null, nextMode);
    return currentMode;
  }

  function setModeAvailability(opts){
    const edoEnabled = !!(opts && opts.edoEnabled);
    const edoValue = opts && Number.isFinite(opts.edoValue) ? Number(opts.edoValue) : null;
    if(edoChip){
      edoChip.classList.toggle('muted', !edoEnabled);
      edoChip.textContent = edoEnabled ? `${edoValue || '?'} EDO` : 'Select an EDO to enable';
    }
    if(jiChip){
      jiChip.textContent = 'JI';
    }
  }

  function showIdle(opts){
    container.dataset.state = 'idle';
    activeDots = { ji: [], edo: [] };
    if(emptyEl){
      emptyEl.textContent = (opts && opts.message) || 'Select a pump row to stage audio + stack view experiments.';
    }
    if(bodyEl){
      bodyEl.setAttribute('aria-hidden','true');
    }
    setModeAvailability({ edoEnabled: !!(opts && opts.edoEnabled), edoValue: opts && opts.edoValue });
    setActiveMode((opts && opts.mode) || currentMode);
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
    const chartState = renderSparkline(chartEl, payload.walk);
    activeDots = chartState && chartState.dotsByMode ? chartState.dotsByMode : { ji: [], edo: [] };
    const appliedMode = setActiveMode(payload.mode || currentMode);
    renderWalkTable(walkTableEl, payload.walk, appliedMode);
  }

  showIdle();
  return {
    showIdle,
    showPump,
    setModeAvailability,
    setActiveWalkPoint,
    setActiveMode
  };
}
