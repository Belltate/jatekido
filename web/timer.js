/**
 * Az időzítő teljes logikája tiszta függvényekben: se DOM, se valós idő. Az aktuális időt
 * (ezredmásodpercben) mindig a hívó adja át, ezért minden determinisztikusan tesztelhető.
 */

/** Soronként egy név; az üres sorokat és a szélső szóközöket eldobja. */
export function parseNames(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Óra, perc, másodperc (szám vagy szöveg) → ezredmásodperc. Üres, hibás vagy negatív mező = 0. */
export function toMs({ h = 0, m = 0, s = 0 }) {
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  return Math.round((n(h) * 3600 + n(m) * 60 + n(s)) * 1000);
}

/**
 * A beállítások ellenőrzése. Siker: { ok: true, config: { names, totalMs, turnMs } },
 * hiba: { ok: false, error }, a felhasználónak szóló magyar üzenettel.
 */
export function buildConfig({ namesText, total, turn }) {
  const names = parseNames(namesText);
  if (names.length === 0) return { ok: false, error: 'Adj meg legalább egy nevet.' };
  const totalMs = toMs(total);
  if (totalMs <= 0) return { ok: false, error: 'A teljes idő legyen több nullánál.' };
  const turnMs = toMs(turn);
  if (turnMs <= 0) return { ok: false, error: 'A váltási idő legyen több nullánál.' };
  return { ok: true, config: { names, totalMs, turnMs } };
}

/**
 * A menet állapota `ms` eltelt idő után: ki van soron, és mennyi van hátra a köréből
 * meg a teljes időből. Az utolsó kör a teljes idő végénél elvágódik.
 */
export function snapshot(config, ms) {
  const { names, totalMs, turnMs } = config;
  const elapsed = Math.min(Math.max(ms, 0), totalMs);
  const finished = elapsed >= totalMs;
  const turnIndex = Math.floor((finished ? totalMs - 1 : elapsed) / turnMs);
  const turnEnd = Math.min((turnIndex + 1) * turnMs, totalMs);
  return {
    finished,
    totalRemainingMs: totalMs - elapsed,
    turnIndex,
    name: names[turnIndex % names.length],
    turnRemainingMs: turnEnd - elapsed,
  };
}

/** Új menet, ami `now`-kor indul. `turn`: az utolsó elindított kör sorszáma; `handover`: átadásra vár. */
export function startSession(config, now) {
  return { config, startedAt: now, pausedAt: null, pausedMs: 0, turn: 0, handover: false };
}

/** Az indulás óta eltelt idő a szünetek nélkül; szünetben nem nő. */
export function elapsedMs(session, now) {
  const until = session.pausedAt ?? now;
  return until - session.startedAt - session.pausedMs;
}

export function isPaused(session) {
  return session.pausedAt !== null;
}

export function pauseSession(session, now) {
  return isPaused(session) ? session : { ...session, pausedAt: now };
}

export function resumeSession(session, now) {
  if (!isPaused(session)) return session;
  return { ...session, pausedAt: null, pausedMs: session.pausedMs + (now - session.pausedAt), handover: false };
}

export function isHandover(session) {
  return session.handover;
}

/**
 * Ha futás közben letelt a soron lévő kör, és van még a teljes időből, a menet pontosan a kör határán
 * megáll, és átadásra vár: a következő ember ideje csak kattintásra (resumeSession) indul.
 * Ha közben több kör is eltelt volna (pl. lezárt telefon), akkor is az első határon áll meg.
 */
export function stopAtTurnEnd(session, now) {
  if (isPaused(session)) return session;
  const boundary = (session.turn + 1) * session.config.turnMs;
  const elapsed = elapsedMs(session, now);
  if (boundary >= session.config.totalMs || elapsed < boundary) return session;
  return { ...session, pausedAt: now - (elapsed - boundary), handover: true, turn: session.turn + 1 };
}

/**
 * Kell-e hang két egymás utáni kirajzolás között: 'end' (letelt a teljes idő), 'turn' (új név jött)
 * vagy null. Ha közben több kör is eltelt (pl. le volt zárva a telefon), csak egyszer szól.
 */
export function soundBetween(prev, next) {
  if (next.finished) return prev.finished ? null : 'end';
  return next.turnIndex !== prev.turnIndex ? 'turn' : null;
}
