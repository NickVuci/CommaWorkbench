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
