import { gcd, LN2 } from '../core/number.js';

export function factorToMonzo(num, den, primes){
  const exps = new Array(primes.length).fill(0);
  let n=num, d=den;
  for(let i=0;i<primes.length;i++){
    const p=primes[i];
    while(n%p===0){ n/=p; exps[i]++; }
    while(d%p===0){ d/=p; exps[i]--; }
  }
  if(n!==1 || d!==1) return null;
  return exps;
}
export function reduceOdd(n){ while(n%2===0) n/=2; return n; }
export function oddLimitOK(num, den, maxOdd){ return Math.max(reduceOdd(num), reduceOdd(den)) <= maxOdd; }
export function generateIntervalsForVocabulary(primes, oddLimit, maxCount){
  const items=[]; const seen=new Set();
  const maxNumDen = oddLimit;
  for(let num=1; num<=maxNumDen; num++){
    for(let den=1; den<=maxNumDen; den++){
      if(gcd(num,den)!==1) continue;
      if(num===den) continue;
      if(!oddLimitOK(num,den,oddLimit)) continue;
      const monzo = factorToMonzo(num,den,primes); if(!monzo) continue;
      const ratio = num/den; if(ratio<=0.5 || ratio>=2) continue;
      const key = monzo.join(','); if(seen.has(key)) continue; seen.add(key);
      let cents = 1200*Math.log(ratio)/LN2; if(cents<0) cents = -cents; if(Math.abs(cents)<1e-9) continue;
      items.push({ name:String(num)+'/'+String(den)+' ('+String(cents.toFixed(2))+'¢)', monzo:monzo, cents:Math.abs(cents) });
    }
  }
  items.sort((a,b)=> (a.cents-b.cents) || ((a.monzo.reduce((s,x)=>s+Math.abs(x),0)) - (b.monzo.reduce((s,x)=>s+Math.abs(x),0))));
  if(items.length>maxCount) return items.slice(0,maxCount);
  return items;
}
