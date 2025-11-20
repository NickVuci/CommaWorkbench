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

export function initPumpPreviewPanel(container){
  if(!container) return noopPanel;
  const emptyEl = container.querySelector('[data-slot="empty"]');
  const bodyEl = container.querySelector('[data-slot="body"]');
  const titleEl = container.querySelector('[data-slot="title"]');
  const summaryEl = container.querySelector('[data-slot="summary"]');
  const chartEl = container.querySelector('[data-slot="chart"]');
  const jiChip = container.querySelector('[data-mode="ji"]');
  const edoChip = container.querySelector('[data-mode="edo"]');

  function setModeAvailability(opts){
    const edoEnabled = !!(opts && opts.edoEnabled);
    if(edoChip){
      edoChip.classList.toggle('muted', !edoEnabled);
      edoChip.textContent = edoEnabled ? 'Selected EDO (planned)' : 'Select an EDO to enable';
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
    setModeAvailability({ edoEnabled: !!(opts && opts.edoEnabled) });
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
    setModeAvailability({ edoEnabled: !!payload.edoEnabled });
    if(titleEl){
      const title = typeof payload.title === 'string' ? payload.title : 'Pump preview';
      titleEl.textContent = title;
    }
    if(summaryEl){
      summaryEl.textContent = describePump(payload.pump, payload.steps);
    }
    if(chartEl){
      const moves = payload.pump.reduce((acc,val)=> acc + Math.abs(val||0),0);
      const label = moves ? `${moves} total step traversals (mock data)` : 'Awaiting pump coefficients';
      chartEl.textContent = 'Stack view placeholder — ' + label;
    }
  }

  showIdle();
  return {
    showIdle,
    showPump,
    setModeAvailability
  };
}
