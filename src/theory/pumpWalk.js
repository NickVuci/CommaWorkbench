const DEFAULT_BASE_HZ = 440;

function toNumberOr(value, fallback){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function centsToHz(baseHz, cents){
  return baseHz * Math.pow(2, cents / 1200);
}

function formatStepName(step, fallback){
  if(!step) return fallback;
  if(typeof step.name === 'string') return step.name;
  if(step.ratio) return String(step.ratio);
  return fallback;
}

// Build a simple walk over a pump: cumulative cents trajectory plus optional EDO projection.
// Returns { points: [...], summary: { totalAbsMoves, netCents, edo, edoStepSize, basePitchHz } }
export function buildPumpWalk(pump, steps, options){
  const coeffs = Array.isArray(pump) ? pump : [];
  const vocab = Array.isArray(steps) ? steps : [];
  const opts = options || {};
  const edo = Number.isFinite(opts.edo) ? opts.edo : null;
  const edoStepSize = edo ? 1200 / edo : null;
  const basePitchHz = Math.max(1, toNumberOr(opts.basePitchHz, DEFAULT_BASE_HZ));
  const points = [];
  let cumJI = 0;
  let cumEDO = edoStepSize ? 0 : null;
  let totalAbsMoves = 0;

  let stepCounter = 0;
  for(let i=0;i<coeffs.length;i++){
    const coeffRaw = coeffs[i];
    if(!coeffRaw) continue;
    const step = vocab[i] || null;
    const stepCents = step && Number.isFinite(step.cents) ? step.cents : 0;
    if(stepCents === 0) continue;
    const repeats = Math.abs(Math.trunc(coeffRaw));
    if(repeats === 0) continue;
    const direction = coeffRaw >= 0 ? 1 : -1;
    const signedName = (direction >=0 ? '+' : '-') + ' ' + formatStepName(step, 'step '+String(i+1));
    for(let r=0; r<repeats; r++){
      const delta = direction * stepCents;
      cumJI += delta;
      totalAbsMoves += 1;
      const deltaEDO = edoStepSize ? Math.round(delta / edoStepSize) * edoStepSize : null;
      if(deltaEDO!=null){
        cumEDO += deltaEDO;
      }
      const freqJI = centsToHz(basePitchHz, cumJI);
      const freqEDO = cumEDO==null ? null : centsToHz(basePitchHz, cumEDO);
      points.push({
        index: (++stepCounter),
        coeff: direction,
        stepName: signedName,
        sourceStepIndex: i,
        repeatIndex: r+1,
        repeatCount: repeats,
        deltaJI: delta,
        deltaEDO: deltaEDO,
        cumulativeJI: cumJI,
        cumulativeEDO: cumEDO,
        freqHz: freqJI,
        freqHzJI: freqJI,
        freqHzEDO: freqEDO
      });
    }
  }

  return {
    points,
    summary: {
      totalAbsMoves,
      netCents: cumJI,
      netCentsEDO: cumEDO,
      edo,
      edoStepSize,
      basePitchHz
    }
  };
}
