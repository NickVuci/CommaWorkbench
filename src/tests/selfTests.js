// DOM-agnostic self tests; returns an array of { name, ok, notes }
export function runSelfTests(deps){
  const { parsePrimeInput, centsFromMonzo, edosTemperingComma, generateIntervalsForVocabulary, canonicalizePumps } = deps;
  const results=[];
  // Test 1
  const pA=parsePrimeInput('5'); const passA = pA.length===3 && pA[0]===2 && pA[1]===3 && pA[2]===5; results.push({ name:'parsePrimeInput("5") → 2,3,5', ok:passA, notes:'out='+pA.join(',') });
  // Test 2
  const pB=parsePrimeInput('2,5,7'); const passB = pB.length===3 && pB[0]===2 && pB[1]===5 && pB[2]===7; results.push({ name:'parsePrimeInput("2,5,7") sorted', ok:passB, notes:'out='+pB.join(',') });
  // Test 3
  const cval = Math.abs(centsFromMonzo([-4,4,-1],[2,3,5])); results.push({ name:'cents(81/80) ≈ 21.5¢', ok:Math.abs(cval-21.506)<=0.25, notes:'cents='+cval.toFixed(3) });
  // Test 4
  const edos = edosTemperingComma([-4,4,-1],[2,3,5],5,72); const has12=edos.indexOf(12)>=0; const has19=edos.indexOf(19)>=0; results.push({ name:'EDOs killing 81/80 include 12 & 19', ok:has12 && has19, notes:'found='+edos.slice(0,10).join(',')+'…' });
  // Test 5
  const vocab = generateIntervalsForVocabulary([2,3,5],5,100);
  const names = new Set(vocab.map(v=> v.name.split(' ')[0]));
  const expected = ['6/5','5/4','4/3','3/2','8/5','5/3'];
  const missing = expected.filter(x=> !names.has(x));
  const extras = Array.from(names).filter(x=> expected.indexOf(x)<0);
  results.push({ name:'5-limit odd≤5 upward within octave', ok:missing.length===0 && extras.length===0, notes:'missing=['+missing.join(',')+'] extras=['+extras.join(',')+'] count='+String(vocab.length) });

  // First page should include all six when maxCount=6
  const page = generateIntervalsForVocabulary([2,3,5],5,6);
  const pageNames = new Set(page.map(v=> v.name.split(' ')[0]));
  const missPage = expected.filter(x=> !pageNames.has(x));
  results.push({ name:'First page includes all six (5-limit, odd≤5, maxCount=6)', ok:missPage.length===0, notes:'missingOnPage=['+missPage.join(',')+']' });

  // Canonicalization tests
  try{
    // Trivial kernel: if steps are linearly independent (e.g., distinct monzos in 2D), kernel is zero; pumps unchanged
    const stepsTrivial = [
      { name:'a', monzo:[1,0] },
      { name:'b', monzo:[0,1] }
    ];
    const pumpsA = [ [1,0], [0,1], [2,-1] ];
    const outA = canonicalizePumps ? canonicalizePumps(pumpsA, stepsTrivial) : pumpsA;
    const okA = outA.length===3;
    results.push({ name:'Canonicalization trivial kernel leaves pumps', ok:okA, notes:'count='+String(outA.length) });
  }catch(e){ results.push({ name:'Canonicalization trivial kernel leaves pumps', ok:false, notes:'err '+String(e) }); }

  try{
    // Nontrivial kernel: if one step equals sum of others, kernel non-zero
    // Construct steps where s3 = s1 + s2 (in monzo space), so x and x+[1,1,-1] are equivalent
    const stepsNT = [
      { name:'a', monzo:[1,0] },
      { name:'b', monzo:[0,1] },
      { name:'c', monzo:[1,1] }
    ];
    const pumpsB = [ [1,0,0], [0,1,0], [0,0,1], [1,1,-1] ];
    const outB = canonicalizePumps ? canonicalizePumps(pumpsB, stepsNT) : pumpsB;
    const okB = outB.length < pumpsB.length; // dedup happened
    results.push({ name:'Canonicalization dedupes equivalent pumps', ok:okB, notes:'before='+pumpsB.length+' after='+outB.length });
  }catch(e){ results.push({ name:'Canonicalization dedupes equivalent pumps', ok:false, notes:'err '+String(e) }); }

  // Performance test for generateIntervalsForVocabulary
  try {
    const start = performance.now();
    // Use a high oddLimit to make the performance difference noticeable
    generateIntervalsForVocabulary([2,3,5,7], 99, 400);
    const duration = performance.now() - start;
    // This threshold should be low enough to fail the old implementation
    // but high enough to pass the new one reliably.
    const thresholdMs = 100;
    const okPerf = duration < thresholdMs;
    results.push({
      name: 'generateIntervalsForVocabulary performance (oddLimit=99)',
      ok: okPerf,
      notes: 'duration=' + duration.toFixed(1) + 'ms (threshold < ' + thresholdMs + 'ms)'
    });
  } catch(e) {
    results.push({
      name: 'generateIntervalsForVocabulary performance',
      ok: false,
      notes: 'err ' + String(e)
    });
  }
  return results;
}
