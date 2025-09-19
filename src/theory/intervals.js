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
export function generateIntervalsForVocabulary(primes, oddLimit, maxCount, includeUnison=false){
  const items=[]; const seen=new Set();
  // Iterate only over odd parts up to oddLimit; reintroduce powers of two to normalize into [1,2)
  for(let oddNum=1; oddNum<=oddLimit; oddNum+=1){ if(oddNum%2===0) continue; // odd only
    for(let oddDen=1; oddDen<=oddLimit; oddDen+=1){ if(oddDen%2===0) continue; // odd only
      if(gcd(oddNum, oddDen)!==1) continue;
      // Base ratio using odd parts
      const ratio0 = oddNum/oddDen;
      // Normalize by powers of two into [1,2)
      const t = Math.ceil(-Math.log2(ratio0)); // integer shift so ratio in (1,2]
      const ratio = ratio0 * Math.pow(2, t);
      if(!includeUnison && Math.abs(ratio-1) < 1e-12) continue; // skip unison unless requested
      if(!(ratio>1 && ratio<2)) continue; // only n>d and within one octave
      // Construct integer numerator/denominator from odd parts and power-of-two shift t
      const a = t>=0 ? t : 0; // power of two on numerator
      const b = t<0 ? -t : 0; // power of two on denominator
      const num = oddNum << a; // oddNum * 2^a
      const den = oddDen << b; // oddDen * 2^b
      // Enforce odd-limit on reduced odd parts (already satisfied by construction) and allowed primes
      const monzo = factorToMonzo(num, den, primes); if(!monzo) continue;
      const key = monzo.join(','); if(seen.has(key)) continue; seen.add(key);
      let cents = 1200*Math.log(ratio)/LN2; if(cents<0) cents = -cents; if(Math.abs(cents)<1e-9) continue;
      items.push({ name:String(num)+'/'+String(den)+' ('+String(cents.toFixed(2))+'¢)', monzo:monzo, cents:Math.abs(cents) });
    }
  }
  items.sort((a,b)=> (a.cents-b.cents) || ((a.monzo.reduce((s,x)=>s+Math.abs(x),0)) - (b.monzo.reduce((s,x)=>s+Math.abs(x),0))));
  return maxCount && items.length>maxCount ? items.slice(0,maxCount) : items;
}
