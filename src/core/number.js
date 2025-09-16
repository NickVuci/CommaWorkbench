export const LN2 = Math.log(2);
export function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=a%b; a=b; b=t; } return a||1; }
export function l1(v){ return v.reduce((s,x)=> s+Math.abs(x), 0); }
export function vecEq(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return false; } return true; }
export function range(a,b){ const arr=[]; for(let x=a;x<=b;x++) arr.push(x); return arr; }
