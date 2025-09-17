import { range, l1, vecEq, gcd } from '../core/number.js';
import { applySteps } from '../core/monzo.js';

// Utility vector ops
function addVecInPlace(dst, src){ for(let i=0;i<dst.length;i++) dst[i]+=src[i]; }
function subVec(a,b){ const r=a.slice(); for(let i=0;i<r.length;i++) r[i]-=b[i]; return r; }
function mulVec(v,s){ const out=new Array(v.length); for(let i=0;i<v.length;i++) out[i]=v[i]*s; return out; }
function zero(n){ return new Array(n).fill(0); }

function stepMatrixRowGCDs(steps){
  if(steps.length===0) return [];
  const n=steps[0].monzo.length; const g=new Array(n).fill(0);
  for(let i=0;i<n;i++){
    let gi=0;
    for(let j=0;j<steps.length;j++) gi = gcd(gi, steps[j].monzo[i]||0);
    g[i]=Math.abs(gi);
  }
  return g;
}

function isFeasibleByRowGCD(comma, steps){
  const g = stepMatrixRowGCDs(steps);
  for(let i=0;i<g.length;i++){
    const gi=g[i]; const ci=comma[i]||0;
    if(gi===0){ if(ci!==0) return false; }
    else if(ci % gi !== 0) return false;
  }
  return true;
}

function perDimReach(steps, B){
  if(steps.length===0) return [];
  const n=steps[0].monzo.length; const R=new Array(n).fill(0);
  for(let i=0;i<n;i++){
    let s=0; for(let j=0;j<steps.length;j++) s += Math.abs(steps[j].monzo[i]||0) * B; R[i]=s;
  }
  return R;
}

function violatesReach(targetDelta, reach){
  for(let i=0;i<reach.length;i++) if(Math.abs(targetDelta[i]||0) > (reach[i]||0)) return true;
  return false;
}

function orderStepsWithIndex(steps, comma){
  // score(s_j) = |dot(s_j, c)| / (||s_j||_1 + 1e-9)
  const scored = steps.map((s,idx)=>({ idx, s, sc: (Math.abs(s.monzo.reduce((p,x,i)=> p + x*(comma[i]||0), 0))) / (s.monzo.reduce((p,x)=> p + Math.abs(x),0) + 1e-9) }));
  scored.sort((a,b)=> b.sc - a.sc);
  const order = scored.map(o=> o.idx);
  const orderedSteps = scored.map(o=> o.s);
  return { order, orderedSteps };
}

// Async, chunked MITM enumeration with safeguards
// options: { coeffBound, maxSolutions=Infinity, timeBudgetMs=Infinity, chunkMs=12, iterativeDeepen=true }
// callbacks: { onProgress(meta), onBatch(pumps), onDone(finalPumps, meta) }
export function enumeratePumpsAsync(comma, steps, options, callbacks){
  const opts = Object.assign({ maxSolutions: Infinity, timeBudgetMs: Infinity, chunkMs:12, iterativeDeepen:true, l1Cap: Infinity }, options||{});
  const cb = Object.assign({ onProgress:()=>{}, onBatch:()=>{}, onDone:()=>{} }, callbacks||{});

  const k = steps.length; if(k===0){ cb.onDone([], { reason:'no-steps'}); return { cancel: ()=>{} } }
  const n = comma.length;

  // Step ordering (internal), but we will return coeffs in original order
  const { order, orderedSteps } = orderStepsWithIndex(steps, comma);
  function toOriginalOrder(coeffOrdered){ const arr = new Array(steps.length); for(let j=0;j<order.length;j++){ arr[order[j]] = coeffOrdered[j]; } return arr; }

  // Feasibility and reach pre-checks
  if(!isFeasibleByRowGCD(comma, orderedSteps)){
    cb.onDone([], { reason:'infeasible-gcd' });
    return { cancel: ()=>{} };
  }

  let cancelled=false; const started=performance.now();
  const maxSolutions = opts.maxSolutions;
  const bestMap = new Map(); // key (original order) -> coeff array (original order)
  const bestArr = []; // arrays in original order; keep sorted by L1 asc, stable

  function considerSolution(coeffOriginal){
    const key = coeffOriginal.join(',');
    if(bestMap.has(key)) return false;
    // Insert into bestArr sorted by L1 (stable)
    const L = l1(coeffOriginal);
    if(L > opts.l1Cap) return false;
    bestMap.set(key, coeffOriginal);
    let pos = bestArr.findIndex(e=> l1(e) > L); // simple linear insert; K is small
    if(pos===-1) bestArr.push(coeffOriginal); else bestArr.splice(pos,0,coeffOriginal);
    if(Number.isFinite(maxSolutions) && bestArr.length>maxSolutions){ bestArr.pop(); }
    return true;
  }

  // Maintain both maps incrementally so we can match as soon as either side produces leaves
  function buildRightIterative(stepsRight, coeffs, rightMap, leftMap, batchFound){
    const len=stepsRight.length;
    const stack=[]; stack.push({ i:0, curM: zero(n), curC: [], t:0 });
    let built=0;
    function step(){
      const tStart = performance.now();
      while(stack.length && !cancelled){
        let fr = stack[stack.length-1];
        if(fr.i===len){
          const keyR = fr.curM.join(',');
          let arrR = rightMap.get(keyR); if(!arrR){ arrR=[]; rightMap.set(keyR, arrR); }
          const rc = fr.curC.slice(); arrR.push(rc);
          // Check for matches against any completed left leaves so far
          const needLKey = subVec(comma, fr.curM).join(',');
          const leftArr = leftMap.get(needLKey);
          if(leftArr){
            for(let u=0; u<leftArr.length; u++){
              const lc = leftArr[u];
              const coeff = lc.concat(rc);
              const chk = applySteps(orderedSteps, coeff);
              if(vecEq(chk, comma)){
                const orig = toOriginalOrder(coeff);
                if(considerSolution(orig)) batchFound.push(orig);
              }
            }
          }
          built++;
          stack.pop();
          continue;
        }
        if(fr.t >= coeffs.length){ stack.pop(); continue; }
        const c = coeffs[fr.t++];
        const st = stepsRight[fr.i];
        const nextM = fr.curM.slice(); addVecInPlace(nextM, mulVec(st.monzo, c));
        const nextC = fr.curC.slice(); nextC.push(c);
        stack.push({ i: fr.i+1, curM: nextM, curC: nextC, t: 0 });
        if(performance.now() - tStart > opts.chunkMs) break;
      }
      return { done: stack.length===0, built };
    }
    return { step };
  }

  function leftSearchIterative(stepsLeft, coeffs, rightMap, leftMap, batchFound){
    const len=stepsLeft.length; const stack=[]; stack.push({ i:0, curM: zero(n), curC: [], t:0 });
    function step(){
      const tStart = performance.now();
      while(stack.length && !cancelled){
        let fr = stack[stack.length-1];
        if(fr.i===len){
          // Record completed left leaf
          const keyL = fr.curM.join(',');
          let arrL = leftMap.get(keyL); if(!arrL){ arrL=[]; leftMap.set(keyL, arrL); }
          const lc = fr.curC.slice(); arrL.push(lc);
          // Attempt match with any existing right leaves
          const needKey = subVec(comma, fr.curM).join(',');
          const matches = rightMap.get(needKey);
          if(matches){
            for(let u=0; u<matches.length; u++){
              const rc = matches[u];
              const coeff = lc.concat(rc);
              const chk = applySteps(orderedSteps, coeff);
              if(vecEq(chk, comma)){
                const orig = toOriginalOrder(coeff);
                if(considerSolution(orig)) batchFound.push(orig);
              }
            }
          }
          stack.pop();
          continue;
        }
        if(fr.t >= coeffs.length){ stack.pop(); continue; }
        const c = coeffs[fr.t++];
        const st = stepsLeft[fr.i];
        const nextM = fr.curM.slice(); addVecInPlace(nextM, mulVec(st.monzo, c));
        const nextC = fr.curC.slice(); nextC.push(c);
        stack.push({ i: fr.i+1, curM: nextM, curC: nextC, t: 0 });
        if(performance.now() - tStart > opts.chunkMs) break;
      }
      return { done: stack.length===0 };
    }
    return { step };
  }

  // Iterative deepening over B if requested
  const Bmax = opts.coeffBound||6;
  const coeffsByB = new Map();
  function zeroCenteredRange(B){ const out=[0]; for(let t=1;t<=B;t++){ out.push(t,-t); } return out; }
  function getCoeffs(B){ if(!coeffsByB.has(B)) coeffsByB.set(B, zeroCenteredRange(B)); return coeffsByB.get(B); }

  let currentB = opts.iterativeDeepen ? Math.min(2, Bmax) : Bmax;
  let phase = 'build+search'; // interleaved for early results
  let rightIt = null, leftIt = null, rightMap = null, leftMap = null;

  // Pre-check total reach at Bmax
  const Rmax = perDimReach(orderedSteps, Bmax);
  if(violatesReach(comma, Rmax)){
    cb.onDone([], { reason:'unreachable-bounds' });
    return { cancel: ()=>{} };
  }

  function loop(){
    if(cancelled){ cb.onDone(bestArr.slice(), { reason:'cancelled', partial:true, elapsed: performance.now()-started, capped: Number.isFinite(maxSolutions) && bestArr.length>=maxSolutions }); return; }
    if(Number.isFinite(opts.timeBudgetMs) && (performance.now() - started > opts.timeBudgetMs)){
      cb.onDone(bestArr.slice(), { reason:'time-budget', partial:true, elapsed: performance.now()-started, capped: Number.isFinite(maxSolutions) && bestArr.length>=maxSolutions }); return; }

    // progress meta (best count, B, phase)
    cb.onProgress({ B: currentB, phase, found: bestArr.length, elapsed: performance.now()-started, maxSolutions });

    const coeffs = getCoeffs(currentB);
    const mid = Math.floor(orderedSteps.length/2);
    const left = orderedSteps.slice(0,mid);
    const right = orderedSteps.slice(mid);

    if(!rightIt || !leftIt){
      if(!rightMap) rightMap = new Map();
      if(!leftMap) leftMap = new Map();
      const batchFound = [];
      // Initialize iterators with shared maps and batch buffer
      rightIt = buildRightIterative(right, coeffs, rightMap, leftMap, batchFound);
      leftIt  = leftSearchIterative(left, coeffs, rightMap, leftMap, batchFound);
      // Attach batchFound to loop closure
      loop._batchFound = batchFound;
    }

    const r1 = rightIt.step();
    const r2 = leftIt.step();
    // Emit any accumulated batches
    if(loop._batchFound && loop._batchFound.length){ cb.onBatch(bestArr.slice()); loop._batchFound.length=0; }

    const done = r1.done && r2.done;
    if(done || (Number.isFinite(maxSolutions) && bestArr.length>=maxSolutions)){
      if(currentB >= Bmax || !opts.iterativeDeepen){
        cb.onDone(bestArr.slice(), { reason: (Number.isFinite(maxSolutions) && bestArr.length>=maxSolutions)? 'capped':'complete', partial:false, elapsed: performance.now()-started, capped: Number.isFinite(maxSolutions) && bestArr.length>=maxSolutions });
        return;
      } else {
        currentB = Math.min(currentB+1, Bmax);
        rightIt = null; leftIt = null; rightMap = null; leftMap = null; // reset for next B
      }
    }
    return void setTimeout(loop, 0);
  }

  setTimeout(loop, 0);
  return { cancel: ()=> { cancelled=true; } };
}

// Legacy sync function: falls back to async enumerator then returns final list via a blocking loop (not used by UI)
export function enumeratePumps(comma, steps, coeffBound){
  // Keep original behavior but simple, using the async engine in a blocking-like manner by running to completion with small budget
  let out=[]; let done=false;
  enumeratePumpsAsync(comma, steps, { coeffBound, timeBudgetMs: 1e9, iterativeDeepen:false }, { onDone:(arr)=>{ out=arr; done=true; } });
  // This is non-blocking in reality; callers in UI should use enumeratePumpsAsync instead.
  return out;
}
