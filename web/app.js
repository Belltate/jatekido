// A felület: beállítás → futás → vége. Minden időadat a timer.js tiszta függvényeiből jön;
// itt csak a kirajzolás, a hangok és a gombok vannak.
import { formatClock } from './format.js';
import { playEndSound, playTurnSound, unlockAudio } from './sound.js';
import {
  buildConfig,
  elapsedMs,
  isHandover,
  isPaused,
  pauseSession,
  resumeSession,
  snapshot,
  soundBetween,
  startSession,
  stopAtTurnEnd,
} from './timer.js';
import { keepAwake } from './wakelock.js';

const $ = (id) => document.getElementById(id);
const screens = { setup: $('setup'), run: $('run'), done: $('done') };

let session = null;
let last = null; // az előző kirajzolt állapot: ehhez képest dől el, kell-e hang
let ticker = null;

function show(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
}

function readForm() {
  const v = (id) => $(id).value;
  return {
    namesText: v('names'),
    total: { h: v('total-h'), m: v('total-m'), s: v('total-s') },
    turn: { h: v('turn-h'), m: v('turn-m'), s: v('turn-s') },
  };
}

function render() {
  const now = Date.now();
  const wasWaiting = isHandover(session);
  session = stopAtTurnEnd(session, now);
  const snap = snapshot(session.config, elapsedMs(session, now));
  const sound = last ? soundBetween(last, snap) : null;
  if (sound === 'turn') playTurnSound();
  if (sound === 'end') playEndSound();
  last = snap;
  $('total-time').textContent = formatClock(snap.totalRemainingMs);
  $('current-name').textContent = snap.name;
  $('turn-time').textContent = formatClock(snap.turnRemainingMs);
  $('handover').hidden = !isHandover(session);
  // most jelent meg: kapja meg a fókuszt, hogy gépen Enterrel vagy szóközzel is indítható legyen
  if (isHandover(session) && !wasWaiting) $('handover').focus();
  if (snap.finished) end('done');
}

/** A fátylon kattintás: indul a következő ember köre. */
function startNextTurn() {
  session = resumeSession(session, Date.now());
  render();
}

function askStop(ask) {
  $('controls').hidden = ask;
  $('stop-confirm').hidden = !ask;
}

function setPausedUi(paused) {
  $('pause').textContent = paused ? 'Folytatás' : 'Szünet';
  $('paused-label').hidden = !paused;
  screens.run.classList.toggle('is-paused', paused);
}

function start(event) {
  event.preventDefault();
  const result = buildConfig(readForm());
  $('error').textContent = result.ok ? '' : result.error;
  $('error').hidden = result.ok;
  if (!result.ok) return;
  unlockAudio(); // a kattintáson belül kell, különben a böngésző nem engedi a hangot
  keepAwake(true);
  session = startSession(result.config, Date.now());
  last = null;
  setPausedUi(false);
  askStop(false);
  show('run');
  render();
  ticker = setInterval(render, 200);
}

function togglePause() {
  const now = Date.now();
  session = isPaused(session) ? resumeSession(session, now) : pauseSession(session, now);
  setPausedUi(isPaused(session));
  render();
}

function end(screen) {
  clearInterval(ticker);
  ticker = null;
  session = null;
  keepAwake(false);
  show(screen);
}

$('setup-form').addEventListener('submit', start);
$('pause').addEventListener('click', togglePause);
$('handover').addEventListener('click', startNextTurn);
$('stop').addEventListener('click', () => askStop(true));
$('stop-no').addEventListener('click', () => askStop(false));
$('stop-yes').addEventListener('click', () => end('setup'));
$('again').addEventListener('click', () => show('setup'));
// háttérből visszatérve azonnal frissüljön (telefonon a böngésző közben megállíthatta az időzítőt)
document.addEventListener('visibilitychange', () => {
  if (session && document.visibilityState === 'visible') render();
});

// Böngészőben (nem az asztali programban): offline működés és telepítési súgó.
const inDesktopApp = location.protocol === 'file:';
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
$('install-help').hidden = inDesktopApp || installed;
if (!inDesktopApp && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
