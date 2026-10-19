/**
 * A kijelző ébren tartása menet közben. Főleg telefonon számít: lezárt képernyőnél a böngésző
 * megállítja az oldalt, és nem szólna a váltás hangja. Ahol nincs ilyen lehetőség, csendben kimarad.
 */
let wanted = false;
let lock = null;
let pending = false;

async function acquire() {
  if (!wanted || lock || pending || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  pending = true;
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    if (!wanted) {
      void sentinel.release();
      return;
    }
    lock = sentinel;
    sentinel.addEventListener('release', () => {
      if (lock === sentinel) lock = null;
    });
  } catch {
    // nem támogatott vagy nem engedélyezett: az időzítő enélkül is működik
  } finally {
    pending = false;
  }
}

export function keepAwake(on) {
  wanted = on;
  if (on) {
    void acquire();
  } else if (lock) {
    void lock.release();
    lock = null;
  }
}

// háttérbe kerüléskor a böngésző elengedi; visszatéréskor újra kérjük
document.addEventListener('visibilitychange', () => void acquire());
