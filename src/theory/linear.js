// Integer nullspace (right kernel) of an integer matrix S (n x k): all x with S*x=0
// We compute RREF over rationals and derive a rational basis, then scale to integers.

function igcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ const t=a%b; a=b; b=t; } return a||0; }
function ilcm(a,b){ if(a===0||b===0) return 0; return Math.abs(a/igcd(a,b)*b); }

class Frac{
  constructor(num, den=1){ if(den===0) throw new Error('zero den'); if(den<0){ num=-num; den=-den; } const g=igcd(num,den); this.n=num/g; this.d=den/g; }
  static from(x){ return x instanceof Frac? x : new Frac(x,1); }
  add(o){ o=Frac.from(o); return new Frac(this.n*o.d + o.n*this.d, this.d*o.d); }
  sub(o){ o=Frac.from(o); return new Frac(this.n*o.d - o.n*this.d, this.d*o.d); }
  mul(o){ o=Frac.from(o); return new Frac(this.n*o.n, this.d*o.d); }
  div(o){ o=Frac.from(o); return new Frac(this.n*o.d, this.d*o.n); }
  inv(){ return new Frac(this.d, this.n); }
  isZero(){ return this.n===0; }
  neg(){ return new Frac(-this.n, this.d); }
  eq(o){ o=Frac.from(o); return this.n===o.n && this.d===o.d; }
  toNumber(){ return this.n/this.d; }
}

function rref(matrix){
  // matrix: array of rows of Frac; returns { A, pivotCols }
  const A = matrix.map(row=> row.map(Frac.from));
  const n = A.length; if(n===0) return { A, pivotCols: [] };
  const m = A[0].length;
  let row=0; const pivotCols=[];
  for(let col=0; col<m && row<n; col++){
    // find pivot
    let piv = -1; for(let r=row; r<n; r++){ if(!A[r][col].isZero()){ piv=r; break; } }
    if(piv===-1) continue;
    // swap
    if(piv!==row){ const tmp=A[piv]; A[piv]=A[row]; A[row]=tmp; }
    // scale row to make pivot 1
    const s = A[row][col]; const inv = s.inv(); for(let c=col; c<m; c++){ A[row][c] = A[row][c].mul(inv); }
    // eliminate others
    for(let r=0; r<n; r++){
      if(r===row) continue;
      const factor = A[r][col]; if(factor.isZero()) continue;
      for(let c=col; c<m; c++){ A[r][c] = A[r][c].sub(factor.mul(A[row][c])); }
    }
    pivotCols.push(col); row++;
  }
  return { A, pivotCols };
}

export function integerNullspace(S){
  // S is n x k integers; returns array of integer vectors (length k) forming a basis of nullspace
  const n = S.length; const k = n? S[0].length : 0;
  if(k===0) return [];
  // Build fraction matrix
  const M = new Array(n); for(let i=0;i<n;i++){ const row=new Array(k); for(let j=0;j<k;j++){ row[j]=new Frac(S[i][j],1); } M[i]=row; }
  const { A, pivotCols } = rref(M);
  const isPivot = new Array(k).fill(false); for(let i=0;i<pivotCols.length;i++) isPivot[pivotCols[i]]=true;
  const freeCols=[]; for(let j=0;j<k;j++) if(!isPivot[j]) freeCols.push(j);
  if(freeCols.length===0) return [];
  // Map pivot columns to their row index in RREF
  const pivotRowByCol = new Map(); for(let r=0;r<A.length;r++){ for(let c=0;c<k;c++){ if(A[r][c] && A[r][c].eq(new Frac(1))){ pivotRowByCol.set(c,r); break; } } }
  const basis=[];
  for(const f of freeCols){
    const v = new Array(k).fill(new Frac(0,1));
    v[f] = new Frac(1,1);
    for(const pc of pivotCols){
      const r = pivotRowByCol.get(pc);
      const coeff = A[r][f] ? A[r][f].neg() : new Frac(0,1);
      v[pc] = coeff;
    }
    // scale to integers
    let l = 1; for(let j=0;j<k;j++){ l = ilcm(l, v[j].d); }
    const ints = v.map(q=> (q.n * (l/q.d))|0);
    // make primitive (divide by gcd)
    let g = 0; for(let j=0;j<k;j++){ g = igcd(g, ints[j]); }
    if(g>1) for(let j=0;j<k;j++) ints[j] = ints[j]/g;
    // avoid all-zero
    if(ints.some(z=> z!==0)) basis.push(ints);
  }
  return basis;
}
