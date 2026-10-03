// film.js — film 180s: 12 beat, kamera glide, telemetri, caption, VO sinkron.
// Ars planning: docs/STORY-180.md + scripts/schedule.json. Murni f(gf).
import { FPS, chamberSurfY, wavePath, ductVelocity, thetaGlobal, powerKW, pressureKPa, rpmAt, rpmFromV, mulberry32 } from "./physics.js";
import { camAt, applyCam, TOTAL, B0_BEATS, B1F_BEATS } from "./camera.js";
import { buildScenery, CH_X, CH_TOP, CH_W, CH_H, WL_X, WL_Y } from "./scenery.js";

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

// ---- Beat schedule (dari scripts/schedule.json; VO dur + pad rata) ----
const VO_DUR = { 1:14.26, 2:12.62, 3:13.73, 4:15.38, 5:15.36, 6:14.86, 7:16.34, 8:12.91, 9:15.00, 10:15.74, 11:10.44, 12:11.16 };
const TOTAL_S = 180.0;
const PAD = (TOTAL_S - Object.values(VO_DUR).reduce((a, b) => a + b, 0)) / 12;
const BEATS = [];
let tAcc = 0;
for (const b of Object.keys(VO_DUR).map(Number)) { const d = VO_DUR[b] + PAD; BEATS.push({ b, s: tAcc, e: tAcc + d }); tAcc += d; }

// Caption per beat: kicker + title + sub (+val/unit opsional), posisi anti-collision.
const CAPS = [
  { b:1,  pos:"p-bl",    kicker:"DINAMIKA HIDRODINAMIKA PESISIR", title:"Energi masif gelombang laut", sub:"Osilasi stokastik fluida samudra lepas" },
  { b:2,  pos:"p-bl",    kicker:"TANTANGAN LINGKUNGAN LAUT", title:"Kegagalan mekanisme subsea", sub:"Risiko korosi dan impak biofouling tinggi" },
  { b:3,  pos:"p-bc",    kicker:"SPEKTRUM JONSWAP", title:"Pemodelan gelombang lepas", sub:"Tinggi signifikan 3.0 m, periode puncak 8.0 s" },
  { b:4,  pos:"p-bl",    kicker:"STRUKTUR CAISSON BETON", title:"Geometri ruang tangkapan", sub:"Dimensi 12.0 x 8.5 m beton bertulang" },
  { b:5,  pos:"p-tr",    kicker:"PRINSIP KOLOM AIR", title:"Piston hidraulis alami", sub:"Konversi osilasi air menjadi aliran pneumatik" },
  { b:6,  pos:"p-tr",    kicker:"AKSELERASI DUCT", title:"Aliran udara dua arah", sub:"Penyempitan saluran melipatgandakan kecepatan" },
  { b:7,  pos:"p-bc",    kicker:"AERODINAMIKA TURBIN", title:"Rotor Wells searah putaran", sub:"Gaya dorong tangensial konstan dua arah aliran" },
  { b:8,  pos:"p-br",    kicker:"TRANSMISI DAYA LANGSUNG", title:"Generator sinkron PMSG", sub:"Kopel langsung tanpa gearbox, rugi minimal" },
  { b:9,  pos:"p-br",    kicker:"VALIDASI SKALA FROUDE 1:50", title:"Respon tekanan bilik", sub:"Periode model 1.13 detik", val:"3.1 - 4.7 kPa" },
  { b:10, pos:"p-br",    kicker:"TELEMETRI DAYA & ROTASI", title:"Keluaran daya terkopel", sub:"Rotasi 900 - 1450 rpm", val:"18.4 - 30.0 kW, ETA 35%" },
  { b:11, pos:"p-strip", kicker:"INTEGRASI SISTEM DAYA", title:"Penyaluran ke jaringan grid", sub:"Inverter dan BESS menstabilkan fluktuasi" },
  { b:12, pos:"p-strip", kicker:"KESIMPULAN REKAYASA", title:"Cetak biru energi bersih", sub:"Keandalan konversi energi laut ramah lingkungan" },
];

const $ = (id) => document.getElementById(id);

// ---- Elemen dinamis dibuat sekali (deterministik) ----
const dyn = {};
function makeDynamic() {
  // S1: path laut + JONSWAP dot
  dyn.seaFill = S("path", { fill:"#103A5A", opacity:0.8 });
  dyn.seaLine = S("path", { fill:"none", stroke:"#EAF2F8", "stroke-width":4 });
  $("s1sea").append(dyn.seaFill, dyn.seaLine);
  dyn.jon = S("circle", { r:8, fill:"#B84A39" });
  $("s1jon").appendChild(dyn.jon);
  // S2: air chamber + echo + buih + panah vektor + partikel + puffs
  dyn.wFill = S("path", { fill:"#103A5A", opacity:0.85 });
  dyn.echo = S("path", { fill:"none", stroke:"#175078", "stroke-width":3, opacity:0.7 });
  dyn.surf = S("path", { fill:"none", stroke:"#EAF2F8", "stroke-width":4 });
  $("s2water").appendChild(dyn.wFill);
  $("s2echo").appendChild(dyn.echo);
  $("s2surf").appendChild(dyn.surf);
  const foam = S("g", { fill:"#EAF2F8", opacity:0.8 });
  dyn.foamC = [0, 1, 2, 3].map(() => foam.appendChild(S("circle", { r:6 })));
  $("s2foam").appendChild(foam);
  // flowlines ruang pneumatik
  for (let i = 0; i < 5; i++) $("s2flowlines").appendChild(S("line", { x1:CH_X - 300 + i * 150, y1:CH_TOP + 60, x2:CH_X - 300 + i * 150, y2:CH_TOP + 300, stroke:"#8FA9B5", "stroke-width":2, opacity:0.35 }));
  // vektor aliran duct
  dyn.vec = S("g", { "stroke-width":8, opacity:0.95 });
  dyn.vecLine = S("line", {});
  dyn.vecArrow = S("polygon", {});
  dyn.vec.append(dyn.vecLine, dyn.vecArrow);
  $("s2vec").appendChild(dyn.vec);
  // partikel duct (26, mulberry32 seed 2026 — persis bank)
  const r = mulberry32(2026);
  dyn.parts = Array.from({ length: 26 }, () => ({ x: r(), ph: r() * Math.PI * 2, sp: 0.6 + r() * 0.8, s: 3 + r() * 4 }));
  dyn.partG = S("g", { fill:"#D1B894" });
  for (const p of dyn.parts) dyn.partG.appendChild(S("circle", { r:p.s.toFixed(1) }));
  $("s2vec").appendChild(dyn.partG);
  // puffs exhale (6)
  dyn.puffs = [];
  for (let i = 0; i < 6; i++) { const c = S("circle", { r:7, fill:"#D1B894" }); dyn.puffs.push(c); $("s2vec").appendChild(c); }
  // S3: HUD dot + teks
  dyn.hudDot = $("s3huddot");
  const mk = (x, y, size, fill) => { const t = S("text", { x, y, "font-family":"DejaVu Sans Mono", "font-size":size, fill }); return t; };
  dyn.hudP = mk(36, -16, 34, "#8FA9B5"); dyn.hudN = mk(14, 34, 34, "#8FA9B5");
  $("s3hud").append(dyn.hudP, dyn.hudN);
  // S4: osc + lc path + angka
  dyn.osc = S("path", { fill:"none", stroke:"#B84A39", "stroke-width":4 });
  dyn.lc = S("path", { fill:"none", stroke:"#D1B894", "stroke-width":4 });
  $("s4g").append(dyn.osc, dyn.lc);
  dyn.s4P = mk(3870, 1060, 30, "#8FA9B5"); dyn.s4p = mk(4236, 1060, 30, "#8FA9B5"); dyn.s4n = mk(4603, 1060, 32, "#EAF2F8");
  $("s4g").append(dyn.s4P, dyn.s4p, dyn.s4n);
  dyn.needle = S("line", { x1:4770, y1:900, x2:4770, y2:900, stroke:"#B84A39", "stroke-width":6 });
  dyn.hub = S("circle", { cx:4770, cy:900, r:10, fill:"#B84A39" });
  $("s4g").append(dyn.needle, dyn.hub);
  // S5: busbar double + stamp
  dyn.busFg = S("line", { x1:5300, y1:750, x2:6560, y2:750, stroke:"#EAF2F8", "stroke-width":5 });
  dyn.busAcc = S("line", { x1:5300, y1:750, x2:6560, y2:750, stroke:"#B84A39", "stroke-width":4, "stroke-dasharray":"18 14", opacity:0.9 });
  $("s5g").prepend(dyn.busFg, dyn.busAcc);
  // Caption container
  dyn.cap = $("cap"); dyn.capK = dyn.cap.querySelector(".kicker");
  dyn.capT = dyn.cap.querySelector(".title"); dyn.capS = dyn.cap.querySelector(".sub");
}

// ---- Update per frame (murni f(gf)) ----
let curCap = null;
function update(gf) {
  const cam = camAt(gf);
  const { tx, ty, s } = applyCam(cam);
  $("world").style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;

  // S1 laut: path 210-1820 nyambung dinding chamber
  let d = "";
  for (let x = 210; x <= 1820; x += 30) d += `${x === 210 ? "M" : "L"}${x} ${chamberSurfY(x, gf, 950).toFixed(1)} `;
  dyn.seaFill.setAttribute("d", `${d} L1820 1350 L210 1350 Z`);
  dyn.seaLine.setAttribute("d", d);
  // panah rambat ikut permukaan
  const arr = Array.from($("s1arrows").children);
  const ax = [500, 900, 1300];
  ax.forEach((x, i) => {
    const y = (chamberSurfY(x, gf, 950) - 18).toFixed(1);
    arr[i * 2].setAttribute("y1", y); arr[i * 2].setAttribute("y2", y);
    arr[i * 2 + 1].setAttribute("points", `${x + 42},${y - 10} ${x + 42},${+y + 10} ${x + 62},${y}`);
  });
  // JONSWAP dot
  const jx = 1330 + ((gf * 2) % 300);
  const jy = 610 - 70 * Math.exp(-Math.pow((jx - 1480) / 70, 2));
  dyn.jon.setAttribute("cx", jx); dyn.jon.setAttribute("cy", jy);

  // S2 piston + buih + vektor
  const yBase = 950;
  const xL = CH_X - CH_W / 2, xR = CH_X + CH_W / 2;
  const surf = wavePath(gf, yBase, xL, xR);
  const echo = wavePath(gf, yBase + 30, xL, xR);
  dyn.surf.setAttribute("d", surf);
  dyn.echo.setAttribute("d", echo);
  dyn.wFill.setAttribute("d", `${surf} L${xR} ${CH_TOP + CH_H} L${xL} ${CH_TOP + CH_H} Z`);
  const yL = chamberSurfY(xL, gf, yBase), yR = chamberSurfY(xR, gf, yBase);
  const foamCfg = [[xL + 8, yL, 6], [xL + 22, yL + 12, 4], [xR - 8, yR, 6], [xR - 22, yR + 12, 4]];
  dyn.foamC.forEach((c, i) => { c.setAttribute("cx", foamCfg[i][0]); c.setAttribute("cy", foamCfg[i][1]); c.setAttribute("r", foamCfg[i][2]); });
  const v = ductVelocity(gf);
  const col = v >= 0 ? "#B84A39" : "#D1B894";
  const mag = 60 + 120 * Math.abs(v);
  const dir = Math.sign(v || 1);
  dyn.vecLine.setAttribute("x1", CH_X); dyn.vecLine.setAttribute("y1", CH_TOP + 300);
  dyn.vecLine.setAttribute("x2", CH_X); dyn.vecLine.setAttribute("y2", CH_TOP + 300 - dir * mag);
  dyn.vecLine.setAttribute("stroke", col);
  dyn.vecArrow.setAttribute("points", dir >= 0
    ? `${CH_X - 18},${CH_TOP + 300 - mag} ${CH_X + 18},${CH_TOP + 300 - mag} ${CH_X},${CH_TOP + 300 - mag - 30}`
    : `${CH_X - 18},${CH_TOP + 300 + mag} ${CH_X + 18},${CH_TOP + 300 + mag} ${CH_X},${CH_TOP + 300 + mag + 30}`);
  dyn.vecArrow.setAttribute("fill", col);
  // partikel ikut |v|
  const pc = Array.from(dyn.partG.children);
  pc.forEach((c, i) => {
    const p = dyn.parts[i];
    const y = CH_TOP + 760 - ((gf * p.sp * (0.5 + Math.abs(v)) + p.ph * 60) % 560);
    c.setAttribute("cx", CH_X - 260 + p.x * 520);
    c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("opacity", (0.45 + 0.35 * Math.abs(v)).toFixed(2));
  });
  dyn.puffs.forEach((c, i) => {
    const yy = CH_TOP - 30 - ((gf * 2.2 + i * 37) % 170);
    c.setAttribute("cx", CH_X - 60 + i * 24);
    c.setAttribute("cy", yy.toFixed(1));
    c.setAttribute("opacity", v > 0 ? (0.15 + 0.45 * v).toFixed(2) : "0.06");
  });

  // S3 rotor CW thetaGlobal + HUD
  const th = (thetaGlobal(gf) * 180) / Math.PI;
  $("s3rot").setAttribute("transform", `translate(${WL_X} ${WL_Y}) rotate(${th.toFixed(3)})`);
  dyn.hudDot.setAttribute("opacity", (0.5 + 0.5 * Math.abs(v)).toFixed(2));
  dyn.hudP.textContent = `P ${powerKW(gf).toFixed(1)} kW  p ${pressureKPa(gf).toFixed(2)} kPa`;
  dyn.hudN.textContent = `n ${rpmAt(gf).toFixed(0)} rpm`;

  // S4 osc + riwayat + gauge + angka
  const gp = Math.floor(gf / 3) * 3;
  let osc = "";
  for (let i = 0; i <= 40; i++) {
    const x = 3870 + (i / 40) * 260;
    const y = 850 + 70 * Math.sin((i / 40) * Math.PI * 4 - (gp / 30) * 5.5);
    osc += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  dyn.osc.setAttribute("d", osc);
  let lc = "";
  for (let i = 0; i <= 40; i++) {
    const g = Math.max(0, gf - 120 + (i / 40) * 120);
    const p = powerKW(g);
    const x = 4236 + (i / 40) * 260;
    const y = 1000 - ((p - 18) / 12) * 120;
    lc += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  dyn.lc.setAttribute("d", lc);
  const rpm = rpmAt(gf);
  const ang = -90 + ((rpm - 900) / 550) * 180;
  dyn.needle.setAttribute("x2", (4770 + 90 * Math.cos((ang * Math.PI) / 180)).toFixed(1));
  dyn.needle.setAttribute("y2", (900 + 90 * Math.sin((ang * Math.PI) / 180)).toFixed(1));
  dyn.s4P.textContent = `P ${powerKW(gf).toFixed(1)} kW`;
  dyn.s4p.textContent = `p ${pressureKPa(gf).toFixed(2)} kPa`;
  dyn.s4n.textContent = `${rpm.toFixed(0)} rpm`;

  // S5 busbar elektron + stamp
  const off = -((gf * 4) % 32);
  dyn.busAcc.setAttribute("stroke-dashoffset", off.toFixed(1));
  $("s5stamp").style.opacity = gf > 5035 + 180 ? "1" : "0"; // stamp ACC di beat 12

  // Reveal progresif S1 (oCentre->oJon) sesuai bank: 20/60/80/200/300f lokal, dipetakan global beat 1-4
  const oCentre = clamp01((gf - 20) / 60);
  const oOut = clamp01((gf - 60) / 80);
  const oHatch = clamp01((gf - 120) / 80);
  const oDims = clamp01((gf - 200) / 80);
  const oBal = clamp01((gf - 300) / 60);
  const cen = $("s1centre").firstElementChild;
  if (cen) cen.setAttribute("opacity", oCentre.toFixed(2));
  $("s1outline").style.opacity = oOut.toFixed(2);
  $("s1hatch").style.opacity = oHatch.toFixed(2);
  $("s1dims").style.opacity = oDims.toFixed(2);
  $("s1balloons").style.opacity = oBal.toFixed(2);
  const pEvo = clamp01(gf / 300);
  $("s1coastline").setAttribute("stroke-dashoffset", (2300 * (1 - pEvo)).toFixed(1));
  $("s1jon").style.opacity = clamp01((gf - 150) / 30).toFixed(2);

  // Section sweep A-A saat beat 5 (1802-2293)
  const sw = $("s2sweep");
  if (gf >= 1802 && gf <= 2293) {
    const p = (gf - 1802) / 491;
    const x = 1880 + p * 900;
    sw.style.opacity = "0.8";
    sw.innerHTML = "";
    sw.appendChild(S("line", { x1:x, y1:700, x2:x, y2:1600, stroke:"#B84A39", "stroke-width":4, "stroke-dasharray":"20 12" }));
    const t = S("text", { x:x + 12, y:740, "font-family":"DejaVu Sans Mono", "font-size":28, fill:"#B84A39" });
    t.textContent = "A-A"; sw.appendChild(t);
  } else sw.style.opacity = "0";

  // Caption: hitung beat aktif; WordReveal via GSAP timeline (bukan per-frame DOM churn)
  const bt = BEATS.find((B) => gf >= B.s * FPS && gf < B.e * FPS) || BEATS[BEATS.length - 1];
  const cap = CAPS[bt.b - 1];
  if (curCap !== cap) {
    curCap = cap;
    dyn.cap.className = cap.pos;
    dyn.capK.textContent = cap.kicker;
    dyn.capT.textContent = cap.title;
    dyn.capS.textContent = cap.sub + (cap.val ? "  |  " + cap.val : "");
    playCaption(cap);
  }
  // exit caption sebelum glide kamera (70% beat): fade -24px 12f (persis bank)
  const holdEnd = B0_BEATS[bt.b - 1] + 0.7 * (B1F_BEATS[bt.b - 1] - B0_BEATS[bt.b - 1]);
  const outT = clamp01((gf - (holdEnd - 12)) / 12);
  dyn.cap.style.opacity = (1 - outT).toFixed(2);
  dyn.cap.style.transform = (cap.pos === "p-bc" || cap.pos === "p-strip")
    ? `translateX(-50%) translateY(${(-24 * outT).toFixed(1)}px)`
    : `translateY(${(-24 * outT).toFixed(1)}px)`;
}

// ---- GSAP master timeline (paused, seek per frame oleh engine) ----
let capTl = null;
function playCaption(cap) {
  if (capTl) capTl.kill();
  capTl = gsap.timeline();
  const words = dyn.capT.textContent.split(" ");
  dyn.capT.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(" ");
  gsap.set(dyn.capT.querySelectorAll(".word"), { opacity: 0, y: 18 });
  capTl.to(dyn.capT.querySelectorAll(".word"), { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "power3.out" });
  capTl.fromTo(dyn.cap, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, 0);
  capTl.fromTo(dyn.capS, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.4);
}

function buildMaster() {
  const tl = gsap.timeline({ paused: true });
  // Kamera + semua visual di-drive onUpdate seek manual (deterministik f(gf))
  tl.to({ v: 0 }, {
    v: 1, duration: TOTAL_S, ease: "none",
    onUpdate: function () { update(Math.round(this.time() * FPS)); },
  }, 0);
  return tl;
}

// ---- VO audio clips: 12 beat, data-* HTML di index; sinkron via scheduler di bawah ----

// ---- Init (module script dieksekusi setelah DOM parse, DOMContentLoaded sudah lewat) ----
buildScenery();
makeDynamic();
const tl = buildMaster();
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
// QA hook: #t=<detik> seek langsung saat load (suppressEvents:false agar onUpdate jalan)
const m = location.hash.match(/^#t=([0-9.]+)$/);
tl.seek(m ? parseFloat(m[1]) : 0, false);