/**
 * Visszaszámláló kiírása. Felfelé kerekít egész másodpercre, így induláskor a teljes idő
 * látszik (20:00), és a 0:00 pont a váltás pillanata. Egy óra alatt "p:mm", fölötte "ó:pp:mm".
 */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
