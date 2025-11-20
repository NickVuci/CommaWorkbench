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
  let totalAbsMoves = 0;

  for(let i=0;i<coeffs.length;i++){
    const coeff = coeffs[i];
    if(!coeff) continue;
    const step = vocab[i] || null;
    const stepCents = step && Number.isFinite(step.cents) ? step.cents : 0;
    if(stepCents === 0) continue;
    const delta = coeff * stepCents;
    cumJI += delta;
    totalAbsMoves += Math.abs(coeff);
    const approxCents = edoStepSize ? Math.round(cumJI / edoStepSize) * edoStepSize : null;
    const freqJI = centsToHz(basePitchHz, cumJI);
    const freqEDO = approxCents==null ? null : centsToHz(basePitchHz, approxCents);
    points.push({
      index: points.length + 1,
      coeff,
      stepName: formatStepName(step, 'step '+String(i+1)),
      deltaJI: delta,
      cumulativeJI: cumJI,
      cumulativeEDO: approxCents,
      freqHz: freqJI,
      freqHzJI: freqJI,
      freqHzEDO: freqEDO
    });
  }

  return {
    points,
    summary: {
      totalAbsMoves,
      netCents: cumJI,
      edo,
      edoStepSize,
      basePitchHz
    }
  };
}
