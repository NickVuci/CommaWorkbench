export function parsePrimeInput(text){
  const t = String(text).trim();
  if(!t) return [2,3,5];
  if(t.indexOf(',')>=0){
    const parts = t.split(',').map(s=> Number(s.trim())).filter(x=> x>1 && isFinite(x));
    const uniq = [];
    parts.forEach(p=> { if(uniq.indexOf(p)<0) uniq.push(p); });
    uniq.sort((a,b)=> a-b);
    return uniq;
  } else {
    const P = Number(t);
    if (!isFinite(P) || P<2) return [2,3,5];
    const base = [2,3,5,7,11,13,17,19,23,29,31];
    const out = [];
    for(let i=0;i<base.length;i++){ if(base[i] <= P) out.push(base[i]); }
    if(out.length===0) return [2];
    return out;
  }
}
