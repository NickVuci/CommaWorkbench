import { LN2 } from '../core/number.js';

export function edoVal(N,primes){ return primes.map(p=> Math.round(N * Math.log(p)/LN2)); }
export function edosTemperingComma(c,primes,Nmin,Nmax){ const list=[]; for(let N=Nmin;N<=Nmax;N++){ const v=edoVal(N,primes); let s=0; for(let i=0;i<c.length;i++) s+=v[i]*c[i]; if(s===0) list.push(N); } return list; }
