// Simple primality test for small integers
function isPrime(n){
  if(n!==Math.floor(n)) return false;
  if(n<2) return false;
  if(n===2) return true;
  if(n%2===0) return false;
  const r=Math.floor(Math.sqrt(n));
  for(let d=3; d<=r; d+=2){ if(n%d===0) return false; }
  return true;
}

// Sieve of Eratosthenes to generate all primes ≤ N (N up to few thousands is fine)
function primesUpTo(N){
  N = Math.floor(N);
  if(!(N>=2)) return [];
  const sieve = new Array(N+1).fill(true);
  sieve[0]=sieve[1]=false;
  const r=Math.floor(Math.sqrt(N));
  for(let p=2;p<=r;p++) if(sieve[p]){
    for(let m=p*p; m<=N; m+=p) sieve[m]=false;
  }
  const out=[]; for(let i=2;i<=N;i++) if(sieve[i]) out.push(i);
  return out;
}

export function parsePrimeInput(text){
  const t = String(text).trim();
  if(!t) return [2,3,5];
  if(t.indexOf(',')>=0){
    // Subgroup: keep only prime, unique, sorted
    const parts = t.split(',').map(s=> Number(s.trim())).filter(x=> isFinite(x));
    const filtered = [];
    for(const x of parts){ if(isPrime(x) && filtered.indexOf(x)<0) filtered.push(x); }
    filtered.sort((a,b)=> a-b);
    return filtered.length? filtered : [2,3,5];
  } else {
    // Prime limit: generate all primes ≤ P
    const P = Number(t);
    if (!isFinite(P) || P<2) return [2,3,5];
    const out = primesUpTo(P);
    return out.length? out : [2];
  }
}
