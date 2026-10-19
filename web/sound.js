/**
 * Hangjelzések Web Audióval, hangfájl nélkül. A böngészők csak felhasználói művelet
 * (kattintás) után engedik megszólalni a hangot, ezért az Indítás gombnál hívjuk az unlockAudio()-t.
 */
let ctx = null;

export function unlockAudio() {
  // iPhone: a némító kapcsoló ne némítsa el a jelzést (Safari 16.4+)
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq, startIn, duration) {
  const t = ctx.currentTime + startIn;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Új név jön: két rövid, emelkedő sípszó, kétszer. */
export function playTurnSound() {
  if (!ctx) return;
  for (const at of [0, 0.6]) {
    tone(660, at, 0.18);
    tone(880, at + 0.22, 0.25);
  }
}

/** Letelt az idő: ereszkedő hármas hang, háromszor. */
export function playEndSound() {
  if (!ctx) return;
  for (const at of [0, 1.2, 2.4]) {
    tone(880, at, 0.3);
    tone(698, at + 0.35, 0.3);
    tone(523, at + 0.7, 0.45);
  }
}
