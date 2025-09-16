import { range, l1, vecEq } from '../core/number.js';
import { applySteps } from '../core/monzo.js';

export function enumeratePumps(comma, steps, coeffBound){
  const n=comma.length; const k=steps.length; if(k===0) return [];
  const mid=Math.floor(k/2); const left=steps.slice(0,mid); const right=steps.slice(mid);
  function addVec(a,b){ const r=a.slice(); for(let i=0;i<r.length;i++) r[i]+=b[i]; return r; }
  function mulVec(v,s){ return v.map(x=> x*s); }
  function subVec(a,b){ const r=a.slice(); for(let i=0;i<r.length;i++) r[i]-=b[i]; return r; }
  const coeffs=range(-coeffBound,coeffBound);
  const rightMap=new Map();
  (function buildRight(){
    const len=right.length; function rec(i,curM,curC){ if(i===len){ const key=curM.join(','); if(!rightMap.has(key)) rightMap.set(key,[]); rightMap.get(key).push(curC.slice()); return; }
      const st=right[i]; for(let t=0;t<coeffs.length;t++){ const c=coeffs[t]; const nm=addVec(curM,mulVec(st.monzo,c)); curC.push(c); rec(i+1,nm,curC); curC.pop(); } }
    rec(0,new Array(n).fill(0),[]);
  })();
  const sols=[]; (function leftSearch(){ const len=left.length; function rec(i,curM,curC){ if(i===len){ const need=subVec(comma,curM).join(','); const matches=rightMap.get(need); if(matches){ for(let u=0;u<matches.length;u++){ const rc=matches[u]; const coeff=curC.concat(rc); const chk=applySteps(steps,coeff); if(vecEq(chk,comma)) sols.push(coeff); } } return; } const st=left[i]; for(let t=0;t<coeffs.length;t++){ const c=coeffs[t]; const nm=addVec(curM,mulVec(st.monzo,c)); curC.push(c); rec(i+1,nm,curC); curC.pop(); } } rec(0,new Array(n).fill(0),[]); })();
  const uniq=new Map(); for(let i=0;i<sols.length;i++){ const key=sols[i].join(','); if(!uniq.has(key)) uniq.set(key,sols[i]); }
  const out=Array.from(uniq.values()); out.sort((a,b)=>{ const d=l1(a)-l1(b); if(d!==0) return d; for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return a[i]-b[i]; } return 0; }); return out;
}
