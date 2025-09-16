// DOM-agnostic self tests; returns an array of { name, ok, notes }
export function runSelfTests(deps){
  const { parsePrimeInput, centsFromMonzo, edosTemperingComma, generateIntervalsForVocabulary } = deps;
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
  const vocab = generateIntervalsForVocabulary([2,3,5],9,200); let hasNineOverEight=false; for(let i=0;i<vocab.length;i++){ if(vocab[i].name.indexOf('9/8')===0){ hasNineOverEight=true; break; } }
  results.push({ name:'Auto-steps include 9/8 with 5-limit, odd≤9', ok:hasNineOverEight, notes:'count='+String(vocab.length) });
  return results;
}
