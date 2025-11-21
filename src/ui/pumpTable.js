import { l1 } from '../core/number.js';
import { applySteps } from '../core/monzo.js';
import { clear } from './dom.js';
import { integerNullspace } from '../theory/linear.js';

const _kernelCache = new Map();
function stepsKey(steps){
  try{ return steps.map(s=> (s.monzo||[]).join(',')).join('|'); }catch(e){ return String(steps.length); }
}

// Canonicalize pumps using the integer kernel of the step matrix.
// Strategy: compute kernel K (columns as basis vectors). For each pump x, reduce by
// moving along integer combinations of K's basis to minimize L1, using a greedy coordinate descent.
// Tie-breaker: prefer smaller vector lexicographically.
export function canonicalizePumps(pumps, steps){
  if(!Array.isArray(pumps) || pumps.length===0) return pumps;
  if(!steps || steps.length===0) return pumps;
  const k = steps.length;
  const d = steps[0].monzo ? steps[0].monzo.length : 0;
  if(d===0) return pumps;
  // Build S as (d x k)
  const S = Array.from({length:d}, (_,i)=> steps.map(s=> s.monzo[i]||0));
  const key = stepsKey(steps);
  let K = _kernelCache.get(key);
  if(!K){
    K = integerNullspace(S); // basis vectors in Z^k spanning kernel
    _kernelCache.set(key, K);
  }
  if(!K || K.length===0){
    // No kernel: still enforce uniqueness by image (trivial here) & remove all-zero pumps
    const uniq=[]; const seenImg=new Set();
    for(const p of pumps){ if(p.every(z=> z===0)) continue; const img=applySteps(steps,p).join(','); if(!seenImg.has(img)){ seenImg.add(img); uniq.push(p.slice()); } }
    return uniq;
  }

  function l1Of(v){ return l1(v); }
  function vecLexCompare(a,b){ for(let i=0;i<a.length;i++){ const da=Math.abs(a[i]); const db=Math.abs(b[i]); if(da!==db) return da-db; if(a[i]!==b[i]) return a[i]-b[i]; } return 0; }
  function addScaled(v, dir, t){ const out=v.slice(); for(let i=0;i<v.length;i++) out[i]+= t*dir[i]; return out; }
  function bestAlong(v, dir){
    // Choose integer t minimizing L1(v + t*dir)
    const ratios=[]; for(let i=0;i<v.length;i++){ const di=dir[i]; if(di!==0){ ratios.push(-v[i]/di); } }
    if(ratios.length===0) return v;
    ratios.sort((a,b)=>a-b);
    const mid = ratios[Math.floor(ratios.length/2)] || 0;
    const t0 = Math.round(mid);
    let best=v, bestL=l1Of(v);
    // Probe local neighborhood (search window widened slightly for robustness)
    for(let dt=-3; dt<=3; dt++){
      const t=t0+dt; if(!Number.isFinite(t)) continue; const cand=addScaled(v,dir,t); const L=l1Of(cand);
      if(L<bestL || (L===bestL && vecLexCompare(cand,best)<0)){ best=cand; bestL=L; }
    }
    return best;
  }
  function reduceOnce(v){ let cur=v.slice(); for(const dir of K){ cur=bestAlong(cur,dir); } return cur; }
  function reduceFull(v){
    // Iterate until no improvement. Remove arbitrary cap; safeguard with max based on growth in k.
    let prev=v.slice(); let cur=reduceOnce(prev); let iter=1; const maxIter=64 + 4*K.length; // generous safety
    while((l1Of(cur)<l1Of(prev) || vecLexCompare(cur,prev)<0) && iter<maxIter){ prev=cur; cur=reduceOnce(cur); iter++; }
    return cur;
  }

  // Track best representative per image monzo (S*x). This guarantees full deduplication of equivalent pumps
  const byImage = new Map();
  for(const p of pumps){
    const can = reduceFull(p);
    if(can.every(z=> z===0)) continue; // pure kernel element
    const img = applySteps(steps, can); // monzo image
    const imgKey = img.join(',');
    const existing = byImage.get(imgKey);
    if(!existing){
      byImage.set(imgKey, can);
    }else{
      const curL = l1Of(can), exL = l1Of(existing);
      if(curL < exL || (curL===exL && vecLexCompare(can,existing)<0)) byImage.set(imgKey, can);
    }
  }
  const out = Array.from(byImage.values());
  out.sort((a,b)=>{ const da=l1Of(a), db=l1Of(b); if(da!==db) return da-db; return vecLexCompare(a,b); });
  return out;
}

export function renderPumpTable(tbodyEl, steps, pumps, comma){
  clear(tbodyEl);
  for(let i=0;i<pumps.length;i++){
    const x=pumps[i]; const L=l1(x);
    const parts=[]; for(let j=0;j<x.length;j++){ const k=x[j]; if(!k) continue; parts.push((k>=0? '+'+String(k):String(k))+'·'+steps[j].name); }
    const tr=document.createElement('tr');
    tr.dataset.pumpIndex = String(i);
    tr.classList.add('table-row-selectable');
    const b=document.createElement('td'); b.className='mono'; b.textContent=parts.join('  +  ')||'all zeros';
    const c1=document.createElement('td'); c1.textContent=String(L);
    tr.appendChild(b); tr.appendChild(c1); tbodyEl.appendChild(tr);
  }
}

// Compute simple equivalences "a=b" where step_i and step_j differ by the comma monzo
export function findStepEquivalences(steps, comma){
  const n = steps.length; if(n<2) return [];
  const eq = [];
  const keyOf = (mz)=> mz.join(',');
  const keyMinus = (mz)=> mz.map((v,i)=> v - (comma[i]||0));
  const keyPlus  = (mz)=> mz.map((v,i)=> v + (comma[i]||0));
  // Build lookup from monzo key to index
  const indexByKey = new Map();
  for(let i=0;i<n;i++){ indexByKey.set(keyOf(steps[i].monzo), i); }
  for(let i=0;i<n;i++){
    const si = steps[i].monzo;
    const kMinus = keyOf(keyMinus(si));
    const j1 = indexByKey.get(kMinus);
    if(j1!==undefined && j1>i){ eq.push(steps[i].name.split(' ')[0] + '=' + steps[j1].name.split(' ')[0]); }
    const kPlus = keyOf(keyPlus(si));
    const j2 = indexByKey.get(kPlus);
    if(j2!==undefined && j2>i){ eq.push(steps[j2].name.split(' ')[0] + '=' + steps[i].name.split(' ')[0]); }
  }
  return eq;
}

// Render simple equivalences using findStepEquivalences
export function renderPumpEquivalences(containerEl, steps, comma){
  if(!containerEl) return;
  containerEl.innerHTML='';
  const eq = findStepEquivalences(steps, comma);
  if(eq.length===0){ containerEl.style.display='none'; return; }
  containerEl.style.display='block';
  eq.slice(0,24).forEach(txt=>{
    const chip = document.createElement('span'); chip.className='chip'; chip.textContent = txt; containerEl.appendChild(chip);
  });
}
