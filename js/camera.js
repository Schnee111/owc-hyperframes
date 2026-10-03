// camera.js — port 1:1 dari bank v4 (src/world/camera.ts) ke 5400 frame / 12 anchor.
// GLIDE kontinu, easing in-out simetris 50/50, napas +-3px. Murni f(gf).
export const FPS = 30;
export const TOTAL = 5400;
export const WORLD_W = 6720;
export const WORLD_H = 2160;

// Anchor per beat (dari scripts/schedule.json — VO-driven).
export const ANCHORS = [
  { f: 0,    c: { x: 1015, y: 910,  z: 1.00 } }, // B01 wide pantai
  { f: 458,  c: { x: 960,  y: 975,  z: 1.45 } }, // B02 caisson
  { f: 867,  c: { x: 1480, y: 570,  z: 1.75 } }, // B03 JONSWAP
  { f: 1310, c: { x: 960,  y: 975,  z: 1.50 } }, // B04 dims caisson
  { f: 1802, c: { x: 2330, y: 1150, z: 1.60 } }, // B05 piston chamber
  { f: 2293, c: { x: 2900, y: 1050, z: 1.90 } }, // B06 duct particles
  { f: 2769, c: { x: 3480, y: 1150, z: 2.20 } }, // B07 rotor wells
  { f: 3290, c: { x: 4380, y: 950,  z: 1.40 } }, // B08 dashboard wide
  { f: 3708, c: { x: 4030, y: 950,  z: 1.80 } }, // B09 osiloskop tekanan
  { f: 4188, c: { x: 4400, y: 950,  z: 1.70 } }, // B10 gauge rpm + daya
  { f: 4691, c: { x: 5930, y: 1000, z: 1.10 } }, // B11 SLD grid
  { f: 5035, c: { x: 5930, y: 1030, z: 1.15 } }, // B12 title block + ACC
  { f: 5399, c: { x: 5930, y: 1030, z: 1.15 } },
];

// Easing bezier: APPLE out / power2.in / power3.inOut (persis bank).
function cubicBezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const solve = (x, eps = 1e-6) => {
    let t0 = 0, t1 = 1, t = x;
    for (let i = 0; i < 8; i++) {
      const x2 = sampleX(t) - x;
      if (Math.abs(x2) < eps) return t;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= x2 / d;
      t = Math.max(0, Math.min(1, t));
    }
    while (t0 < t1) {
      const x2 = sampleX(t);
      if (Math.abs(x2 - x) < eps) break;
      if (x > x2) t0 = t; else t1 = t;
      t = (t0 + t1) / 2;
    }
    return t;
  };
  return (x) => sampleY(solve(Math.max(0, Math.min(1, x))));
}

export const E_INOUT = cubicBezier(0.83, 0, 0.17, 1);

export function lerp(a, b, t) { return a + (b - a) * t; }

// camAt: HOLD di anchor 70% beat + GLIDE 30% akhir, tiba pas batas scene (kontrak r9).
// Tidak pernah diam di posisi nanggung antara dua konten.
const B0 = [0, 458, 867, 1310, 1802, 2293, 2769, 3290, 3708, 4188, 4691, 5035];
const B1F = [458, 867, 1310, 1802, 2293, 2769, 3290, 3708, 4188, 4691, 5035, 5400];
export const B0_BEATS = B0;
export const B1F_BEATS = B1F;

export function camAt(gf) {
  const f = Math.max(0, Math.min(TOTAL - 1, gf));
  let k = 0;
  while (k < B0.length - 1 && f >= B1F[k]) k++;
  const a = ANCHORS[k].c, b = ANCHORS[k + 1].c;
  const f0 = B0[k], f1 = B1F[k];
  const tloc = (f - f0) / Math.max(1, f1 - f0);
  const br = 2 * Math.PI * (f / (FPS * 5)); // napas 5 detik +-3px
  if (k >= B0.length - 1 || tloc < 0.7) {
    return { x: a.x + 3 * Math.sin(br), y: a.y + 2 * Math.cos(br * 0.9), z: a.z };
  }
  const p = E_INOUT((tloc - 0.7) / 0.3);
  return {
    x: lerp(a.x, b.x, p) + 3 * Math.sin(br),
    y: lerp(a.y, b.y, p) + 2 * Math.cos(br * 0.9),
    z: lerp(a.z, b.z, p),
  };
}

// applyCam: world -> screen (rumus BangMotion, pivot viewport tengah).
export function applyCam(c) {
  return { tx: 960 - c.x * c.z, ty: 540 - c.y * c.z, s: c.z };
}