import { centsFromMonzo, normalizePrimitiveMonzo } from '../core/monzo.js';
import { range } from '../core/number.js';

export function enumerateNotableCommas(primes, expBound, maxCents){
  const n=primes.length; const out=[]; const seen=new Set();
  const exps=[]; for(let i=0;i<n;i++) exps.push(range(-expBound,expBound));
  function rec(i,cur){
    if(i===n){
      let allZero=true; for(let t=0;t<cur.length;t++){ if(cur[t]!==0){ allZero=false; break; } }
      if(allZero) return;
      const cents = Math.abs(centsFromMonzo(cur,primes)); if(cents>maxCents) return;
      const prim = normalizePrimitiveMonzo(cur); const key = prim.join(','); if(seen.has(key)) return; seen.add(key);
      out.push({ monzo:prim, cents:+cents.toFixed(3) }); return;
    }
    for(let j=0;j<exps[i].length;j++){ const e=exps[i][j]; const next=cur.slice(); next.push(e); rec(i+1,next); }
  }
  rec(0,[]);
  out.sort((a,b)=> (a.cents-b.cents) || ((a.monzo.reduce((s,x)=>s+Math.abs(x),0)) - (b.monzo.reduce((s,x)=>s+Math.abs(x),0))));
  return out;
}

// Async, chunked version with progress/cancel/batches
// options: { chunkMs=12, timeBudgetMs=2000 }
// callbacks: { onProgress(meta), onBatch(items), onDone(allItems, meta) }
export function enumerateNotableCommasAsync(primes, expBound, maxCents, options, callbacks){
  const opts = Object.assign({ chunkMs:12, timeBudgetMs:2000 }, options||{});
  const cb = Object.assign({ onProgress:()=>{}, onBatch:()=>{}, onDone:()=>{} }, callbacks||{});
  const n = primes.length; if(n===0){ cb.onDone([], { reason:'no-primes' }); return { cancel:()=>{} } }
  const domains = []; for(let i=0;i<n;i++) domains.push(range(-expBound,expBound));
  const totals = domains.map(d=> d.length);
  const totalStates = totals.reduce((p,x)=> p*x, 1) - 1; // minus all-zero
  const seen = new Set(); const out = [];
  let cancelled=false; const started = performance.now();

  // Stack-based enumeration of n-dimensional grid
  // Frame: { i, idx, cur }
  const stack = [{ i:0, idx:0, cur: [] }];
  let produced=0; const batch=[];

  function processLeaf(vec){
    // skip all-zero
    let allZero=true; for(let t=0;t<vec.length;t++){ if(vec[t]!==0){ allZero=false; break; } }
    if(allZero) return;
    const cents = Math.abs(centsFromMonzo(vec, primes)); if(cents>maxCents) return;
    const prim = normalizePrimitiveMonzo(vec); const key = prim.join(','); if(seen.has(key)) return; seen.add(key);
    const item = { monzo: prim, cents: +cents.toFixed(3) };
    out.push(item); batch.push(item);
  }

  function step(){
    const tStart = performance.now();
    while(stack.length && !cancelled){
      const fr = stack[stack.length-1];
      if(fr.i===n){ processLeaf(fr.cur); stack.pop(); continue; }
      const dom = domains[fr.i];
      if(fr.idx >= dom.length){ stack.pop(); continue; }
      const e = dom[fr.idx++];
      const nextCur = fr.cur.slice(); nextCur.push(e);
      stack.push({ i: fr.i+1, idx: 0, cur: nextCur });
      produced++;
      if(performance.now() - tStart > opts.chunkMs) break;
    }
    if(batch.length){ cb.onBatch(batch.slice()); batch.length=0; }
    const elapsed = performance.now() - started;
    const done = stack.length===0;
    cb.onProgress({ processed: produced, total: totalStates, percent: totalStates>0? Math.min(100, Math.round((produced/totalStates)*100)) : 100, elapsed });
    if(done || cancelled || elapsed > opts.timeBudgetMs){
      // Final sort for stability
      out.sort((a,b)=> (a.cents-b.cents) || ((a.monzo.reduce((s,x)=>s+Math.abs(x),0)) - (b.monzo.reduce((s,x)=>s+Math.abs(x),0))));
      cb.onDone(out.slice(), { partial: !done, reason: cancelled? 'cancelled' : (elapsed>opts.timeBudgetMs? 'time-budget':'complete'), elapsed });
      return;
    }
    setTimeout(step, 0);
  }

  setTimeout(step, 0);
  return { cancel: ()=> { cancelled=true; } };
}
