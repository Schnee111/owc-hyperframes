# HyperFrames Animation & Motion Patterns (HF-ANIM)
**Authoritative Reference for Ocean Wave Chamber (OWC) & Technical Video Systems**

Dokumen ini menyajikan riset mendalam mengenai pola animasi, prinsip determinisme, arsitektur GSAP timeline, transisi, data visualization, dan camera rig di HyperFrames (HTML5 + GSAP runtime), dirancang khusus untuk migrasi dan pembangunan ulang proyek video teknik **Ocean Wave Chamber (OWC)** (Pantai → Caisson Ruang Udara Gelombang → Piston Kolom Air → Turbin Wells Bolak-Balik → Generator PMSG → Single Line Diagram Listrik).

---

## Daftar Isi
1. [GSAP di HyperFrames: Pola Timeline Seek-Safe & Determinisme](#1-gsap-di-hyperframes-pola-timeline-seek-safe--determinisme)
2. [Pola Animasi SVG Kontinu & Fisika Fluida / Mekanikal](#2-pola-animasi-svg-kontinu--fisika-fluida--mekanikal)
3. [Transisi Antar Scene (Scene Transitions & Continuity)](#3-transisi-antar-scene-scene-transitions--continuity)
4. [Text Animation, Kinetic Typography & Lower Thirds](#4-text-animation-kinetic-typography--lower-thirds)
5. [Data Visualization: Hero Counters & Dynamic Charts](#5-data-visualization-hero-counters--dynamic-charts)
6. [Camera Rig: Continuous World-Camera, Dolly & Parallax](#6-camera-rig-continuous-world-camera-dolly--parallax)
7. [Kesalahan Animasi Umum & Lint Hazards Pemutus Seek](#7-kesalahan-animasi-umum--lint-hazards-pemutus-seek)
8. [Best Practice Arsitektur GSAP Timeline Per Komposisi](#8-best-practice-arsitektur-gsap-timeline-per-komposisi)
9. [Migration Mapping: Remotion (React) ke HyperFrames (HTML + GSAP)](#9-migration-mapping-remotion-react-ke-hyperframes-html--gsap)

---

## 1. GSAP di HyperFrames: Pola Timeline Seek-Safe & Determinisme

> **Dokumentasi Terkait:**
> - [Animate with GSAP](https://hyperframes.heygen.com/guides/gsap-animation.md)
> - [Deterministic Rendering](https://hyperframes.heygen.com/concepts/determinism.md)
> - [Rules and Anti-Patterns](https://hyperframes.heygen.com/prompting/rules-and-anti-patterns.md)
> - [Frame Adapters](https://hyperframes.heygen.com/concepts/frame-adapters.md)

### 1.1. Filosofi Engine & Playhead HyperFrames
HyperFrames **tidak pernah memutar video secara real-time** saat proses rendering. Engine HyperFrames memperlakukan waktu sebagai fungsi diskrit:
$$\text{time} = \frac{\lfloor\text{frame}\rfloor}{\text{fps}}$$
Renderer meminta frame per frame secara acak atau non-linier (terutama pada arsitektur distributed rendering multi-worker), memanggil `adapter.seekFrame(N)` yang melompat langsung ke detik $t$, lalu mengambil snapshot piksel canvas/DOM.

```
+-------------------------------------------------------------------------+
|                           HYPERFRAMES ENGINE                            |
|  Frame Clock: t = frame / fps  (Integer math, no wall clock/Date.now)   |
+-------------------------------------------------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  seekFrame(frame) -> t (seconds)  |
                  +-----------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  GSAP TIMELINE (Paused, Registered)                     |
|  window.__timelines[compositionId].seek(t, true)                        |
|  - Deterministic state at exact t                                       |
|  - No lagSmoothing, no unseeded random, no dynamic DOM geometry read   |
+-------------------------------------------------------------------------+
```

### 1.2. Minimal Contract & Registrasi Timeline
Setiap komposisi HTML yang memiliki animasi GSAP wajib memenuhi kontrak:
1. Root container mendefinisikan `id`, `data-composition-id`, dan `data-duration` (durasi output render dalam detik).
2. Timeline GSAP dibuat dengan konfigurasi `{ paused: true }`.
3. Timeline didaftarkan secara sinkron ke objek global `window.__timelines[compositionId]`.
4. Elemen visual yang memiliki durasi dan visibilitas waktu diberi `class="clip"`, `data-start`, `data-duration`, dan `data-track-index`.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    #stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #0b0f19; }
    .clip { position: absolute; inset: 0; }
  </style>
</head>
<body>
  <div id="stage" data-composition-id="owc-chamber" data-duration="10" data-width="1920" data-height="1080" data-fps="30">
    <div id="water-column" class="clip" data-start="0" data-duration="10" data-track-index="0">
      <!-- SVG Caisson & Piston Kolom Air -->
    </div>
  </div>

  <script>
    // 1. Inisialisasi Timeline PAUSED (Wajib)
    const tl = gsap.timeline({ paused: true });

    // 2. Definisi Animasi Seek-Safe (fromTo untuk kepastian dua endpoint)
    tl.fromTo("#water-column", 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }, 
      0
    );

    // 3. Registrasi Timeline ke Global Window (Wajib)
    window.__timelines = window.__timelines || {};
    window.__timelines["owc-chamber"] = tl;
  </script>
</body>
</html>
```

### 1.3. Larangan GSAP & Hazard Penentu Determinisme

| Hazard / Larangan | Mengapa Dilarang oleh Docs | Solusi & Pola Valid |
| :--- | :--- | :--- |
| **`Date.now()` / `requestAnimationFrame`** | Bergantung pada wall-clock fisik; frame clock render adalah diskrit (`t = frame/fps`). | Gunakan GSAP position parameter atau kuantisasi integer frame index. |
| **Unseeded `Math.random()`** | Menghasilkan nilai berbeda pada setiap run / worker chunk. | Gunakan seeded PRNG (seperti `mulberry32`) yang di-seed sekali di awal script. |
| **Asynchronous Setup** (`async/await` / `fetch` saat inisialisasi tl) | Renderer mencari `window.__timelines` saat event `DOMContentLoaded` selesai; async setup menyebabkan timeout (`player-ready-timeout`). | Setup timeline wajib **100% synchronous**. Asset/data harus di-embed inline atau via `data-composition-variables`. |
| **Relative Tweens with Multi-writers** (`+=50`, `-=20`) | Capture base value saat tween init; worker cold-seek non-linear meng-init pada posisi berbeda dengan live preview. | Gunakan nilai absolut eksplisit (`x: 400`, bukan `x: "+=200"`), atau `fromTo()`. |
| **`repeatRefresh: true` + Relative Values** | Offset terakumulasi per iterasi loop; render worker yang melompat ke iterasi 5 tidak mengeksekusi iterasi 1–4. | Gunakan absolute boundary (`fromTo`) atau hitung modulo posisi secara deterministik. |
| **`tl.set()` di Posisi 0 untuk Initial Hide** | Zero-duration `.set()` tepat di frame 0 sering kali belum dieksekusi saat frame 0 di-render worker. | Lakukan `gsap.set(...)` di luar timeline, atau deklarasikan `opacity: 0;` langsung di CSS/HTML inline. |
| **`fromTo()` Back-render Hazard (`immediateRender`)** | `fromTo` secara default memiliki `immediateRender: true`, merender start state di frame 0 meskipun tween dijadwalkan di detik 5. | Gunakan `lazy: true`, `immediateRender: false`, atau `to()` dengan keyframes, atau `.set()` pada cue boundary. |
| **DOM Measurement di Callback** (`getBoundingClientRect()`, `getTotalLength()`) | Callback timeline dijalankan ulang pada setiap seek; urutan seek acak memberikan ukuran DOM yang tidak konsisten. | Hitung semua geometri (panjang path SVG, koordinat elemen) sekali di awal (build-time). |

---

## 2. Pola Animasi SVG Kontinu & Fisika Fluida / Mekanikal

> **Dokumentasi Terkait:**
> - [Rules and Anti-patterns — SVG Draw-on](https://hyperframes.heygen.com/prompting/rules-and-anti-patterns.md#svg-draw-on)
> - [Motion that reads premium — Rule 1 & Rule 8](https://hyperframes.heygen.com/prompting/motion.md)

Pada proyek visualisasi teknik OWC, terdapat elemen kontinu:
1. **Gelombang laut sinus luar (Ocean Incident Wave)**.
2. **Piston kolom air di dalam caisson (Oscillating Water Column)** yang naik-turun $y(t) = Y_0 \sin(\omega t)$.
3. **Turbin Wells** yang berputar kontinu searah jarum jam (CW) terlepas dari arah aliran udara bolak-balik (inhalation/exhalation).
4. **Aliran udara bolak-balik (Bidirectional Airflow Arrows)**.

### 2.1. Kenapa `repeat: -1` Relatif Dilarang
Menggunakan `gsap.to(el, { rotation: "+=360", repeat: -1 })` sangat berbahaya untuk cold seeking karena GSAP tidak dapat menentukan rotasi absolut pada detik ke-$t$ secara independen jika menggunakan offset relatif berulang.

### 2.2. Pola Terpilih: Finite Time-Scaled Deterministic Tween
Untuk durasi scene $D$ (misal 10 detik):
- Hitung total putaran yang diinginkan: $\text{rotations} = \text{speed}(\text{rps}) \times D$.
- Animasikan rotasi dari $0^\circ$ ke $360 \times \text{rotations}^\circ$ dengan `ease: "none"`.
- Jika renderer melakukan seek ke detik 3.5, sudut rotasi langsung terhitung secara eksak: $\theta(t) = \frac{t}{D} \times \theta_{\text{total}}$.

```javascript
// --- Rotor Turbin Wells (Continuous CW Rotation) ---
const sceneDuration = 10; // Detik (sesuai data-duration)
const rps = 2;            // 2 putaran per detik (120 RPM)
const totalDegrees = 360 * rps * sceneDuration; // 7200 derajat

tl.fromTo("#wells-rotor", 
  { rotation: 0, transformOrigin: "50% 50%" }, 
  { rotation: totalDegrees, duration: sceneDuration, ease: "none" }, 
  0 // Mulai pada detik 0
);
```

### 2.3. Pola Gelombang Sinus SVG & Piston Kolom Air (Sinusoidal Motion)
Untuk osilasi piston kolom air di dalam caisson OWC:
- Gunakan interpolasi harmonik dengan `ease: "sine.inOut"` atau `CustomEase` sinusoidal bertahap.
- Alternatif SVG Path Morphing / Dynamic Wave Path: Update path `d` attribute menggunakan objek proxy dan `onUpdate` berbasis waktu timeline.

```javascript
// --- Piston Kolom Air Caisson (Harmonic Oscillation) ---
// Periode gelombang = 4 detik (2s naik / kompresi, 2s turun / ekspansi)
const waveTimeline = gsap.timeline();
const wavePeriod = 4.0;
const waveCycles = Math.ceil(sceneDuration / wavePeriod);

for (let i = 0; i < waveCycles; i++) {
  const tStart = i * wavePeriod;
  // Piston naik (Inhalation -> Kompresi Udara -> Airflow Upward)
  waveTimeline.fromTo("#water-surface", 
    { y: 60 }, 
    { y: -60, duration: wavePeriod / 2, ease: "sine.inOut" }
  );
  // Piston turun (Exhalation -> Dekompresi Udara -> Airflow Downward)
  waveTimeline.to("#water-surface", 
    { y: 60, duration: wavePeriod / 2, ease: "sine.inOut" }
  );
}
// Masukkan sub-timeline osilasi ke master timeline
tl.add(waveTimeline, 0);
```

### 2.4. Rules Wajib SVG Stroke & Path Draw-on di HyperFrames
Berdasarkan lint rules resmi HyperFrames:
1. **`svg_measure_before_path_d`**: Path SVG harus memiliki atribut `d` statis di HTML sebelum JavaScript memanggil `path.getTotalLength()`. Mengisi `d` via async script akan menghasilkan panjang 0 di browser headless.
2. **`svg_drawon_css_dasharray_conflict`**: Jangan memberikan CSS `stroke-dasharray` pada elemen SVG yang dashoffset-nya dianimasikan GSAP.
3. **`stroke-linecap: round` Hazard**: Round cap menggambar titik terlihat pada frame 0 meskipun dashoffset sama dengan dashlength. Sembunyikan opacity group (`opacity: 0`) hingga waktu mulai animasi gambar garis.

---

## 3. Transisi Antar Scene (Scene Transitions & Continuity)

> **Dokumentasi Terkait:**
> - [Transitions](https://hyperframes.heygen.com/prompting/transitions.md)
> - [@hyperframes/shader-transitions](https://hyperframes.heygen.com/packages/shader-transitions.md)
> - [Motion — Continuous world-camera](https://hyperframes.heygen.com/prompting/motion.md#one-method-a-continuous-world-camera)

### 3.1. Tiga Metode Transisi di HyperFrames

```
+-------------------------------------------------------------------------------------------------+
|                                    TRANSITION ARSENAL                                           |
+------------------------------------+--------------------------------+---------------------------+
| 1. CONTINUOUS WORLD-CAMERA         | 2. SHADER TRANSITIONS          | 3. CSS / GSAP CONTAINER   |
| (Push-Through / Dolly Pan)         | (@hyperframes/shader-trans)    | (Transforms & Clip-Path)  |
| - Tanpa cut, 1 koordinat canvas    | - WebGL GPU pixel shaders      | - Ringan, presisi layout  |
| - Mempertahankan relasi spasial    | - Handoff hero / topic pivots  | - Dissolve, push, wipe    |
| - REKOMENDASI UTAMA FILM TEKNIK    | - cross-warp-morph, sdf-iris   | - transitions-push/cover  |
+------------------------------------+--------------------------------+---------------------------+
```

### 3.2. Perbandingan Karakteristik Transisi

| Jenis Transisi | Paket / Implementasi | Karakter & Mood | Rekomendasi untuk Film Teknik OWC |
| :--- | :--- | :--- | :--- |
| **Continuous Camera Dolly** | GSAP x/y/scale pada `#world-canvas` | Presisi arsitektural, kontinuitas aliran energi fisik | **SANGAT DIREKOMENDASIKAN (Primary)**: Aliran pantai → caisson → turbin → generator → SLD. |
| **`cross-warp-morph`** | `@hyperframes/shader-transitions` | Calm, smooth, WebGL GPU morph | Cocok untuk transisi makro (Intro Pantai → Cutaway Caisson). |
| **`sdf-iris`** | `@hyperframes/shader-transitions` | Push-through circular reveal | Cocok untuk zoom-in ke ruang internal turbin Wells. |
| **`transitions-push` / `cover`** | CSS clip-path / GSAP transform | Medium energy, directional, clean | Cocok untuk perpindahan slide diagram SLD listrik. |
| **`glitch` / `ridged-burn`** | `@hyperframes/shader-transitions` | High energy, chaotic, agresif | **TIDAK DIREKOMENDASIKAN** untuk film teknik edukatif/akademik. |

### 3.3. Mengapa Continuous Camera (World Dolly) Paling Alami untuk Video OWC
Sesuai **Rule 2 (The camera is an actor)** pada panduan HyperFrames:
> *"A move is what carries the spatial relationship between two shots. A cut or a cross-fade throws that away, so two views of one system read as two unrelated pictures."*

Dalam sistem konversi energi gelombang OWC, energi berpindah dari fluida hidrolik (air laut) → pneumatik (udara bertekanan) → mekanik putar (turbin Wells) → elektromagnetik (PMSG) → listrik grid (SLD). Menggunakan kamera kontinu yang meluncur (*dolly-pan*) dari kiri ke kanan menelusuri konversi energi ini membuat penonton secara intuitif memahami rantai daya tanpa terdistraksi cut buatan.

---

## 4. Text Animation, Kinetic Typography & Lower Thirds

> **Dokumentasi Terkait:**
> - [Caption Styles & Typography](https://hyperframes.heygen.com/prompting/captions-catalog.md)
> - [Overlays and Lower Thirds](https://hyperframes.heygen.com/prompting/overlays-and-lower-thirds.md)

### 4.1. WordReveal & Stagger Timing Rules
Untuk kinetic text, judul bagian, dan voiceover-synced callouts:
- **Aturan Stagger (Rule 3)**: Selalu gunakan stagger offset yang lebih pendek dari durasi animasi per kata (rasio fluid: offset `0.06s - 0.12s`, durasi `0.4s - 0.6s`).
- **Ease Selection**: Masuk dengan `power3.out` atau `back.out(1.2)` untuk teks berbobot.
- **SplitText / Span-based Word Wrap**: Bungkus setiap kata dalam `<span class="word">` dengan `overflow: hidden; display: inline-block;`.

```javascript
// Pola Word-by-Word Slide Up Stagger
tl.fromTo(".title-banner .word", 
  { yPercent: 100, opacity: 0 }, 
  { 
    yPercent: 0, 
    opacity: 1, 
    duration: 0.5, 
    stagger: 0.08, 
    ease: "power3.out" 
  }, 
  1.2 // Mulai pada detik 1.2
);
```

### 4.2. Catalog Components untuk Captions & Technical Callouts

| Nama Komponen / Block | Kategori | Penggunaan pada Video OWC |
| :--- | :--- | :--- |
| **`caption-clip-wipe`** | Clean Corporate Caption | Keterangan penjelasan teknis narator di bawah layar. |
| **`caption-weight-shift`** | Technical Editorial | Menyorot istilah kunci (*"Oscillating Water Column"*, *"Wells Turbine"*, *"PMSG"*). |
| **`caption-blend-difference`** | Occlusion / Over-footage | Teks anotasi yang melintasi latar belakang dinamis (air biru dan dinding gelap caisson) agar kontras otomatis terjaga. |
| **`lt-clean-bar`** | Minimal Lower Third | Pengenal modul/spesifikasi (misal: *"Wells Turbine Unit: 500 kW, Self-Rectifying"*). |
| **`lt-side-rule`** | Cardless Overlay | Label pengukuran teknik tanpa background box yang menutupi diagram SVG. |
| **`lt-kicker-name`** | Sub-system Callout | Eyebrow + Subtitle callout pada komponen generator PMSG. |

---

## 5. Data Visualization: Hero Counters & Dynamic Charts

> **Dokumentasi Terkait:**
> - [Data and Maps](https://hyperframes.heygen.com/prompting/data-and-maps.md)
> - [Motion — Rule 5 (Overshoot on transforms only)](https://hyperframes.heygen.com/prompting/motion.md#rule-5--overshoot-and-follow-through)

### 5.1. Catalog Blocks vs. Hand-Drawn SVG
Docs HyperFrames mendefinisikan dua jalur data-viz:
1. **Block Registry**: [`data-chart`](https://hyperframes.heygen.com/catalog/blocks/data-chart) (grafik batang dan garis teranimasi) dan [`apple-money-count`](https://hyperframes.heygen.com/catalog/blocks/apple-money-count) (odometer counter).
2. **Hand-Drawn GSAP Proxy (Disarankan untuk Parameter Teknik OWC)**: Untuk metrik seperti Daya Listrik ($P = 245\text{ kW}$), Kecepatan Putar Turbin ($N = 1500\text{ RPM}$), Tekanan Ruang Udara ($\Delta P = 3.2\text{ kPa}$), dan Frekuensi Listrik ($f = 50.0\text{ Hz}$).

### 5.2. Larangan Overshoot pada Angka (Rule 5)
> **PENTING:** *"Apply overshoot to transforms only. A number is not a physical object. A counter must never fly past its value and fall back. That renders a figure that was never true, and on a real metric it is a lie with a frame count."*
> - Transform mekanikal boleh overshoot (`back.out`).
> - Counter angka **HARUS** menggunakan `ease: "power2.out"` atau `ease: "none"`, **DILARANG** menggunakan `back.out` yang membuat nilai melebihi target lalu turun kembali.

### 5.3. Implementasi Seek-Safe Deterministic Counter (kW, RPM, Hz)
Untuk memastikan determinisme saat render non-linier seek:
- Gunakan objek proxy JavaScript dengan properti numerik.
- Animasikan properti proxy via GSAP.
- Format string pada `onUpdate` dan gunakan styling `font-variant-numeric: tabular-nums` pada CSS agar lebar digit angka stabil.

```javascript
// --- Generator Power & RPM Telemetry Counter ---
const telemetry = { powerKw: 0, rpm: 0, efficiency: 0 };
const powerElem = document.getElementById("val-power");
const rpmElem = document.getElementById("val-rpm");

tl.to(telemetry, {
  powerKw: 350.5,
  rpm: 1450,
  efficiency: 89.2,
  duration: 2.5,
  ease: "power2.out", // Bebas overshoot
  onUpdate: function() {
    powerElem.textContent = telemetry.powerKw.toFixed(1) + " kW";
    rpmElem.textContent = Math.round(telemetry.rpm) + " RPM";
  }
}, 4.0); // Cue pada detik 4.0
```

---

## 6. Camera Rig: Continuous World-Camera, Dolly & Parallax

> **Dokumentasi Terkait:**
> - [Capstone — The Timeline](https://hyperframes.heygen.com/prompting/capstone.md)
> - [Motion — Avoiding the Slideshow & Dwell-and-Sweep](https://hyperframes.heygen.com/prompting/motion.md#avoiding-the-slideshow)

### 6.1. Status Camera Rig di Docs HyperFrames
- **3D Native Camera**: Tersedia pada runtime Three.js melalui Frame Adapter (`window.__hfThreeTime`).
- **2D/2.5D Motion Graphics Camera**: **TIDAK DITEMUKAN CLASS CAMERA RIG KHUSUS / BILT-IN UTILITY STANDALONE DI DOCS**.
- **Pola Rekomendasi Resmi**: Docs HyperFrames mengimplementasikan kamera 2D kontinu melalui **GSAP Transform pada Root/World Wrapper DIV** dengan prinsip **Dwell-and-Sweep Rhythm**.

### 6.2. Arsitektur Camera Rig Manual (BangMotion Port)
Kita dapat membangun rig kamera deterministik dengan struktur kontainer viewport dan world canvas:

```html
<div id="viewport" style="width: 1920px; height: 1080px; overflow: hidden; position: relative;">
  <div id="camera-rig" style="position: absolute; width: 9600px; height: 1080px; transform-origin: 0 0;">
    <!-- Region 1: Pantai & Gelombang Laut (x: 0px - 1920px) -->
    <div id="region-ocean" class="region" style="left: 0px;">...</div>
    
    <!-- Region 2: Caisson & Kolom Air OWC (x: 1920px - 3840px) -->
    <div id="region-chamber" class="region" style="left: 1920px;">...</div>
    
    <!-- Region 3: Turbin Wells & Air Duct (x: 3840px - 5760px) -->
    <div id="region-turbine" class="region" style="left: 3840px;">...</div>
    
    <!-- Region 4: Generator PMSG & Rectifier (x: 5760px - 7680px) -->
    <div id="region-generator" class="region" style="left: 5760px;">...</div>
    
    <!-- Region 5: Single Line Diagram & Grid (x: 7680px - 9600px) -->
    <div id="region-grid" class="region" style="left: 7680px;">...</div>
  </div>
</div>
```

### 6.3. Pola Ritme "Dwell-and-Sweep" (Capstone Pattern)
Formula pergerakan kamera:
1. **Sweep (Perjalanan)**: Dolly kamera bergerak linier atau `power2.inOut` melintasi space antar modul ($1.0\text{s} - 1.5\text{s}$).
2. **Dwell (Pemberhentian Penuh)**: Kamera berhenti diam ($1.5\text{s} - 2.5\text{s}$) pada hero moment agar narasi dan data-viz tersampaikan.
3. **Ambient Alive**: Saat kamera berhenti (*dwell*), animasi internal (gelombang air, rotasi turbin, pembacaan meter) **tetap bergerak aktif**, kamera tidak membekukan scene (Rule 1: *Nothing stops*).

```javascript
// --- GSAP Camera Dolly Implementation ---
// Kamera bergerak dari Region 1 (Pantai) ke Region 2 (Caisson OWC)
tl.to("#camera-rig", {
  x: -1920,
  duration: 1.5,
  ease: "power2.inOut"
}, 3.0); // Sweep pada detik 3.0 -> tiba di 4.5s (Dwell 4.5s - 7.0s)

// Kamera bergerak dari Region 2 ke Region 3 (Turbin Wells)
tl.to("#camera-rig", {
  x: -3840,
  duration: 1.5,
  ease: "power2.inOut"
}, 7.0); // Sweep pada detik 7.0
```

---

## 7. Kesalahan Animasi Umum & Lint Hazards Pemutus Seek

> **Dokumentasi Terkait:**
> - [Rules and Anti-Patterns — Lint Rules to Know](https://hyperframes.heygen.com/prompting/rules-and-anti-patterns.md#lint-rules-to-know)
> - [Deterministic Rendering](https://hyperframes.heygen.com/concepts/determinism.md)

Berikut adalah daftar komprehensif kesalahan kritis yang dapat merusak determinisme saat render di Cloud / AWS Lambda multi-worker:

```
+---------------------------------------------------------------------------------------------------------+
|                                    CRITICAL LINT HAZARDS & FIXES                                        |
+---+-------------------------------------------+---------------------------------------------------------+
| # | KESALAHAN UMUM / LINT HAZARD              | DAMPAK RENDER & SOLUSI                                  |
+---+-------------------------------------------+---------------------------------------------------------+
| 1 | CSS transform: translate(-50%, -50%)      | GSAP x/y menimpa transform CSS -> elemen melompat liar. |
|   | bentrok dengan GSAP x / y                 | SOLUSI: Gunakan xPercent: -50, yPercent: -50 di GSAP.   |
+---+-------------------------------------------+---------------------------------------------------------+
| 2 | Kuantisasi hold stop-motion pada waktu    | Float rounding error t*fps membuat cadence stutter.     |
|   | detik (Math.floor(t / 0.066))             | SOLUSI: Kuantisasi pada integer frame index diskrit.    |
+---+-------------------------------------------+---------------------------------------------------------+
| 3 | Function-valued tween vars salah argumen: | First param GSAP function adalah index (number)!        |
|   | (el) => el.getAttribute(...)              | SOLUSI: Gunakan (i, target) => target.getAttribute(...).|
+---+-------------------------------------------+---------------------------------------------------------+
| 4 | Omit data-no-timeline pada sub-komposisi  | Renderer menunggu player-ready-timeout (45 detik).      |
|   | tanpa script GSAP                         | SOLUSI: Tambahkan data-no-timeline pada root element.   |
+---+-------------------------------------------+---------------------------------------------------------+
| 5 | Mengontrol <video>/<audio> via JS manual  | Rusak saat non-linear seek frame.                       |
|   | video.play() / audio.currentTime = X      | SOLUSI: Gunakan data-start & data-media-start.          |
+---+-------------------------------------------+---------------------------------------------------------+
| 6 | Memasukkan nested timeline manual ke      | HyperFrames runtime memetakan nested scene secara       |
|   | parent GSAP: parentTl.add(childTl)        | independen. DILARANG tl.add(childTl) antar file!        |
+---------------------------------------------------------------------------------------------------------+
```

---

## 8. Best Practice Arsitektur GSAP Timeline Per Komposisi

> **Dokumentasi Terkait:**
> - [HTML Schema Reference](https://hyperframes.heygen.com/reference/html-schema.md)
> - [Compositions](https://hyperframes.heygen.com/concepts/compositions.md)
> - [Timing & Animation](https://hyperframes.heygen.com/sdk/guides/timing-and-animation.md)

### 8.1. Struktur Modul File vs. Master File
HyperFrames mendukung dua pola arsitektur:
1. **Single-File Architecture (Capstone Model)**: Seluruh adegan film 3 menit diletakkan dalam satu `index.html` dengan satu timeline master GSAP yang mengontrol pergerakan kamera dan animasi lokal. Sangat cocok untuk model *continuous world camera*.
2. **Nested Composition Architecture (Multi-scene Model)**: Parent `index.html` memuat scene terpisah (`caisson.html`, `wells_turbine.html`, `pmsg.html`) via atribut `data-composition-src`.

```html
<!-- Pola Nested Composition di Parent HTML -->
<div id="stage" data-composition-id="main-movie" data-duration="180">
  <!-- Scene 1: Caisson & Ocean Wave (0 - 45s) -->
  <div class="clip"
       data-composition-id="scene-caisson"
       data-composition-src="scenes/01_caisson.html"
       data-start="0"
       data-duration="45"
       data-track-index="0"></div>

  <!-- Scene 2: Wells Turbine & Flow (45 - 90s) -->
  <div class="clip"
       data-composition-id="scene-turbine"
       data-composition-src="scenes/02_turbine.html"
       data-start="45"
       data-duration="45"
       data-track-index="0"></div>
</div>
```

> **Catatan Krusial dari Docs:**
> Di dalam `scenes/01_caisson.html`, timeline didaftarkan sebagai `window.__timelines["scene-caisson"] = tl;`.
> **JANGAN PERNAH** menambahkan sub-timeline tersebut ke parent GSAP timeline secara manual di JS parent. Runtime HyperFrames yang akan menangani sinkronisasi waktu dan seeking ke masing-masing sub-komposisi secara otomatis.

### 8.2. Struktur Standar GSAP Master Timeline (Single File)
Gunakan labels dan relative position parameters untuk fleksibilitas retiming:

```javascript
// Master Timeline Pattern
const tl = gsap.timeline({ paused: true });

// 1. Labels untuk membagi babak narasi
tl.addLabel("intro_ocean", 0.0)
  .addLabel("caisson_dynamics", 6.0)
  .addLabel("wells_aerodynamics", 16.0)
  .addLabel("pmsg_electromech", 28.0)
  .addLabel("grid_power_flow", 42.0);

// 2. Sekuens Babak 1
tl.fromTo("#ocean-bg", { opacity: 0 }, { opacity: 1, duration: 1.5 }, "intro_ocean")
  .fromTo("#ocean-wave-path", { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 2.0 }, "intro_ocean+=0.5");

// 3. Sekuens Babak 2 (Kamera bergerak ke Caisson)
tl.to("#camera-rig", { x: -1920, duration: 1.5, ease: "power2.inOut" }, "caisson_dynamics")
  .fromTo("#air-chamber-callout", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1.0, duration: 0.8 }, "caisson_dynamics+=1.0");

// 4. Registrasi
window.__timelines = window.__timelines || {};
window.__timelines["owc-master"] = tl;
```

---

## 9. Migration Mapping: Remotion (React) ke HyperFrames (HTML + GSAP)

> **Dokumentasi Terkait:**
> - [HyperFrames or Remotion?](https://hyperframes.heygen.com/guides/hyperframes-vs-remotion.md)
> - [Porting from Remotion](https://hyperframes.heygen.com/prompting/remotion-migration.md)

Tabel berikut memberikan panduan konversi langsung dari pola React Remotion ke pola native HTML5 + GSAP HyperFrames:

| Fitur / Pola Remotion | Implementasi Remotion (React) | Padanan HyperFrames (HTML + GSAP) | Keterangan & Keunggulan HyperFrames |
| :--- | :--- | :--- | :--- |
| **Playhead & Frame Access** | `const frame = useCurrentFrame();`<br>`const { fps } = useVideoConfig();` | `data-fps="30"` di root.<br>Waktu berbasis detik $t = \text{frame}/\text{fps}$ di-seek otomatis oleh engine ke GSAP timeline. | Tidak perlu kalkulasi frame manual di render function; GSAP mengelola state interpolasi secara native. |
| **Linear Interpolasi** | `interpolate(frame, [0, 30], [0, 100], { extrapolateRight: 'clamp' })` | `tl.fromTo("#el", { x: 0 }, { x: 100, duration: 1.0, ease: "none" }, 0)` | Mendukung aneka fungsi easing bawaan (`power1..4`, `expo`, `circ`, `sine`, `customEase`). |
| **Spring Dynamics** | `spring({ frame, fps, config: { damping: 12, mass: 0.5, stiffness: 100 } })` | `tl.fromTo("#el", { scale: 0.5 }, { scale: 1.0, duration: 0.8, ease: "back.out(1.7)" })` atau `ease: "elastic.out(1, 0.5)"` | Tidak ada evaluasi fisika berulang per frame; curve langsung di-sample deterministic oleh GSAP. |
| **Time Slicing & Delay** | `<Sequence from={60} durationInFrames={120}>`<br>&nbsp;&nbsp;`<Component />`<br>`</Sequence>` | `<div class="clip" data-start="2.0" data-duration="4.0" data-track-index="0">`<br>&nbsp;&nbsp;`<!-- HTML content -->`<br>`</div>` | Deklaratif di HTML via data attributes. Engine otomatis menangani show/hide DOM (`visibility`/`display`). |
| **Absolute Viewport** | `<AbsoluteFill style={{ ... }}>` | CSS: `#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; }`<br>`.clip { position: absolute; inset: 0; }` | Standar CSS absolut tanpa runtime overhead React virtual DOM. |
| **Audio Playback & Sync** | `<Audio src={staticFile("voiceover.mp3")} startFrom={0} endAt={150} />` | `<audio src="assets/vo.mp3" data-start="0" data-duration="5" data-media-start="0"></audio>` | Engine HyperFrames mengatur mixing audio dan slicing via ffmpeg secara terpisah dari thread visual. |
| **Video Cut / Footage** | `<Video src={src} muted />` | `<video src="assets/ocean.mp4" data-start="0" data-duration="5" data-media-start="0" muted></video>` | Jika ada suara: `data-has-audio="true"` tanpa `muted`. Jika b-roll bisu: `muted`. |
| **Text Stagger Reveal** | React array `.map((word, i) => ...)` dengan offset frame per kata | `tl.fromTo(".word", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" }, 1.0)` | Menggunakan GSAP Stagger bawaan yang sangat optimal. |
| **Dynamic Number Counter** | State / `Math.round(interpolate(...))` di JSX | GSAP tween pada proxy object `{ val: 0 }` dengan `onUpdate` mengubah `textContent`. | Mencegah layout thrashing dan re-render React; angka stabil dengan `tabular-nums`. |
| **Scene Transition** | Remotion `<TransitionSeries>` (Fade, Slide, Wipe) | 1. Continuous camera dolly (`tl.to("#camera", ...)`).<br>2. `@hyperframes/shader-transitions` (`cross-warp-morph`).<br>3. CSS `transitions-push` / `cover`. | Dukungan WebGL shader transitions langsung pada level GPU compositor. |

---

## 10. Checklist Verifikasi & Quality Gates

Sebelum merender komposisi ke MP4 / Cloud, jalankan verifikasi:

```bash
# 1. Linting integritas timeline dan atribut data-*
npx hyperframes lint

# 2. Validasi struktur media dan determinisme
npx hyperframes check

# 3. Snapshot frame spesifik (Awal, Tengah Bergerak, Selesai)
npx hyperframes snapshot --at 0,2.5,5.0,9.9

# 4. Uji bit-exact determinisme (jika multi-worker render)
npx hyperframes render --workers 1 --format png-sequence
```

---
*Dokumen ini merupakan panduan teknis resmi arsitektur animasi HyperFrames untuk proyek Ocean Wave Chamber (OWC).*
