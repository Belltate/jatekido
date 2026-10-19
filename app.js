// A felület: beállítás → futás → vége. Minden időadat a timer.js tiszta függvényeiből jön;
// itt csak a kirajzolás és a gombok vannak.
import { formatClock } from './format.js';
import { buildConfig, elapsedMs, snapshot, startSession } from './timer.js';

const $ = (id) => document.getElementById(id);
const screens = { setup: $('setup'), run: $('run'), done: $('done') };

let session = null;
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
  const snap = snapshot(session.config, elapsedMs(session, Date.now()));
  $('total-time').textContent = formatClock(snap.totalRemainingMs);
  $('current-name').textContent = snap.name;
  $('turn-time').textContent = formatClock(snap.turnRemainingMs);
  if (snap.finished) end('done');
}

function askStop(ask) {
  $('controls').hidden = ask;
  $('stop-confirm').hidden = !ask;
}

function start(event) {
  event.preventDefault();
  const result = buildConfig(readForm());
  $('error').textContent = result.ok ? '' : result.error;
  $('error').hidden = result.ok;
  if (!result.ok) return;
  session = startSession(result.config, Date.now());
  askStop(false);
  show('run');
  render();
  ticker = setInterval(render, 200);
}

function end(screen) {
  clearInterval(ticker);
  ticker = null;
  session = null;
  show(screen);
}

$('setup-form').addEventListener('submit', start);
$('stop').addEventListener('click', () => askStop(true));
$('stop-no').addEventListener('click', () => askStop(false));
$('stop-yes').addEventListener('click', () => end('setup'));
$('again').addEventListener('click', () => show('setup'));
// háttérből visszatérve azonnal frissüljön (telefonon a böngésző közben megállíthatta az időzítőt)
document.addEventListener('visibilitychange', () => {
  if (session && document.visibilityState === 'visible') render();
});
