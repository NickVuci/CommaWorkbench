const DEFAULT_NOTE_DURATION = 0.6;
const DEFAULT_RELEASE = 0.08;
const LOOP_PADDING = 0.15; // seconds

let audioCtx = null;
let currentPlayback = null;

function ensureContext(){
  if(typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  if(audioCtx) return audioCtx;
  audioCtx = new window.AudioContext();
  return audioCtx;
}

function computeFreq(baseHz, cents){
  return baseHz * Math.pow(2, cents / 1200);
}

function scheduleTone(ctx, freq, startTime, duration, release){
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.connect(gain);
  const attack = Math.min(0.04, duration * 0.2);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.18, startTime + attack);
  gain.gain.setTargetAtTime(0, startTime + duration, release);
  osc.start(startTime);
  const stopTime = startTime + duration + release * 4;
  osc.stop(stopTime);
  return { osc, gain, startTime, stopTime };
}

function schedulePumpPlayback(walk, options){
  const ctx = ensureContext();
  if(!ctx || !walk || !Array.isArray(walk.points) || walk.points.length===0){
    return { stop: ()=>{} };
  }
  stopCurrentPlayback();
  const opts = Object.assign({
    loop: false,
    noteDuration: DEFAULT_NOTE_DURATION,
    release: DEFAULT_RELEASE,
    mode: 'ji',
    onComplete: null
  }, options||{});
  const baseHz = (walk.summary && walk.summary.basePitchHz) || 440;
  const schedule = [];
  const callbackTimers = [];
  function queueCallback(fn, fireTime, payload){
    if(typeof fn !== 'function') return;
    const delayMs = Math.max(0, (fireTime - ctx.currentTime) * 1000);
    const timerId = setTimeout(()=>fn(payload), delayMs);
    callbackTimers.push(timerId);
  }
  let startTime = ctx.currentTime + 0.05;
  ctx.resume && ctx.resume().catch(()=>{});
  // Reference pitch first
  let sparklineCursor = 0;
  const refEntry = scheduleTone(ctx, baseHz, startTime, opts.noteDuration, opts.release);
  refEntry.meta = { sparklineIndex: sparklineCursor, walkIndex: -1 };
  schedule.push(refEntry);
  startTime += opts.noteDuration;
  const totalPoints = walk.points.length;
  for(let i=0;i<totalPoints;i++){
    const pt = walk.points[i];
    const cents = opts.mode==='edo' && pt.cumulativeEDO!=null ? pt.cumulativeEDO : pt.cumulativeJI;
    if(!Number.isFinite(cents)) continue;
    const freq = computeFreq(baseHz, cents);
    const entry = scheduleTone(ctx, freq, startTime, opts.noteDuration, opts.release);
    sparklineCursor = i+1;
    entry.meta = { sparklineIndex: sparklineCursor, walkIndex: i };
    schedule.push(entry);
    startTime += opts.noteDuration;
  }
  if(schedule.length){
    const finalStop = schedule[schedule.length-1].stopTime;
    queueCallback(()=>{
      if(currentPlayback !== playback) return;
      stopCurrentPlayback();
      if(typeof opts.onComplete === 'function'){
        opts.onComplete();
      }
    }, finalStop, null);
  }
  const playback = {
    ctx,
    schedule,
    loop: !!opts.loop,
    mode: opts.mode,
    duration: schedule.length * opts.noteDuration,
    release: opts.release,
    walk,
    options: opts,
    loopTimer: null,
    stop: ()=> stopCurrentPlayback(),
    callbackTimers
  };
  currentPlayback = playback;
  if(playback.loop){
    const lastStop = schedule.length ? schedule[schedule.length-1].stopTime : ctx.currentTime;
    const loopDelay = Math.max(lastStop - ctx.currentTime, 0) + Math.max(opts.release * 4, 0.05) + LOOP_PADDING;
    playback.loopTimer = setTimeout(()=>{
      if(currentPlayback !== playback) return;
      stopCurrentPlayback();
      schedulePumpPlayback(walk, options);
    }, Math.max(loopDelay, 0.1) * 1000);
  }
  return playback;
}

function stopCurrentPlayback(){
  if(!currentPlayback) return;
  if(currentPlayback.loopTimer){
    clearTimeout(currentPlayback.loopTimer);
  }
  if(Array.isArray(currentPlayback.callbackTimers)){
    currentPlayback.callbackTimers.forEach(id=> clearTimeout(id));
  }
  currentPlayback.schedule.forEach(entry=>{
    try{ entry.osc.stop(); }catch(e){}
    try{ entry.osc.disconnect(); }catch(e){}
    try{ entry.gain.disconnect(); }catch(e){}
  });
  currentPlayback = null;
}

export function playPump(walk, options){
  return schedulePumpPlayback(walk, options);
}

export function stopPump(){
  stopCurrentPlayback();
}

export function getPlaybackState(){
  return currentPlayback;
}
