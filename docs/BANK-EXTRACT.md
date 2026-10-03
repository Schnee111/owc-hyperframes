# BANK-EXTRACT — Ekstraksi Aset Proven Remotion OWC v4 (Branch feat/rebuild-v4-world)

Dokumen ini adalah Single Source of Truth (SSOT) ekstraksi aset teruji (proven assets) dari repositori `remotion-owc-upi` (branch `feat/rebuild-v4-world`) di `/home/ubuntu/remotion-owc-upi`. Seluruh kode, rumus fisika, koordinat layout, tabel telemetri, tipografi, dan aturan anti-slop disalin secara presisi tanpa perubahan logika agar siap di-porting ke runtime JavaScript/TypeScript murni dan GSAP di arsitektur HyperFrames.

---

## 1. FUNGSI FISIKA (Deterministic f(frame))

Seluruh dinamika fisika pada OWC v4 didesain deterministik murni sebagai fungsi frame $f(frame)$ tanpa ketergantungan pada `Math.random()` atau `Date.now()`.

### 1.1. Modul Fisika Inti (`src/physics.ts`)

```typescript
// Fisika Airy + Froude 1:50. Murni fungsi f(frame), tanpa random/Date.now.
export const T_FULL = 8; // s, periode prototipe
export const L0 = 99.92; // m
export const K = 0.0629; // rad/m
export const C0 = 12.49; // m/s
export const FROUDE = 50;
export const TIME_RATIO = Math.sqrt(50); // 7.0710678118654755
export const T_MODEL = T_FULL / TIME_RATIO; // ~1.13137 s (~1.131 s)
export const KY = 2500; // px per m model (mapping vertikal)

// Elevasi model (m) pada posisi x (px) dan frame f.
export function etaModel(xPx: number, f: number, fps = 30, ampM = 0.03): number {
  const t = f / fps;
  const omega = (2 * Math.PI) / T_MODEL;
  const kPx = (2 * Math.PI) / 900; // satu panjang visual per 900px
  return ampM * Math.sin(kPx * xPx - omega * t);
}

export function yPixel(yBase: number, xPx: number, f: number, fps = 30): number {
  return yBase - etaModel(xPx, f, fps) * KY;
}

// Dinamika Wells: RPM ikut |v|, theta akumulasi, arah CW konstan.
export function ductVelocity(f: number, fps = 30): number {
  const t = f / fps;
  const omega = (2 * Math.PI) / T_MODEL;
  return Math.cos(omega * t); // -1..1, turunan sinus
}

export function rpmFromV(v: number): number {
  return 900 + 550 * Math.abs(v);
}

// Theta rotor diakumulasi per frame (diskrit, deterministik).
export function thetaAt(f: number, fps = 30): number {
  let th = 0;
  const dt = 1 / fps;
  for (let i = 0; i < f; i++) {
    th += ((rpmFromV(ductVelocity(i, fps)) * 2 * Math.PI) / 60) * dt;
  }
  return th;
}
```

### 1.2. Tabel Precomputed Theta $O(1)$ (`src/thetaTable.ts`)

Untuk menghindari kalkulasi loop akumulasi integral $O(N)$ di setiap render frame, tabel rotasi $\theta$ rotor Wells dihitung sekali di awal:

```typescript
// Tambahan: tabel theta precompute 2463 frame agar render O(1) per frame.
import {ductVelocity, rpmFromV} from "./physics";

const N = 2463;
const FPS = 30;
export const THETA: number[] = (() => {
  const arr = new Array<number>(N);
  let th = 0;
  const dt = 1 / FPS;
  for (let i = 0; i < N; i++) {
    arr[i] = th;
    th += ((rpmFromV(ductVelocity(i, FPS)) * 2 * Math.PI) / 60) * dt;
  }
  return arr;
})();

export function thetaGlobal(gf: number): number {
  if (gf <= 0) return 0;
  if (gf >= N) return THETA[N - 1];
  return THETA[gf];
}
```

### 1.3. Permukaan Air Dual-Harmonik Chamber (`src/world/Slice.tsx`)

Permukaan gelombang di dalam chamber OWC dan laut pantai S1 menggunakan fungsi terpadu $chamberSurfY$ agar fase air kontinu dan sejajar di batas dinding ($x = 1820$).

```typescript
// Permukaan chamber diekspor agar S1 bisa gambar jembatan air di dinding.
export function chamberSurfY(xAbs: number, gf: number, yBase = 950): number {
  const t = gf / 30;
  const omega = (2 * Math.PI) / T_MODEL; // T_MODEL = 8 / sqrt(50) = 1.13137 s
  const kPx = (2 * Math.PI) / 900;       // lambda = 900 px
  // Konvensi visual = S1: +sin = turun (y-down), fase absolut world-x
  // sehingga permukaan chamber sejajar laut S1 di dinding (x1820).
  const h1 = etaModel(xAbs, gf) * 2500;  // Amplitudo primer: 0.03m * 2500px/m = 75px
  const h2 = 0.03 * 0.4 * Math.sin(2 * kPx * xAbs - 2 * omega * t + 1.3) * 2500; // Mikro-harmonik 2nd order: 30px
  return yBase + h1 + h2;
}

// Generator SVG path profil ombak
export function wavePath(gf: number, yBase: number, x0: number, x1: number, step = 24): string {
  const pts: string[] = [];
  for (let x = x0; x <= x1; x += step) {
    const y = chamberSurfY(x, gf, yBase);
    pts.push(`${x === x0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}
```

### 1.4. Telemetri Saintifik Ledger M/D/S/I (`src/telemetry.ts`)

```typescript
// Telemetri deterministik per frame global. Semua angka dari ledger M/D/S/I.
import {ductVelocity, rpmFromV} from "./physics";

export function powerKW(gf: number): number {
  const v = ductVelocity(gf);
  return 18.4 + 11.6 * Math.abs(v); // Rentang: 18.4 kW - 30.0 kW
}

export function pressureKPa(gf: number): number {
  const v = ductVelocity(gf);
  return 3.1 + 1.6 * Math.abs(v);   // Rentang: 3.10 kPa - 4.70 kPa
}

export function rpmAt(gf: number): number {
  return rpmFromV(ductVelocity(gf)); // Rentang: 900 rpm - 1450 rpm
}

export const ETA = {
  ch: "58-65 %",  // Efisiensi hidrodinamik Chamber
  tb: "60-68 %",  // Efisiensi pneumatik-mekanik Wells Turbine
  gn: "88-92 %",  // Efisiensi generator PMSG
  tot: "35 %",    // Efisiensi sistem total ke grid
};
```

---

## 2. SISTEM KAMERA DUNIA (World Camera Rig)

Kamera mengontrol pergeseran kanvas global `6720 x 2160` ke dalam viewport `1920 x 1080` melalui fungsi proyeksi tunggal `applyCam`.

### 2.1. Implementasi Kamera (`src/world/camera.ts`)

```typescript
// Comot: BangMotion starter-explainer.html (C={x,y,z}, applyCam, into/settle/cutTo)
// + PDoom camBegin/camEnd + blueprint camera follows force path.
// Adaptasi GSAP tween -> Remotion interpolate + bezier + clamp. Murni f(frame).
import {Easing} from "remotion";

export type Cam = {x: number; y: number; z: number};

// Anchor world (world 6720x2160). GLIDE kontinu antar center konten.
// v4r9: TOTAL 2463f, S1 450f biar reveal + napas selesai sebelum transit.
export const ANCHORS: {f: number; c: Cam}[] = [
  {f: 0,    c: {x: 1015, y: 910,  z: 1.0}},
  {f: 450,  c: {x: 2330, y: 1150, z: 1.6}},
  {f: 999,  c: {x: 3480, y: 1150, z: 2.2}},
  {f: 1495, c: {x: 4380, y: 950,  z: 1.4}},
  {f: 1998, c: {x: 5930, y: 1000, z: 1.0}},
  {f: 2462, c: {x: 5930, y: 1000, z: 1.0}},
];

export const E_IN = Easing.bezier(0.7, 0, 0.84, 0);       // power2.in aproks
export const E_OUT = Easing.bezier(0.16, 1, 0.3, 1);      // APPLE out / power3.out aproks
export const E_INOUT = Easing.bezier(0.83, 0, 0.17, 1);   // power3.inOut aproks

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeSeg(t: number, kind: "in" | "out" | "inout"): number {
  if (kind === "in") return E_IN(t);
  if (kind === "out") return E_OUT(t);
  return E_INOUT(t);
}

// camAt: GLIDE kontinu. Easing in-out simetris 50/50 agar tidak berhenti lama,
// napas tipis +-3px agar hidup tapi tidak goyang. Kamera tiba di konten pas batas.
export function camAt(gf: number): Cam {
  const f = Math.max(0, Math.min(2462, gf));
  let i = 0;
  while (i < ANCHORS.length - 2 && f > ANCHORS[i + 1].f) i++;
  const a = ANCHORS[i];
  const b = ANCHORS[i + 1];
  const span = Math.max(1, b.f - a.f);
  const raw = (f - a.f) / span;
  const same = a.c.x === b.c.x && a.c.y === b.c.y && a.c.z === b.c.z;
  if (same) return {x: a.c.x, y: a.c.y, z: a.c.z};
  const t = Math.max(0, Math.min(1, easeSeg(raw, "inout")));
  const br = 2 * Math.PI * (f / (30 * 5)); // napas 5 detik, +-3px
  return {
    x: lerp(a.c.x, b.c.x, t) + 3 * Math.sin(br),
    y: lerp(a.c.y, b.c.y, t) + 2 * Math.cos(br * 0.9),
    z: lerp(a.c.z, b.c.z, t),
  };
}

// applyCam: world point -> screen. Rumus BangMotion.
export function applyCam(c: Cam): {tx: number; ty: number; s: number} {
  return {tx: 960 - c.x * c.z, ty: 540 - c.y * c.z, s: c.z};
}

// frameOn: hitung C agar titik world (wx,wy) di tengah layar dengan zoom z.
export function frameOn(wx: number, wy: number, z: number): Cam {
  return {x: wx, y: wy, z};
}

// settle window: true jika gf sudah > cutEnd + 3f (teks boleh masuk +0.1s).
export function settled(gf: number, cutEnd: number): boolean {
  return gf >= cutEnd + 3;
}

export function shotOf(gf: number): "wide" | "medium" | "close" {
  const z = camAt(gf).z;
  if (z >= 2.4) return "close";
  if (z >= 1.4) return "medium";
  return "wide";
}

// Slice helper: slice frame lokal 0-599 dipetakan ke global 750-1349.
export const SLICE_OFFSET = 750;
export const SLICE_LEN = 600;
export function sliceGlobal(lf: number): number {
  return SLICE_OFFSET + Math.max(0, Math.min(SLICE_LEN - 1, lf));
}
```

### 2.2. Rig Stage & Kanvas Dunia (`src/world/World.tsx`)

```tsx
export const WORLD_W = 6720;
export const WORLD_H = 2160;

export const World: React.FC<{gf: number}> = ({gf}) => {
  const cam = camAt(gf);
  const {tx, ty, s} = applyCam(cam);
  const ticks: number[] = [];
  for (let x = 0; x <= WORLD_W; x += 240) ticks.push(x);
  return (
    <AbsoluteFill style={{backgroundColor: C.over, overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: WORLD_W,
          height: WORLD_H,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        {/* Datum maritim: garis horizon + vertikal UTM tiap 240px */}
        <div style={{position: "absolute", left: 0, right: 0, top: 1180, height: 3, backgroundColor: C.veil, opacity: 0.7}} />
        {ticks.map((x) => (
          <div
            key={x}
            style={{position: "absolute", left: x, top: 200, width: 1, height: 1760, backgroundColor: C.veil, opacity: 0.22}}
          />
        ))}
        {/* Layer SVG 5 Zona Spasial */}
        <svg style={{position: "absolute", left: 0, top: 0}} width={WORLD_W} height={WORLD_H}>
          <S1Coast gf={gf} />
          <SectionSweep gf={gf} />
          <Piston gf={gf} />
          <DuctParticles gf={gf} />
          <WellsRotor gf={gf} />
          <HudMini gf={gf} />
          <S4Dash gf={gf} />
          <S5SLD gf={gf} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
```

---

## 3. KOORDINAT LAYOUT DAN BOUNDING BOX ZONA

Kanvas dunia terbagi menjadi 5 zona horizontal tanpa tumpang-tindih (non-overlapping).

```
0px                  1820px              2840px              3830px             5280px          6720px
|----------------------|-------------------|-------------------|-------------------|-------------------|
|      S1: PANTAI      |    S2: CHAMBER    |     S3: WELLS     |   S4: DASHBOARD   |      S5: SLD      |
|  x: 210 - 1820       |   x: 1820 - 2780  |   x: 2920 - 3690  |   x: 3830 - 4930  |   x: 5400 - 6600  |
|  Anchor: 1015, 910   | Anchor: 2330, 1150| Anchor: 3480, 1150| Anchor: 4380, 950 | Anchor: 5930, 1000|
|  Zoom: 1.0x (Wide)   |  Zoom: 1.6x (Med) | Zoom: 2.2x (Close)|  Zoom: 1.4x (Med) |  Zoom: 1.0x (Wide)|
|----------------------|-------------------|-------------------|-------------------|-------------------|
```

### Tabel Rinci Zona, Elemen, dan Bounding Box

| Zona | Nama Scene | Rentang X | Rentang Y | Komponen Kunci & Bounding Box | Anchor Kamera $(x, y, z)$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S1** | Pantai & Caisson | `210` – `1820` | `470` – `1350` | - Laut Flume: $X \in [210, 1820]$, $Y \in [\text{seaY}, 1350]$<br>- Caisson Outline: $X \in [700, 1220]$, $Y \in [700, 1250]$<br>- Dimensi CAD: $X \in [700, 1280]$, $Y \in [640, 1250]$<br>- JONSWAP Mini: $X \in [1300, 1660]$, $Y \in [470, 670]$<br>- Datum 0 Sejajar: $X \in [1680, 2020]$, $Y = 950$ | `{x: 1015, y: 910, z: 1.0}` |
| **S2** | Kolom Air (Chamber) | `1820` – `2780` | `700` – `1600` | - Dinding Caisson Kiri: $X \in [1820, 1880]$, $Y \in [700, 1600]$<br>- Dinding Caisson Kanan: $X \in [2780, 2840]$, $Y \in [700, 1600]$<br>- Kolom Air Piston: $X \in [1880, 2780]$, $Y \in [\text{surfY}, 1600]$<br>- Vektor Exhale/Inhale: Center $X = 2330$, $Y \approx 1000 \pm 180$<br>- Section A-A Sweep: $X \in [1880, 2780]$ (Frame 450–998) | `{x: 2330, y: 1150, z: 1.6}` |
| **S3** | Rotor Wells & Saluran | `2780` – `3780` | `700` – `1492` | - Saluran Duct: $X \in [2780, 3270]$, $Y \in [1060, 1140]$<br>- Casing & Bilah Rotor: Center $(3480, 1100)$, $R_{outer} = 210$, $R_{trail} = 180$, $R_{inner} = 150$<br>- 6 Bilah Aerofoil: Sudut $0^\circ, 60^\circ, 120^\circ, 180^\circ, 240^\circ, 300^\circ$<br>- HUD Mini Backing: $X \in [3210, 3770]$, $Y \in [1372, 1492]$ | `{x: 3480, y: 1150, z: 2.2}` |
| **S4** | Dashboard Elektrik | `3830` – `4930` | `650` – `1250` | - Bento Box Panel: $X \in [3830, 4930]$, $Y \in [650, 1250]$ ($W=1100, H=600$)<br>- Kolom 1 (Daya Duct): $X \in [3870, 4196]$<br>- Kolom 2 (Riwayat 4s): $X \in [4236, 4563]$<br>- Kolom 3 (Speedometer Rotor): $X \in [4603, 4890]$ | `{x: 4380, y: 950, z: 1.4}` |
| **S5** | SLD & Title Block | `5280` – `6580` | `750` – `1250` | - Bus Transmisi: $X \in [5300, 6560]$, $Y = 750$<br>- 4 Node SLD: WELLS (5400), PMSG (5700), INV (6000), GRID (6350) @ $Y \in [850, 960]$<br>- Node BESS: $X \in [5910, 6090]$, $Y \in [990, 1060]$<br>- ISO Title Block: $X \in [5280, 6580]$, $Y \in [1090, 1250]$ ($W=1300, H=160$)<br>- Stamp ACC Merah: Center $(6350, 1180)$, Rotasi $-12^\circ$ (Frame > 2307) | `{x: 5930, y: 1000, z: 1.0}` |

---

## 4. TIPOGRAFI, GAYA CAPTION, DAN TOKEN TEMA

### 4.1. Token Warna dan Konfigurasi Tema (`src/theme.ts`)

```typescript
// Kanon Blueprint Pesisir. Satu-satunya sumber token warna.
export const C = {
  bg: "#0B253A",      // Background biru tua pekat
  fg: "#EAF2F8",      // Teks utama / garis CAD putih terang
  acc: "#B84A39",     // Aksen kinetik terakota / stamp ACC
  och: "#D1B894",     // Oker / pasir / bilah rotor / BESS
  veil: "#8FA9B5",    // Biru redup untuk grid / dimensi / label sekunder
  over: "#061521",    // Latar bento box / panel instrumen (overlay pekat)
  water: "#103A5A",   // Badan air laut dalam
  water2: "#175078",  // Refleksi / gelombang sekunder
} as const;

export const SAFE = 96;
export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const FONT_TITLE = "Barlow Semi Condensed, 'DejaVu Sans', sans-serif";
export const FONT_BODY = "'Space Grotesk', 'DejaVu Sans', sans-serif";
export const FONT_MONO = "'Space Mono', 'DejaVu Sans Mono', monospace";

export const expoOut = (t: number): number =>
  t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
```

### 4.2. Matriks 5 Gaya Caption Per Zona (`src/world/Film.tsx`)

Setiap zona memiliki gaya penempatan dan layout caption berbeda di screen space, disesuaikan agar tidak menutupi fokus geometri (anti-collision):

```typescript
type Cap = {
  from: number; 
  exit: number; 
  kicker: string; 
  title: string; 
  sub: string;
  val?: number; 
  unit?: string; 
  style: "bl" | "tr" | "bc" | "tl" | "strip";
};

const CAPS: {range: [number, number]; cap: Cap}[] = [
  {
    range: [0, 449], 
    cap: {
      from: 20, 
      exit: 420, 
      kicker: "NOTE 01 UJI MODEL FISIK", 
      title: "Ombak pecah, caisson menahan", 
      sub: "Model fisik 1:50 di wave flume", 
      style: "bl"
    }
  },
  {
    range: [450, 998], 
    cap: {
      from: 460, 
      exit: 967, 
      kicker: "KOLOM AIR", 
      title: "Kolom air memompa udara", 
      sub: "Periode model 1.13 detik", 
      val: 30, 
      unit: "kW daya duct", 
      style: "tr"
    }
  },
  {
    range: [999, 1494], 
    cap: {
      from: 1009, 
      exit: 1457, 
      kicker: "ROTOR WELLS", 
      title: "Rotor putar dua arah angin", 
      sub: "Gaya dorong searah dua sisi", 
      val: 1450, 
      unit: "rpm puncak", 
      style: "bc"
    }
  },
  {
    range: [1495, 1997], 
    cap: {
      from: 1505, 
      exit: 1967, 
      kicker: "GENERATOR PMSG", 
      title: "Putaran jadi listrik", 
      sub: "Tegangan stabil di osiloskop", 
      val: 30, 
      unit: "kW ke inverter", 
      style: "tl"
    }
  },
  {
    range: [1998, 2462], 
    cap: {
      from: 2008, 
      exit: 2427, 
      kicker: "GRID PANTAI ETA 35%", 
      title: "Daya mengalir ke grid pantai", 
      sub: "Hasil uji model fisik", 
      style: "strip"
    }
  },
];
```

#### Spesifikasi Detail Layout Tiap Gaya:
1. **Gaya `"bl"` (S1 - Drawing Note Kiri-Atas):**
   - Posisi: `left: 120px`, `top: 120px`, `maxWidth: 860px`.
   - Border: `borderLeft: 6px solid #B84A39`.
   - Latar: `rgba(6,21,33,0.72)`.
   - Alasan: Konten visual S1 berada di $Y \in [470, 1350]$, sehingga area kiri-atas adalah ruang langit kosong.
2. **Gaya `"tr"` (S2 - Rail Kanan-Atas):**
   - Posisi: `right: 120px`, `top: 120px`, `maxWidth: 760px`.
   - Border: `borderRight: 6px solid #B84A39`, `textAlign: right`.
   - Alasan: Chamber berada di $Y \in [700, 1600]$, penempatan kanan-atas menghindari tabrakan dengan kolom air piston.
3. **Gaya `"bc"` (S3 - Strip Kompak Tengah-Atas):**
   - Posisi: `left: 50%`, `top: 120px`, `maxWidth: 1000px`, `transform: translateX(-50%)`.
   - Border: Tidak ada border samping, padding ramping `14px 28px`.
   - Alasan: Rotor Wells berada di $Y \in [890, 1310]$ dan HUD mini di $Y \in [1372, 1492]$, area atas adalah area terbersih.
4. **Gaya `"tl"` (S4 - Kartu Kompak Kanan-Bawah):**
   - Posisi: `right: 120px`, `bottom: 120px`, `maxWidth: 760px`.
   - Border: `borderRight: 6px solid #B84A39`, `textAlign: right`.
   - Alasan: Dashboard osiloskop dan grafik memenuhi area tengah-atas.
5. **Gaya `"strip"` (S5 - Title-Block Kompak Tengah-Bawah):**
   - Posisi: `left: 50%`, `bottom: 96px`, `maxWidth: 860px`, `transform: translateX(-50%)`.
   - Border: `borderTop: 6px solid #B84A39`, `textAlign: center`.
   - Alasan: Title block CAD berada di atas ($Y \in [1090, 1250]$), kartu caption berada di zona margin aman bawah.

### 4.3. Primitif Animasi Tipografi (`src/components/prim.tsx`)

- **WordReveal & MaskUp:** Kinetic typography dengan stagger 3 frame per kata (`dur = 14`, easing `E_APPLE`).
- **Counter:** Animated spring counter untuk nilai numerik (`damping: 30`, `stiffness: 60`, `fontVariantNumeric: tabular-nums`).
- **Seeded RNG:** `mulberry32` deterministik untuk grain visual dan sebaran partikel.

---

## 5. INVENTORI ASET SVG (Files & Procedural SVGs)

### 5.1. File Aset Eksternal (`public/assets/turbines/`)

| Path File | Ukuran / ViewBox | Deskripsi & Peran dalam Blueprint | Referensi Kode |
| :--- | :--- | :--- | :--- |
| `public/assets/turbines/wells_turbine_rotor_en.svg` | `422.97 x 476.78` | Skematik CAD vektor rotor turbin Wells lengkap dengan hub, sudu aerofoil simetris, dan panah gaya angkat tangensial $F_t$. | Sebagai referensi geometri rotor sudu simetris di S3. |
| `public/assets/turbines/naca0015_airfoil.svg` | `1600 x 1200` | Profil aerofoil simetris NACA 0015 standar untuk profil sudu turbin Wells yang tidak terpengaruh arah aliran udara bolak-balik. | Referensi cross-section sudu simetris (chord line & camber 0). |
| `public/assets/turbines/naca0015_interpolation_plot.svg` | `1080 x 720 pt` | Kurva polar aerodinamika interpolasi Matplotlib: $C_L$ (Lift) dan $C_D$ (Drag) vs Angle of Attack ($\alpha$). | Referensi data polar karakteristik stall sudu turbin. |

### 5.2. Komponen SVG Prosedural Inline (Murni Kode Vektor)

1. **`S1Coast` (`src/world/Film.tsx`):**
   - Garis pantai evolusioner ($L = 2300$ dengan `strokeDashoffset`).
   - Kontur laut flume menyambung ke dinding caisson ($x = 1820$).
   - Pola arsir dasar flume `hatch45-s1` (rotasi $45^\circ$).
   - Indikator kurva spektrum `JONSWAP Hs3 Tp8` dengan titik energi bergerak.
2. **`Piston` & `DuctParticles` (`src/world/Slice.tsx`):**
   - Badan air dinamis dual-harmonik `wavePath`.
   - Garis gema kedalaman air (`yBase + 30`).
   - Gelembung buih dinding pada kontak caisson ($r=6\text{px}, 4\text{px}$).
   - Pola arsir beton caisson `hatch45` ($18\times 18$ px, rotasi $45^\circ$).
   - Vektor aliran udara duct (panah aksen terakota `#B84A39` / oker `#D1B894` mengikuti arah $v$).
   - 26 partikel udara deterministik `DuctParticles` (kecepatan $sp \cdot |v|$) + 6 semburan *exhale puff*.
3. **`WellsRotor` & `HudMini` (`src/world/Slice.tsx`):**
   - 6 sudu turbin simetris dengan vektor gaya dorong tangensial $F_t$.
   - Cincin jejak putaran (*trail ring*) dengan `strokeDasharray="60 200"` berputar searah jarum jam (CW).
   - Plat instrumen HUD Mini berisi pembacaan $P$ (kW), $p$ (kPa), dan $n$ (rpm).
4. **`S4Dash` (`src/world/Film.tsx`):**
   - Bento box instrumen 3 kolom ($W=1100, H=600$).
   - Osiloskop real-time daya instan (40 titik kurva sinus adaptif).
   - Grafik riwayat tekanan 4 detik (40 titik lookup $p(t)$).
   - Speedometer gauge rotor Wells ($Arc\ 90^\circ$ dengan jarum penunjuk).
5. **`S5SLD` (`src/world/Film.tsx`):**
   - Single Line Diagram transmisi busbar dengan elektron berdenyut `strokeDashoffset`.
   - Node blok: WELLS, PMSG, INV, GRID, dan BESS.
   - ISO Title Block resmi teknik: "PLTO-OWC SKALA 1:50", "SHEET 01/01", "ETA TOTAL 35%".
   - Cap stempel ACC terakota berotasi $-12^\circ$ (muncul pada frame > 2307).

---

## 6. INVENTORI AUDIO & TIMELINE MAPPING

### 6.1. Metadata File Audio (`ffprobe`)

| File Audio | Kategori | Durasi (detik) | Durasi (Frame @30fps) | Sample Rate | Saluran | Bitrate | Format |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public/audio/vo/scene_1.mp3` | Voice Over S1 | `11.088 s` | `332.64 f` | 24,000 Hz | 1 (Mono) | 48 kbps | MP3 |
| `public/audio/vo/scene_2.mp3` | Voice Over S2 | `16.944 s` | `508.32 f` | 24,000 Hz | 1 (Mono) | 48 kbps | MP3 |
| `public/audio/vo/scene_3.mp3` | Voice Over S3 | `15.168 s` | `455.04 f` | 24,000 Hz | 1 (Mono) | 48 kbps | MP3 |
| `public/audio/vo/scene_4.mp3` | Voice Over S4 | `15.408 s` | `462.24 f` | 24,000 Hz | 1 (Mono) | 48 kbps | MP3 |
| `public/audio/vo/scene_5.mp3` | Voice Over S5 | `14.160 s` | `424.80 f` | 24,000 Hz | 1 (Mono) | 48 kbps | MP3 |
| `public/audio/sfx/ocean.mp3` | Ambiens Ombak | `90.024 s` | `2700.72 f` | 48,000 Hz | 1 (Mono) | 64 kbps | MP3 |
| `public/audio/sfx/hiss.mp3` | SFX Desis Udara | `90.024 s` | `2700.72 f` | 48,000 Hz | 1 (Mono) | 64 kbps | MP3 |

*Total durasi narasi bersih (VO net): $72.768\text{ s}$.*

### 6.2. Timeline & Pemetaan Sequence (`src/timeline.ts` & `src/Root.tsx`)

Total timeline film V4 adalah **2463 frame (82.10 detik)** pada 30 FPS.

```typescript
// Timeline kanon v4r8: durasi scene = VO + padding (S1 napas 117f, lain 40f).
// TOTAL 2463f = 82.10s. S1 450f biar reveal selesai + napas.
export const FPS = 30;
export const TOTAL = 2463;

export const S1 = {from: 0,    len: 450}; // Frame 0 - 449 (15.00 s)
export const S2 = {from: 450,  len: 549}; // Frame 450 - 998 (18.30 s)
export const S3 = {from: 999,  len: 496}; // Frame 999 - 1494 (16.53 s)
export const S4 = {from: 1495, len: 503}; // Frame 1495 - 1997 (16.77 s)
export const S5 = {from: 1998, len: 465}; // Frame 1998 - 2462 (15.50 s)

// Pemetaan Audio Sequence di src/Root.tsx
export const VO = [
  "scene_1.mp3", 
  "scene_2.mp3", 
  "scene_3.mp3", 
  "scene_4.mp3", 
  "scene_5.mp3"
];
export const VOFROM = [10, 460, 1009, 1505, 2008]; // Offset masuk VO (delay 10f pasca transisi kamera)
export const VOLEN  = [450, 549, 496, 503, 465];  // Durasi Sequence per scene
```

---

## 7. ATURAN ANTI-SLOP (Anti-Slop Hard Gates)

Sistem V4 menerapkan 12 hard gates kualitas tinggi yang harus dipatuhi secara ketat saat porting ke HyperFrames:

1. **Larangan Non-Determinisme di Render Loop:**
   - DILARANG menggunakan `Math.random()` tanpa seeded PRNG. Gunakan fungsi `mulberry32(seed)` deterministik.
   - DILARANG menggunakan `Date.now()` atau `performance.now()` di dalam fungsi render.
2. **Larangan Animasi CSS Tidak Terkendali:**
   - DILARANG menggunakan CSS `@keyframes` dan CSS `transition` di dalam layer render. Semua animasi wajib digerakkan oleh *frame clock* / interpolasi murni berbasis waktu $t$.
3. **Larangan Struktur Slide Deck (Fade Antar Scene):**
   - DILARANG menggunakan transisi fade-in/fade-out sederhana antar 5 scene terpisah.
   - Wajib menggunakan **satu kanvas World terpadu** di mana kamera bergerak secara kontinu (*continuous camera glide*) melintasi zona koordinat dunia nyata.
4. **Larangan Transisi Buatan (Artificial / Preset Transitions):**
   - DILARANG menggunakan *zoom punch*, *radial blur*, *spin transitions*, atau *screen wipe* sintetis yang tidak memiliki landasan geometri.
   - *Continuous Glide* kamera wajib menjaga titik pivot di tengah viewport (`applyCam` yang presisi), tanpa distorsi zoom kiri-atas.
5. **Aturan Muncul Setelah Kamera Diam (*After-Settle Rule*):**
   - Teks, kartu keterangan, dan label numerik **HANYA boleh muncul setelah kamera selesai bergerak** (minimal $+0.1\text{s}$ atau $+3\text{ frame}$ setelah posisi kamera tenang di target / *settle*).
6. **Larangan Elemen Debug / Label Teknis Palsu:**
   - DILARANG menampilkan label debug buatan seperti "FIG 1", bounding box sembarangan, atau garis bantu kamera internal yang tidak memberikan nilai informasi kepada penonton.
7. **Larangan Konteks Kampus / Non-Saintifik Overclaim:**
   - DILARANG mencantumkan teks promosi kampus, klaim biaya/harga komersial, atau metrik tenaga kerja yang tidak diverifikasi.
   - Semua angka di layar wajib bersumber langsung dari **Claim Ledger M/D/S/I** ($P = 18.4 - 30\text{ kW}$, $p = 3.1 - 4.7\text{ kPa}$, $n = 900 - 1450\text{ rpm}$, Skala $1:50$, $\eta_{tot} = 35\%$).
8. **Disiplin Hirarki Tipografi & Aksesibilitas:**
   - Maksimal 2 level teks per kartu/blok (Judul + Subtitle/Angka).
   - Teks judul: $40 - 60\text{ px}$, Subtitle/Monospace: $22 - 28\text{ px}$, Safe Margin: $96\text{ px}$.
   - Semua angka dinamis wajib menggunakan `font-variant-numeric: tabular-nums` untuk mencegah pergeseran layout (*layout shifting*).
   - Warna aksen terakota (`#B84A39`) hanya digunakan untuk entitas kinetik bergerak aktif, vektor gaya, dan stempel verifikasi.

---

## 8. POINTER REPOSITORI STEAL-BANK (HyperFrames Ready)

Daftar pustaka dan repositori pola animasi terbaik yang telah terbukti dan siap diintegrasikan ke dalam runtime HyperFrames (HTML + Canvas/SVG + GSAP):

### 1. BangMotion World Rig
- **URL:** [https://github.com/bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) (MIT License, ⭐536)
- **Aset Kunci:** `assets/starter-explainer.html`
- **Pola yang Diambil:** Arsitektur rig `#stage > #world`, rumus proyeksi kamera $C = \{x, y, z\}$ dengan transformasi `translate(960 - C.x * C.z, 540 - C.y * C.z) scale(C.z)`, protokol `into()` / `settle()` / `cutTo()`, dan filosofi *anti-slide deck*.

### 2. NightZpy Explanatory Animations Skill (Piston F-K-H-P)
- **URL:** [https://github.com/NightZpy/explanatory-animations-skill](https://github.com/NightZpy/explanatory-animations-skill) (MIT License)
- **Aset Kunci:** `plugin/skills/animate/patterns/` (`K-cross-section.md`, `F-mechanical.md`, `H-particle-flow.md`, `P-line-drawing.md`)
- **Pola yang Diambil:**
  - **F (Mechanical):** Sinkronisasi gerak harmonik translasi fluida dengan rotasi turbin.
  - **K (Cross-Section):** Pemotongan struktural chamber dan penahanan batas fluida.
  - **H (Particle Flow):** *Staggered injection* partikel udara dua arah dengan variasi massa dan kecepatan.
  - **P (Line Drawing):** *Stroke-dashoffset blueprint reveal* bertahap pada garis kontur pantai dan dinding teknis.

### 3. Claude Motion Studio & Digbenjamins Primitives
- **URL:** [https://github.com/haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) (MIT License, ⭐216)
- **URL:** [https://github.com/digbenjamins/remotion-animation](https://github.com/digbenjamins/remotion-animation) (MIT License)
- **Aset Kunci:** `remotion-motion-graphics/SKILL.md`, `src/anim/FadeUp.tsx`, `src/theme.ts`
- **Pola yang Diambil:**
  - Rumus kurva Bézier Apple/Smooth: `cubic-bezier(0.16, 1, 0.3, 1)` untuk entrance dan `cubic-bezier(0.7, 0, 0.84, 0)` untuk exit.
  - Aturan *multivariate entrance* (kombinasi simultan `translateY`, `scale`, dan `opacity`).
  - Stagger teks per kata $3\text{ frame}$, stagger kartu $4-5\text{ frame}$, dan exit $2\times$ lebih cepat daripada entrance.

### 4. Lemo-Opuscar Blueprint Style
- **URL:** [https://github.com/lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (HEAD `81e8903`)
- **Aset Kunci:** `styles/blueprint/STYLE.md`, `styles/blueprint/demo/`
- **Pola yang Diambil:**
  - Urutan *drafting blueprint*: Centre line $\rightarrow$ Outlines $\rightarrow$ Hatching (arsir $45^\circ$) $\rightarrow$ Dimensions $\rightarrow$ Balloons $\rightarrow$ Title Block.
  - *Single red accent rule*: Warna merah/terakota hanya muncul pada momen puncak/verifikasi stempel ACC.
  - Backing plate semi-transparan `rgba(6, 21, 33, 0.72)` di atas elemen air bergerak untuk keterbacaan kontras $\ge 4.5:1$.

### 5. Motion Canvas Signals & Telemetry HUD
- **URL:** [https://github.com/motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) (MIT License, ⭐19.1k)
- **Aset Kunci:** `packages/core/src/signals/`
- **Pola yang Diambil:** Konsep sinyal telemetri reaktif di mana komponen jarum dial, kurva osiloskop, dan angka telemetri diturunkan secara mulus dari fungsi sinyal status terpusat ($v, P, p, n$).

---

*File ekstraksi ini dibuat secara otomatis dan diverifikasi langsung terhadap kode sumber branch `feat/rebuild-v4-world`.*
