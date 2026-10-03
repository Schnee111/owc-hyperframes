// physics.js — port 1:1 dari bank v4 (src/physics.ts + thetaTable.ts + telemetry.ts)
// Deterministik murni f(frame). Tanpa Math.random / Date.now.
export const FPS = 30;
export const T_FULL = 8;            // s, periode prototipe
export const FROUDE = 50;
export const TIME_RATIO = Math.sqrt(50);
export const T_MODEL = T_FULL / TIME_RATIO;   // 1.13137 s
export const KY = 2500;             // px per m model
export const AMP_M = 0.03;          // m

export function etaModel(xPx, gf, fps = FPS, ampM = AMP_M) {
  const t = gf / fps;
  const omega = (2 * Math.PI) / T_MODEL;
  const kPx = (2 * Math.PI) / 900;
  return ampM * Math.sin(kPx * xPx - omega * t);
}

// Permukaan air terpadu S1+chamber: dual-harmonik, fase absolut world-x.
export function chamberSurfY(xAbs, gf, yBase = 950) {
  const t = gf / FPS;
  const omega = (2 * Math.PI) / T_MODEL;
  const kPx = (2 * Math.PI) / 900;
  const h1 = etaModel(xAbs, gf) * KY;                                  // 75px primer
  const h2 = 0.03 * 0.4 * Math.sin(2 * kPx * xAbs - 2 * omega * t + 1.3) * KY; // 30px mikro
  return yBase + h1 + h2;
}

export function wavePath(gf, yBase, x0, x1, step = 24) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) {
    const y = chamberSurfY(x, gf, yBase);
    pts.push(`${x === x0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

// Dinamika duct: v = cos(omega t) (-1..1). RPM ikut |v|. Theta akumulasi diskrit.
export function ductVelocity(gf, fps = FPS) {
  const t = gf / fps;
  const omega = (2 * Math.PI) / T_MODEL;
  return Math.cos(omega * t);
}
export function rpmFromV(v) { return 900 + 550 * Math.abs(v); }

const N = 5400;
export const THETA = (() => {
  const arr = new Array(N);
  let th = 0;
  const dt = 1 / FPS;
  for (let i = 0; i < N; i++) {
    arr[i] = th;
    th += ((rpmFromV(ductVelocity(i)) * 2 * Math.PI) / 60) * dt;
  }
  return arr;
})();
export function thetaGlobal(gf) {
  if (gf <= 0) return 0;
  if (gf >= N) return THETA[N - 1];
  return THETA[gf];
}

// Telemetri ledger M/D/S/I
export function powerKW(gf)    { const v = ductVelocity(gf); return 18.4 + 11.6 * Math.abs(v); }
export function pressureKPa(gf){ const v = ductVelocity(gf); return 3.1 + 1.6 * Math.abs(v); }
export function rpmAt(gf)      { return rpmFromV(ductVelocity(gf)); }

// mulberry32 seeded (dari prim.tsx)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}