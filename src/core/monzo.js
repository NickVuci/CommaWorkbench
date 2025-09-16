import { LN2, gcd } from './number.js';

export function normalizePrimitiveMonzo(v){ const g=v.reduce((gg,x)=> gcd(gg,x),0); if(g===0) return v.slice(); const u=v.map(x=> x/g); let i=-1; for(let k=0;k<u.length;k++){ if(u[k]!==0){ i=k; break; } } if(i>=0 && u[i]<0) return u.map(x=> -x); return u; }
export function centsFromMonzo(mz, primes){ let s=0; for(let i=0;i<mz.length;i++){ s += mz[i] * Math.log(primes[i]) / LN2; } return 1200*s; }
export function applySteps(steps, coeff){ const n=steps[0].monzo.length; const out=new Array(n).fill(0); for(let j=0;j<steps.length;j++){ const c=coeff[j]; const s=steps[j].monzo; for(let i=0;i<n;i++) out[i]+=c*s[i]; } return out; }
