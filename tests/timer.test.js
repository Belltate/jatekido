import { describe, expect, it } from 'vitest';
import {
  buildConfig,
  elapsedMs,
  isHandover,
  isPaused,
  parseNames,
  pauseSession,
  resumeSession,
  snapshot,
  soundBetween,
  startSession,
  stopAtTurnEnd,
  toMs,
} from '../web/timer.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const cfg = (names, totalMs, turnMs) => ({ names, totalMs, turnMs });

describe('parseNames', () => {
  it('soronként egy nevet ad, az üres sorokat és a szélső szóközöket eldobja', () => {
    expect(parseNames('  Anna \n\nBence\r\n  \nCsaba')).toEqual(['Anna', 'Bence', 'Csaba']);
  });
  it('üres szövegből üres lista lesz', () => {
    expect(parseNames('   \n ')).toEqual([]);
  });
});

describe('toMs', () => {
  it('órát, percet és másodpercet ezredmásodpercre vált', () => {
    expect(toMs({ h: 3, m: 0, s: 0 })).toBe(3 * HOUR);
    expect(toMs({ h: 0, m: 20, s: 0 })).toBe(20 * MIN);
    expect(toMs({ h: 1, m: 2, s: 3 })).toBe(HOUR + 2 * MIN + 3000);
  });
  it('szöveges mezőket is elfogad, az üreset és a hibásat 0-nak veszi', () => {
    expect(toMs({ h: '', m: '20', s: 'abc' })).toBe(20 * MIN);
  });
  it('a negatív értéket 0-nak veszi', () => {
    expect(toMs({ h: -1, m: 5, s: 0 })).toBe(5 * MIN);
  });
});

describe('buildConfig', () => {
  const total = { h: 3, m: 0, s: 0 };
  const turn = { h: 0, m: 20, s: 0 };
  it('érvényes beállításból menetet készít', () => {
    expect(buildConfig({ namesText: 'Anna\nBence\nCsaba', total, turn })).toEqual({
      ok: true,
      config: { names: ['Anna', 'Bence', 'Csaba'], totalMs: 3 * HOUR, turnMs: 20 * MIN },
    });
  });
  it('név nélkül hibát ad', () => {
    expect(buildConfig({ namesText: ' \n ', total, turn })).toEqual({ ok: false, error: 'Adj meg legalább egy nevet.' });
  });
  it('nulla teljes időre hibát ad', () => {
    expect(buildConfig({ namesText: 'Anna', total: { h: 0, m: 0, s: 0 }, turn })).toEqual({
      ok: false,
      error: 'A teljes idő legyen több nullánál.',
    });
  });
  it('nulla váltási időre hibát ad', () => {
    expect(buildConfig({ namesText: 'Anna', total, turn: { h: 0, m: 0, s: 0 } })).toEqual({
      ok: false,
      error: 'A váltási idő legyen több nullánál.',
    });
  });
});

describe('snapshot – a kérés példája: 3 név, 3 óra, 20 perces váltás', () => {
  const c = cfg(['Anna', 'Bence', 'Csaba'], 3 * HOUR, 20 * MIN);
  it('induláskor az első név jön, teljes körrel', () => {
    expect(snapshot(c, 0)).toEqual({
      finished: false,
      totalRemainingMs: 3 * HOUR,
      turnIndex: 0,
      name: 'Anna',
      turnRemainingMs: 20 * MIN,
    });
  });
  it('20 perc után a második név jön, és a kör újraindul', () => {
    const s = snapshot(c, 20 * MIN);
    expect(s.name).toBe('Bence');
    expect(s.turnRemainingMs).toBe(20 * MIN);
    expect(s.totalRemainingMs).toBe(2 * HOUR + 40 * MIN);
  });
  it('a harmadik név után újra az első jön', () => {
    expect(snapshot(c, 60 * MIN).name).toBe('Anna');
    expect(snapshot(c, 80 * MIN).name).toBe('Bence');
  });
  it('a kör közben mindkét hátralévő idő csökken', () => {
    const s = snapshot(c, 25 * MIN);
    expect(s.turnRemainingMs).toBe(15 * MIN);
    expect(s.totalRemainingMs).toBe(3 * HOUR - 25 * MIN);
  });
  it('3 óra után vége: letelt az idő', () => {
    const s = snapshot(c, 3 * HOUR);
    expect(s.finished).toBe(true);
    expect(s.totalRemainingMs).toBe(0);
    expect(s.turnRemainingMs).toBe(0);
  });
  it('a vége után sem megy negatívba', () => {
    expect(snapshot(c, 4 * HOUR).totalRemainingMs).toBe(0);
  });
});

describe('snapshot – ha a teljes idő nem osztható a váltási idővel', () => {
  it('az utolsó kör a teljes idő végénél elvágódik', () => {
    const s = snapshot(cfg(['Anna', 'Bence'], 50 * MIN, 20 * MIN), 40 * MIN);
    expect(s.name).toBe('Anna');
    expect(s.turnRemainingMs).toBe(10 * MIN);
  });
});

describe('snapshot – ha a váltási idő hosszabb a teljesnél', () => {
  it('végig az első név marad, és a kör a teljes idővel ér véget', () => {
    const s = snapshot(cfg(['Anna', 'Bence'], 10 * MIN, 20 * MIN), 0);
    expect(s.name).toBe('Anna');
    expect(s.turnRemainingMs).toBe(10 * MIN);
  });
});

describe('menet: szünet és folytatás', () => {
  const c = cfg(['Anna'], HOUR, 20 * MIN);
  it('futás közben az eltelt idő a valós idővel együtt nő', () => {
    expect(elapsedMs(startSession(c, 1000), 6000)).toBe(5000);
  });
  it('szünetben megáll, folytatás után onnan megy tovább', () => {
    let s = startSession(c, 0);
    s = pauseSession(s, 10_000);
    expect(isPaused(s)).toBe(true);
    expect(elapsedMs(s, 70_000)).toBe(10_000);
    s = resumeSession(s, 70_000);
    expect(isPaused(s)).toBe(false);
    expect(elapsedMs(s, 75_000)).toBe(15_000);
  });
  it('a dupla szünet vagy dupla folytatás nem rontja el az időt', () => {
    let s = startSession(c, 0);
    s = pauseSession(s, 1000);
    s = pauseSession(s, 5000);
    s = resumeSession(s, 6000);
    s = resumeSession(s, 9000);
    expect(elapsedMs(s, 10_000)).toBe(5000);
  });
});

describe('soundBetween', () => {
  const c = cfg(['Anna', 'Bence'], 6000, 2000);
  it('kör közben csend', () => {
    expect(soundBetween(snapshot(c, 100), snapshot(c, 1900))).toBe(null);
  });
  it('névváltáskor váltáshang', () => {
    expect(soundBetween(snapshot(c, 1900), snapshot(c, 2000))).toBe('turn');
  });
  it('a teljes idő végén végehang, utána csend', () => {
    expect(soundBetween(snapshot(c, 5900), snapshot(c, 6000))).toBe('end');
    expect(soundBetween(snapshot(c, 6000), snapshot(c, 7000))).toBe(null);
  });
  it('ha közben több kör is eltelt (pl. lezárt telefon), csak egyszer szól', () => {
    expect(soundBetween(snapshot(c, 100), snapshot(c, 4100))).toBe('turn');
  });
});

describe('átadás: a kör végén a menet megáll, a következő ideje kattintásra indul', () => {
  const c = cfg(['Anna', 'Bence', 'Csaba'], 6000, 2000);

  it('a kör vége előtt nem áll meg', () => {
    const s = stopAtTurnEnd(startSession(c, 0), 1999);
    expect(isPaused(s)).toBe(false);
    expect(isHandover(s)).toBe(false);
  });

  it('a kör végén átadásra vár: a következő név látszik, teljes körrel', () => {
    const s = stopAtTurnEnd(startSession(c, 0), 2000);
    expect(isHandover(s)).toBe(true);
    expect(snapshot(c, elapsedMs(s, 2000))).toMatchObject({ name: 'Bence', turnRemainingMs: 2000 });
  });

  it('átadás közben egyik idő sem fogy, akkor sem, ha későn vette észre', () => {
    const s = stopAtTurnEnd(startSession(c, 0), 2500);
    expect(elapsedMs(s, 2500)).toBe(2000);
    expect(elapsedMs(s, 60_000)).toBe(2000);
  });

  it('kattintás (folytatás) után onnan indul a következő kör', () => {
    let s = stopAtTurnEnd(startSession(c, 0), 2000);
    s = resumeSession(s, 9000);
    expect(isHandover(s)).toBe(false);
    expect(elapsedMs(s, 9500)).toBe(2500);
    expect(snapshot(c, elapsedMs(s, 9500)).name).toBe('Bence');
  });

  it('a következő kör végén újra megáll', () => {
    let s = resumeSession(stopAtTurnEnd(startSession(c, 0), 2000), 9000);
    expect(isHandover(stopAtTurnEnd(s, 10_999))).toBe(false);
    s = stopAtTurnEnd(s, 11_000);
    expect(isHandover(s)).toBe(true);
    expect(snapshot(c, elapsedMs(s, 11_000)).name).toBe('Csaba');
  });

  it('ha közben több kör is eltelt volna (lezárt telefon), az első határon áll meg', () => {
    const s = stopAtTurnEnd(startSession(c, 0), 5000);
    expect(elapsedMs(s, 5000)).toBe(2000);
    expect(snapshot(c, elapsedMs(s, 5000)).name).toBe('Bence');
  });

  it('a teljes idő végén nincs átadás, hanem vége', () => {
    let s = startSession(c, 0);
    s = resumeSession(stopAtTurnEnd(s, 2000), 2000);
    s = resumeSession(stopAtTurnEnd(s, 4000), 4000);
    s = stopAtTurnEnd(s, 6000);
    expect(isHandover(s)).toBe(false);
    expect(snapshot(c, elapsedMs(s, 6000)).finished).toBe(true);
  });

  it('kézi szünetben nem vált át', () => {
    const s = stopAtTurnEnd(pauseSession(startSession(c, 0), 1000), 5000);
    expect(isHandover(s)).toBe(false);
    expect(elapsedMs(s, 5000)).toBe(1000);
  });
});
