import { clear } from './dom.js';

export function buildStepsChips(containerEl, steps, preselectCount=5){
  clear(containerEl);
  steps.forEach((it, i)=>{
    const lab = document.createElement('label'); lab.className='chip';
    const box = document.createElement('input'); box.type='checkbox'; box.value=String(i);
    if(i<preselectCount) box.checked=true;
    const span = document.createElement('span'); span.textContent = it.name;
    lab.appendChild(box); lab.appendChild(span); containerEl.appendChild(lab);
    box.addEventListener('change', () => renderSelectedIntervals(containerEl, steps));
  });
  renderSelectedIntervals(containerEl, steps);
}

export function stepsSelected(containerEl, generatedSteps){
  const boxes = containerEl.querySelectorAll('input[type=checkbox]');
  const out=[];
  for(let i=0;i<boxes.length;i++){
    const b=boxes[i]; if(b.checked){ const idx=Number(b.value); const it=generatedSteps[idx]; if(it) out.push({ name:it.name, monzo:it.monzo }); }
  }
  return out;
}

function renderSelectedIntervals(containerEl, steps){
  const selectedContainer = document.getElementById('selected-intervals-container');
  clear(selectedContainer);
  const selected = stepsSelected(containerEl, steps);
  selected.forEach(step => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = step.name;
    selectedContainer.appendChild(chip);
  });
}
