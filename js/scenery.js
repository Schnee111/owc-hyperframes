// scenery.js — geometri SVG statis, port 1:1 dari bank v4 (Film.tsx + Slice.tsx + World.tsx).
// Semua murni kode vektor. Elemen yang bergerak per frame diberi id untuk film.js.
const S = (tag, attrs = {}) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
const C = { bg:"#0B253A", fg:"#EAF2F8", acc:"#B84A39", och:"#D1B894", veil:"#8FA9B5", over:"#061521", water:"#103A5A", water2:"#175078" };

export const CH_X = 2330, CH_TOP = 700, CH_W = 900, CH_H = 900;
export const WL_X = 3480, WL_Y = 1100;

export function buildScenery() {
  // ---- UTM ticks (6720/240) ----
  const utm = document.getElementById("utmticks");
  for (let x = 0; x <= 6720; x += 240) {
    utm.appendChild(S("line", { x1:x, y1:200, x2:x, y2:1960, stroke:C.veil, "stroke-width":1, opacity:0.22 }));
  }

  // ---- S1: laut (dinamis), panah rambat, arsir, centre, caisson, dims, balloons, coastline, datum, JONSWAP ----
  const s1arrows = document.getElementById("s1arrows");
  for (const x of [500, 900, 1300]) {
    s1arrows.appendChild(S("line", { x1:x-42, y1:0, x2:x+42, y2:0 }));
    s1arrows.appendChild(S("polygon", { points:`${x+42},-10 ${x+42},10 ${x+62},0`, fill:C.veil }));
  }
  document.getElementById("s1hatch").appendChild(
    S("polygon", { points:"210,1350 1820,1350 1820,1220 900,1160 210,1200", fill:"url(#hatch45-s1)" })
  );
  // caisson outline
  const ol = document.getElementById("s1outline");
  ol.appendChild(S("rect", { x:700, y:700, width:520, height:550, fill:"none", stroke:C.fg, "stroke-width":5 }));
  ol.appendChild(S("rect", { x:820, y:900, width:280, height:350, fill:"none", stroke:C.veil, "stroke-width":3 }));
  ol.appendChild(S("line", { x1:960, y1:700, x2:960, y2:1250, stroke:C.veil, "stroke-width":2, "stroke-dasharray":"11 7" }));
  // dims
  const dm = document.getElementById("s1dims");
  dm.appendChild(S("line", { x1:700, y1:660, x2:1220, y2:660, stroke:C.veil, "stroke-width":2 }));
  const t1 = S("text", { x:880, y:640 }); t1.textContent = "12.0 m"; dm.appendChild(t1);
  dm.appendChild(S("line", { x1:1280, y1:700, x2:1280, y2:1250, stroke:C.veil, "stroke-width":2 }));
  const t2 = S("text", { x:1300, y:980 }); t2.textContent = "8.5 m"; dm.appendChild(t2);
  const t3 = S("text", { x:230, y:1240 }); t3.textContent = "SKALA 1:50 MODEL FISIK"; dm.appendChild(t3);
  // balloons
  const bl = document.getElementById("s1balloons");
  bl.appendChild(S("circle", { cx:700, cy:630, r:26, fill:"none", stroke:C.och, "stroke-width":3 }));
  const b1 = S("text", { x:691, y:639, fill:C.och }); b1.textContent = "1"; bl.appendChild(b1);
  bl.appendChild(S("circle", { cx:1220, cy:630, r:26, fill:"none", stroke:C.och, "stroke-width":3 }));
  const b2 = S("text", { x:1211, y:639, fill:C.och }); b2.textContent = "2"; bl.appendChild(b2);
  // JONSWAP box
  const jn = document.getElementById("s1jon");
  jn.appendChild(S("rect", { x:1300, y:470, width:360, height:200, fill:C.over, opacity:0.85, stroke:C.veil, "stroke-width":2 }));
  const jt = S("text", { x:1316, y:502, "font-family":"DejaVu Sans Mono", "font-size":22, fill:C.veil });
  jt.textContent = "JONSWAP Hs3 Tp8"; jn.appendChild(jt);
  jn.appendChild(S("path", { d:"M1320 610 C 1380 608, 1430 605, 1480 530 S 1560 605, 1640 608", fill:"none", stroke:C.och, "stroke-width":3 }));

  // ---- S2: dinding caisson + arsir beton ----
  const wl = document.getElementById("s2walls");
  wl.appendChild(S("rect", { x:CH_X-CH_W/2-60, y:CH_TOP, width:60, height:CH_H, fill:"url(#hatch45)", stroke:C.veil, "stroke-width":2 }));
  wl.appendChild(S("rect", { x:CH_X+CH_W/2, y:CH_TOP, width:60, height:CH_H, fill:"url(#hatch45)", stroke:C.veil, "stroke-width":2 }));

  // ---- S3: duct + casing rotor + 6 bilah + trail ring + hub (dinamis via #s3rot) ----
  const s3 = document.getElementById("s3g");
  s3.appendChild(S("rect", { x:WL_X-700, y:WL_Y-40, width:430, height:80, fill:"none", stroke:C.veil, "stroke-width":3 }));
  s3.appendChild(S("circle", { cx:WL_X, cy:WL_Y, r:210, fill:"none", stroke:C.veil, "stroke-width":3 }));
  s3.appendChild(S("circle", { cx:WL_X, cy:WL_Y, r:150, fill:"none", stroke:C.veil, "stroke-width":2, "stroke-dasharray":"11 7" }));
  const rot = document.getElementById("s3rot");
  rot.setAttribute("transform", `translate(${WL_X} ${WL_Y})`);
  rot.appendChild(S("circle", { r:180, fill:"none", stroke:C.acc, "stroke-width":5, "stroke-dasharray":"60 200", opacity:0.65 }));
  for (const b of [0, 60, 120, 180, 240, 300]) {
    const g = S("g", { transform:`rotate(${b})` });
    g.appendChild(S("rect", { x:-14, y:-150, width:28, height:130, fill:C.och, stroke:C.over, "stroke-width":2 }));
    g.appendChild(S("line", { x1:0, y1:-150, x2:60, y2:-150, stroke:C.acc, "stroke-width":6 }));
    g.appendChild(S("polygon", { points:"60,-162 60,-138 78,-150", fill:C.acc }));
    rot.appendChild(g);
  }
  rot.appendChild(S("circle", { r:34, fill:C.acc }));

  // ---- HUD mini (backing + angka dinamis) ----
  const hud = document.getElementById("s3hud");
  hud.setAttribute("transform", `translate(${WL_X-260} ${WL_Y+330})`);
  hud.appendChild(S("rect", { x:-10, y:-58, width:560, height:120, fill:C.over, opacity:0.88, stroke:C.veil, "stroke-width":2 }));
  document.getElementById("s3huddot").setAttribute("cx", 16);
  document.getElementById("s3huddot").setAttribute("cy", -32);
  document.getElementById("s3huddot").setAttribute("r", 9);

  // ---- S4: dashboard bento frame + kolom (kurva & angka dinamis) ----
  const s4 = document.getElementById("s4g");
  s4.appendChild(S("rect", { x:3830, y:650, width:1100, height:600, fill:C.over, opacity:0.92, stroke:C.veil, "stroke-width":2 }));
  s4.appendChild(S("line", { x1:4196, y1:650, x2:4196, y2:1250, stroke:C.veil, "stroke-width":1, opacity:0.5 }));
  s4.appendChild(S("line", { x1:4563, y1:650, x2:4563, y2:1250, stroke:C.veil, "stroke-width":1, opacity:0.5 }));
  for (const [x, label] of [[3870,"DAYA DUCT"],[4236,"RIWAYAT 4 DETIK"],[4603,"ROTOR n"]]) {
    const t = S("text", { x, y:660, "font-family":"DejaVu Sans Mono", "font-size":26, fill:C.veil });
    t.textContent = label; s4.appendChild(t);
  }
  s4.appendChild(S("path", { d:"M 4680 900 A 90 90 0 0 1 4860 900", fill:"none", stroke:C.veil, "stroke-width":6 }));
  s4.appendChild(S("line", { x1:3870, y1:1130, x2:4890, y2:1130, stroke:C.veil, "stroke-width":1, opacity:0.5 }));
  const foot = S("text", { x:3870, y:1232, "font-family":"DejaVu Sans Mono", "font-size":24, fill:C.veil });
  foot.textContent = "SKALA 1:50 T MODEL 1.13 S ETA 35%"; s4.appendChild(foot);

  // ---- S5: busbar + 4 node + BESS + title block ----
  const s5 = document.getElementById("s5g");
  const NODES = [[5400,"WELLS","turbin"],[5700,"PMSG","generator"],[6000,"INV","inverter"],[6350,"GRID","pantai"]];
  for (const [x, code, sub] of NODES) {
    s5.appendChild(S("line", { x1:x, y1:750, x2:x, y2:850, stroke:C.veil, "stroke-width":3 }));
    s5.appendChild(S("rect", { x:x-90, y:850, width:180, height:110, fill:C.over, stroke:C.veil, "stroke-width":2 }));
    const a = S("text", { x:x-66, y:898, "font-family":"DejaVu Sans Mono", "font-size":30, fill:C.fg }); a.textContent = code; s5.appendChild(a);
    const b = S("text", { x:x-66, y:932, "font-family":"DejaVu Sans Mono", "font-size":22, fill:C.veil }); b.textContent = sub; s5.appendChild(b);
  }
  s5.appendChild(S("rect", { x:5910, y:990, width:180, height:70, fill:"none", stroke:C.och, "stroke-width":3, "stroke-dasharray":"12 8" }));
  const be = S("text", { x:5926, y:1036, "font-family":"DejaVu Sans Mono", "font-size":26, fill:C.och }); be.textContent = "BESS"; s5.appendChild(be);
  s5.appendChild(S("line", { x1:6000, y1:960, x2:6000, y2:990, stroke:C.och, "stroke-width":2 }));
  s5.appendChild(S("rect", { x:5280, y:1090, width:1300, height:160, fill:C.over, opacity:0.92, stroke:C.fg, "stroke-width":3 }));
  s5.appendChild(S("line", { x1:5280, y1:1175, x2:6580, y2:1175, stroke:C.fg, "stroke-width":2 }));
  s5.appendChild(S("line", { x1:5980, y1:1090, x2:5980, y2:1250, stroke:C.fg, "stroke-width":2 }));
  const tt = S("text", { x:5300, y:1132, "font-family":"DejaVu Sans", "font-size":38, "font-weight":"bold", fill:C.fg });
  tt.textContent = "PLTO-OWC SKALA 1:50"; s5.appendChild(tt);
  const ts = S("text", { x:5316, y:1162, "font-family":"DejaVu Sans Mono", "font-size":22, fill:C.veil });
  ts.textContent = "SHEET 01/01 MODEL FISIK"; s5.appendChild(ts);
  const tl2 = S("text", { x:5300, y:1218, "font-family":"DejaVu Sans Mono", "font-size":24, fill:C.veil });
  tl2.textContent = "LEMBAR 5 GRID + HASIL"; s5.appendChild(tl2);
  const te = S("text", { x:6100, y:1218, "font-family":"DejaVu Sans Mono", "font-size":24, fill:C.veil });
  te.textContent = "ETA TOTAL 35%"; s5.appendChild(te);
  const stamp = document.getElementById("s5stamp");
  stamp.setAttribute("transform", "translate(6350 1180) rotate(-12)");
  stamp.appendChild(S("circle", { r:54, fill:"none", stroke:C.acc, "stroke-width":6 }));
  const st = S("text", { x:-38, y:12, "font-family":"DejaVu Sans", "font-size":36, "font-weight":"bold", fill:C.acc });
  st.textContent = "ACC"; stamp.appendChild(st);
}