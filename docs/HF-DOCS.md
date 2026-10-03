# HyperFrames (heygen-com/hyperframes) — Technical Reference & Architecture Report

> **Authoritative Sources & Documentation Index:**
> - Official Docs: [https://hyperframes.heygen.com/introduction](https://hyperframes.heygen.com/introduction)
> - Quickstart: [https://hyperframes.heygen.com/quickstart](https://hyperframes.heygen.com/quickstart)
> - Compositions: [https://hyperframes.heygen.com/concepts/compositions](https://hyperframes.heygen.com/concepts/compositions)
> - Data Attributes: [https://hyperframes.heygen.com/concepts/data-attributes](https://hyperframes.heygen.com/concepts/data-attributes)
> - Deterministic Rendering: [https://hyperframes.heygen.com/concepts/determinism](https://hyperframes.heygen.com/concepts/determinism)
> - Frame Adapters: [https://hyperframes.heygen.com/concepts/frame-adapters](https://hyperframes.heygen.com/concepts/frame-adapters)
> - Variables & Templating: [https://hyperframes.heygen.com/concepts/variables](https://hyperframes.heygen.com/concepts/variables)
> - HTML Schema Reference: [https://hyperframes.heygen.com/reference/html-schema](https://hyperframes.heygen.com/reference/html-schema)
> - Audio Effects & DSP Chain: [https://hyperframes.heygen.com/reference/audio-effects](https://hyperframes.heygen.com/reference/audio-effects)
> - GSAP Animation Guide: [https://hyperframes.heygen.com/guides/gsap-animation](https://hyperframes.heygen.com/guides/gsap-animation)
> - Rendering CLI & Production: [https://hyperframes.heygen.com/guides/rendering](https://hyperframes.heygen.com/guides/rendering)
> - HyperFrames vs Remotion: [https://hyperframes.heygen.com/guides/hyperframes-vs-remotion](https://hyperframes.heygen.com/guides/hyperframes-vs-remotion)
> - Troubleshooting & Pitfalls: [https://hyperframes.heygen.com/guides/troubleshooting](https://hyperframes.heygen.com/guides/troubleshooting)
> - CLI Package Full Reference: [https://hyperframes.heygen.com/packages/cli](https://hyperframes.heygen.com/packages/cli)
> - GitHub Repository: [https://github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)

---

## 1. Executive Summary & Core Philosophy

HyperFrames adalah framework video open-source (lisensi Apache 2.0) besutan HeyGen yang mengubah komposisi standar HTML, CSS, JavaScript, dan seekable animation timelines menjadi video MP4/WebM/MOV deterministik frame-by-frame.

### Filosofi Inti:
1. **HTML-Native Authoring:** Komposisi video didefinisikan sebagai file HTML dengan `data-*` attributes. Layout ditangani oleh CSS murni/modern, sedangkan pergerakan ditangani oleh library animasi seekable (utamanya GSAP). Tidak ada kewajiban React atau bundler framework JS.
2. **Separation of Concerns:** 
   - **HTML** memegang kendali penuh atas *timing*, *sequencing*, *clipping*, dan *media scheduling*.
   - **Scripts (JS/GSAP)** HANYA mendeskripsikan *visual motion* dan perubahan state visual pada waktu $t$. Script DILARANG memanipulasi waktu media (`.play()`, `.pause()`, `.currentTime`) atau memanipulasi visibilitas layer berdasarkan waktu.
3. **Seek-Driven Deterministic Capture:** Render engine tidak merekam pemutaran real-time (no screen recording). Engine Puppeteer / Chrome Headless shell meminta setiap frame diskrit $t = \text{frame} / \text{fps}$ melalui `HeadlessExperimental.beginFrame`, lalu mengomposisikan audio dan meng-encode via FFmpeg.
4. **Agent-Friendly & Tooling-Ready:** Struktur plain HTML memudahkan LLM coding agent untuk menulis dan merevisi komposisi tanpa tersangkut siklus build React yang rumit.

---

## 2. Quickstart & Project Anatomy

### 2.1. Instalasi & Scaffolding
HyperFrames dapat dijalankan secara instan via `npx` atau diinstal secara global via npm/bun/brew.

```bash
# Opsi 1: Menjalankan langsung via npx (Rekomendasi)
npx hyperframes init my-video

# Opsi 2: Global install
npm install -g hyperframes
hyperframes init my-video
```

#### Flags Penting `hyperframes init`:
- `--example, -e`: Memilih starter template (default: centered Inter blank).
- `--resolution`: Preset dimensi canvas (`landscape` [1920x1080], `portrait` [1080x1920], `landscape-4k` [3840x2160], `square` [1080x1080], dll.).
- `--video, -v <path>`: Scaffolding otomatis berbasis video sumber (mengekstrak audio & transkripsi).
- `--audio, -a <path>`: Scaffolding otomatis berbasis audio sumber.
- `--tailwind`: Menginjeksi Tailwind CSS browser-runtime.
- `--non-interactive`: Mode non-interaktif tanpa wizard (wajib untuk agent & CI).

### 2.2. Struktur Proyek Standar
Eksekusi `hyperframes init` menghasilkan struktur file minimal sebagai berikut:

```text
my-video/
├── hyperframes.json        # Konfigurasi proyek (registry, schema, metadata)
├── index.html              # Top-level Conductor Composition
├── compositions/           # Sub-compositions (Scene per scene)
│   ├── intro.html          # Scene 1 (<template>)
│   ├── features.html       # Scene 2 (<template>)
│   └── outro.html          # Scene 3 (<template>)
├── assets/                 # Video, Audio, Gambar, Font
│   ├── background.mp4
│   ├── voiceover.wav
│   └── logo.svg
└── renders/                # Target output file video (.mp4, .webm, dll)
```

---

## 3. Composition Architecture & HTML Schema Contract

### 3.1. Minimal Composition Contract
Sebuah file komposisi adalah dokumen HTML standar. Root elemen komposisi membutuhkan atribut dimensi dan identifikasi yang jelas.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      body { margin: 0; background: #000; }
      #root {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
      }
      .clip {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="5"
      data-fps="30"
      data-width="1920"
      data-height="1080"
    >
      <section
        id="title-card"
        class="clip"
        data-start="0"
        data-duration="5"
        data-track-index="1"
      >
        <h1 id="title">Hello HyperFrames</h1>
      </section>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const timeline = gsap.timeline({ paused: true });
      timeline.fromTo(
        "#title",
        { y: 48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
        0.2
      );
      window.__timelines.main = timeline;
    </script>
  </body>
</html>
```

### 3.2. Spesifikasi Atribut Composition Root

| Atribut | Wajib | Semantik & Aturan |
|---|:---:|---|
| `data-composition-id` | **Ya** | Unique Identifier untuk komposisi. Wajib sama persis dengan key pada `window.__timelines[id]`. |
| `data-start` | **Ya** (Top-level) | Wajib bernilai `"0"` pada top-level root. Menentukan titik awal komposisi. |
| `data-width` & `data-height` | **Ya** | Dimensi frame authoring dalam pixel (misal 1920 & 1080). |
| `data-duration` | Biasanya | Durasi total render dalam detik (integer/float). Wajib didefinisikan secara statis sebelum script berjalan. |
| `data-fps` | Tidak | Target framerate (default: 30). CLI dapat meng-override via flag `--fps`. |
| `data-no-timeline` | Kondisional | **Wajib jika komposisi tidak memiliki animasi JS/GSAP.** Mencegah renderer menunggu polling `window.__timelines` hingga timeout 45 detik (`missing_data_no_timeline`). |

---

## 4. Data Attributes & Timing Semantics

HyperFrames mengelola seluruh jadwal penayangan (scheduling) elemen melalui atribut HTML `data-*`.

### 4.1. Visual Elements & Timed Clips

| Atribut | Target Elemen | Semantik |
|---|---|---|
| `id` | Semua clip | ID unik dan stabil untuk seleksi CSS, GSAP target, dan referensi relative timing. |
| `class="clip"` | DOM, `<img>`, Section | Memberikan layout bounding-box `position: absolute; inset: 0`. Visibility dikontrol runtime berdasarkan `data-start`. |
| `data-start` | Semua clip | Waktu masuknya elemen ke timeline. Mendukung nilai absolut (detik, misal `"2.5"`) atau ekspresi relatif (misal `"intro + 0.5"`). |
| `data-duration` | DOM, Sub-comp, Media | Panjang slot waktu aktif elemen dalam detik. |
| `data-track-index` | Semua clip | Index lane/jalur pada timeline HyperFrames Studio (display only). **Render engine mengabaikan track index** dan merender overlap secara paralel; urutan visual diatur oleh CSS `z-index`. |

### 4.2. Relative Timing Expressions
`data-start` dapat mereferensikan selesainya clip sebelumnya dalam komposisi yang sama:
- `data-start="intro"`: Dimulai tepat saat clip ber-id `intro` berakhir (`intro.start + intro.duration`).
- `data-start="intro + 0.5"`: Dimulai 0.5 detik setelah clip `intro` selesai (gap).
- `data-start="intro - 0.5"`: Dimulai 0.5 detik sebelum clip `intro` selesai (overlap / transition lead-in).

*Catatan: Referensi relatif tidak boleh membuat circular dependency.*

### 4.3. Media Timing Attributes: Video & Audio

| Atribut | Berlaku Pada | Semantik & Perbedaan Krusial |
|---|---|---|
| `data-media-start` | `<video>`, `<audio>` | **Offset pemotongan file sumber (Trim in-point) dalam detik.** Mengontrol `-ss` pada FFmpeg audio mixer dan video decoder. |
| `data-playback-start` | Nested Compositions | Offset awal timeline child composition (detik). Menentukan titik waktu internal sub-komposisi yang ditampilkan pertama kali. *(Peringatan: Gunakan `data-media-start` untuk media audio/video, dan `data-playback-start` untuk nested composition host).* |
| `data-playback-rate` | `<video>`, `<audio>`, Sub-comp | Multiplier kecepatan playback (rentang `0.1` hingga `10.0`). |
| `data-volume` | `<video>`, `<audio>` | Gain volume statis. `1` = 0 dB (unity gain), `0` = hening, nilai hingga `3.98` (+12 dB headroom). |
| `data-fade-in` / `data-fade-out` | `<video>`, `<audio>` | Durasi fade gain linier (0 $\to$ 1 / 1 $\to$ 0) pada ujung clip dalam satuan detik. |
| `data-has-audio="true"` | `<video>` | **Wajib bagi video yang bersuara.** Memberitahu engine untuk mengekstrak dan memixing audio stream video. |
| `muted` | `<video>` | **Wajib bagi video bisu.** Video tanpa sound harus memiliki atribut `muted` (melanggar aturan ini memicu warning lint `video_missing_muted`). |
| `playsinline` | `<video>` | Wajib dicantumkan untuk kompatibilitas browser headless. |

---

## 5. GSAP Timeline Contract & Animation Guidelines

GSAP (GreenSock Animation Platform) adalah animation engine utama HyperFrames.

### 5.1. The Timeline Contract
Untuk memastikan render engine dapat melompat ke frame mana pun secara independen (random seek), script animasi harus mematuhi kontrak berikut:

1. **One Root Timeline per Composition:** Setiap file komposisi hanya boleh mendaftarkan 1 timeline utama.
2. **Created Paused:** Timeline WAJIB dibuat dengan `{ paused: true }`. HyperFrames yang memegang kendali playhead (`seek()`).
   ```javascript
   const tl = gsap.timeline({ paused: true });
   ```
3. **Registered on Global Object:** Timeline didaftarkan secara sinkron pada `window.__timelines` dengan key yang persis sama dengan `data-composition-id`.
   ```javascript
   window.__timelines = window.__timelines || {};
   window.__timelines["my-scene-id"] = tl;
   ```
4. **Deterministic Properties:**
   - Gunakan `gsap.fromTo()` saat kedua nilai awal dan akhir krusial untuk mencegah kegagalan state pada backward/random seeks.
   - Berikan explicit position parameter pada timeline (misal `tl.to(el, {...}, 0.5)` alih-alih sequence tak tentu).
   - Animasikan properti GPU-accelerated (`transform`: `x`, `y`, `scale`, `rotation`, serta `opacity`). Hindari animasi properti layout seperti `top`, `left`, `width`, `height` pada elemen besar.
5. **No Nested Timeline Registration:** Sub-composition yang di-mount via `data-composition-src` mengelola timelinenya sendiri. DILARANG menambahkan child timeline sub-komposisi secara manual ke timeline parent GSAP (`parentTl.add(childTl)`). HyperFrames me-map playhead parent ke child secara otomatis.

---

## 6. Deterministic Rendering Pipeline & Constraints

### 6.1. Mekanisme Byte-Identical Rendering
HyperFrames menjamin bahwa input yang sama menghasilkan output video identik frame demi frame.

```text
[ Render Request: Frame 90 ]
           │
           ▼
[ Engine Frame Clock: t = 90 / fps (Integer math, No Wall Clock) ]
           │
           ▼
[ Frame Adapter: seekFrame(90) -> GSAP tl.seek(3.000s) ]
           │
           ▼
[ Atomic Capture: Chrome HeadlessExperimental.beginFrame ]
           │
           ▼
[ Frame Encoding: FFmpeg Raw Frame Pipe + Offline Audio Mixing ]
```

### 6.2. Aturan Mutlak Determinisme (Banned APIs)
Dalam lifecycle render, hal-hal berikut **DILARANG KERAS**:
- **Wall Clock Timers:** `Date.now()`, `performance.now()`, `requestAnimationFrame`, `setTimeout`, `setInterval`. Waktu hanya dihitung dari indeks frame.
- **Unseeded Randomness:** Penggunaan `Math.random()` biasa dilarang karena menghasilkan nilai berbeda pada tiap run. Gunakan pseudo-random generator dengan fixed seed (misal LCG atau Mulberry32).
- **Mid-Render Network Fetching:** Seluruh asset (gambar, video, font, audio, data JSON) harus selesai di-load sebelum frame 0. Runtime menunggu gate `__renderReady` / `__playerReady`.
- **Dynamic Resize:** Viewport (`width`, `height`, `fps`) dikunci sebelum frame 0 dirender.

### 6.3. Docker Pinned Environment
Perbedaan versi Chrome, driver GPU host, antialiasing font OS, dan build FFmpeg lokal dapat menyebabkan deviasi sub-pixel antar mesin. Untuk keperluan CI/CD dan regression testing berakurasi tinggi, gunakan flag `--docker`:
```bash
npx hyperframes render --docker --output output.mp4
```

### 6.4. Long Renders & Capture Strategy
- **Streaming Capture:** Default untuk render MP4/MOV single-worker. Frame langsung di-stream ke stdin FFmpeg tanpa menyimpan puluhan gigabyte gambar mentah di disk.
- **Segmented Capture (`HF_SEGMENTED_CAPTURE=true`):** Untuk video berdurasi panjang, capture dipecah menjadi segmen-segmen terpisah (default 3000 frame / ~100s per segmen) yang masing-masing di-encode secara paralel dan distream-copy di akhir. Browser di-recycle secara berkala untuk mencegah memory leak Chrome, dan mendukung flag `--resume` jika terjadi interupsi.

---

## 7. Audio System & Multi-track DSP Mixing

HyperFrames membawa Web Audio DSP mixer bawaan yang dieksekusi via `OfflineAudioContext` di headless browser dan dibake ke audio stream final oleh FFmpeg. Seluruh arsitektur audio didefinisikan langsung dalam HTML.

### 7.1. Empat Atribut Audio HTML

```html
<audio
  id="voiceover"
  src="assets/narration.wav"
  data-start="0"
  data-duration="15"
  data-audio-group="dialogue"
  data-volume="1.0"
  data-fx-chain="{&quot;version&quot;:1,&quot;nodes&quot;:[
    {&quot;type&quot;:&quot;highpass&quot;,&quot;id&quot;:&quot;n1&quot;,&quot;params&quot;:{&quot;frequency&quot;:100,&quot;q&quot;:0.707}},
    {&quot;type&quot;:&quot;peaking&quot;,&quot;id&quot;:&quot;n2&quot;,&quot;label&quot;:&quot;Clarity&quot;,&quot;params&quot;:{&quot;frequency&quot;:3000,&quot;gain&quot;:2.5,&quot;q&quot;:1.0}}
  ]}"
  data-automation="{&quot;version&quot;:1,&quot;lanes&quot;:[
    {&quot;target&quot;:&quot;volume&quot;,&quot;points&quot;:[{&quot;t&quot;:0,&quot;v&quot;:1},{&quot;t&quot;:14,&quot;v&quot;:1},{&quot;t&quot;:15,&quot;v&quot;:0}]}
  ]}"
></audio>
```

1. **`data-fx-chain` (JSON):** Rantai efek audio berurutan (signal chain). Memuat node dengan tipe effect, ID, parameter, dan status bypass.
2. **`data-automation` (JSON):** Envelope otomatisasi kurva parameter waktu (volume atau filter knob).
3. **`data-audio-group` (String):** Mengelompokkan clip audio ke dalam satu bus grup (misal `dialogue`, `music`, `sfx`).
4. **`data-fx-carve` (JSON):** Konfigurasi voiceover carving (sidechain spectral ducking).

### 7.2. Registry 16 Efek DSP Bawaan

| Kategori | Nama Efek (`type`) | Parameter Utama & Rentang | Automatable? |
|---|---|---|:---:|
| **Filter** | `highpass` | `frequency` (20-20000 Hz), `q` (0.1-20), `poles` (1\|2) | **Ya (AUTO)** |
| | `lowpass` | `frequency` (100-20000 Hz), `q` (0.1-20), `poles` (1\|2) | **Ya (AUTO)** |
| | `peaking` | `frequency` (20-20000 Hz), `gain` (-40..40 dB), `q` (0.1-20) | **Ya (AUTO)** |
| | `lowshelf` | `frequency` (20-2000 Hz), `gain` (-40..40 dB) | **Ya (AUTO)** |
| | `highshelf` | `frequency` (500-20000 Hz), `gain` (-40..40 dB) | **Ya (AUTO)** |
| **Dynamics** | `gain` | `gain` (-60 dB s/d +12 dB) | **Ya (AUTO)** |
| | `compressor` | `threshold` (-60..0 dB), `ratio` (1..20), `attack`, `release`, `knee`, `makeup`, `mix` | Tidak (Worklet) |
| | `limiter` | `limit` (-24..0 dB), `attack`, `release`, `level_out` | Tidak (Worklet) |
| | `gate` | `threshold` (-80..0 dB), `range`, `ratio`, `attack`, `release` | Tidak (Worklet) |
| **Nonlinear** | `saturate` | `type` (tanh/atan/hard/dll), `threshold`, `output`, `oversample` | `output` saja |
| | `bitcrush` | `bits` (1..32), `samples` (1..250), `mix` (0..1) | Tidak (Worklet) |
| **Time/Space**| `delay` | `time` (1..5000 ms), `feedback` (0.01..0.95), `mix` (0..1) | **Ya (AUTO)** |
| | `reverb` | `size` (0.05..1), `damping` (0..1), `wet` (0..1), `dry` (0..1) | `wet`/`dry` saja |
| | `chorus` | `delay`, `depth`, `speed`, `mix` | **Ya (AUTO)** |
| | `phaser` | `in_gain`, `out_gain`, `delay`, `decay`, `speed` | Sebagian |
| | `pitchshift` | `semitones` (-12..12 st), `mix` (0..1) | Tidak (Worklet) |

### 7.3. Voiceover Carve (Spectral Ducking)
Voiceover Carve adalah algoritma ducking frekuensi cerdas: alih-alih menurunkan seluruh volume musik secara drastis saat narator berbicara, Carve hanya memotong frekuensi musik pada rentang spektral vokal narator (tiga peaking filter dinamis + gain floor).

Eksekusi CLI:
```bash
node <SKILL_DIR>/scripts/carve.mjs --comp index.html --strength 0.25
```

### 7.4. Loudness Normalization (EBU R128)
HyperFrames menyediakan tool inspeksi dan penyesuaian gain berbasis standar broadcast ITU-R BS.1770 / EBU R128:
```bash
# Mengukur perbedaan loudness clip audio
npx hyperframes normalize-audio --reference #narration --target #music-bed

# Menuliskan koreksi gain (data-volume) otomatis ke file HTML
npx hyperframes normalize-audio --reference #narration --target #music-bed --write
```

---

## 8. Frame Adapters & Custom Animation Runtimes

### 8.1. Kapan Perlu Frame Adapter?
- **95% Kasus (GSAP, Lottie, Three.js standar, Anime.js, CSS animations):** **TIDAK PERLU** membuat frame adapter custom. Runtime HyperFrames sudah otomatis mengenali dan melakukan seek pada runtime ini.
- **Kasus Khusus (Custom Simulation / Physics / Custom Canvas Loop):** Jika Anda memiliki runtime animasi berbasis kode imperative sendiri yang memiliki internal tick clock dan perlu dipaksa seekable frame-per-frame, buat custom `FrameAdapter`.

### 8.2. Antarmuka `FrameAdapter` (@hyperframes/core)
```typescript
import type { FrameAdapter, FrameAdapterContext } from "@hyperframes/core";

export interface FrameAdapter {
  id: string;
  init?: (context: FrameAdapterContext) => Promise<void> | void;
  getDurationFrames: () => number;
  seekFrame: (frame: number) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}
```

#### Kontrak Custom Frame Adapter:
1. `getDurationFrames()` harus mengembalikan nilai integer non-negatif yang pasti.
2. `seekFrame(frame)` harus idempotent dan mendukung seek acak (maju, mundur, melompat). Frame $N$ harus selalu menghasilkan state visual yang identik.
3. Semua proses asinkron (misal WebGL buffer uploads atau worker computations) harus selesai (`await`) sebelum promise `seekFrame` resolved.

---

## 9. CLI Command Reference & Tooling

Executable CLI: `npx hyperframes <command> [flags]`

### 9.1. Perintah Inti Render & Quality Control

| Perintah | Contoh Pemakaian | Deskripsi |
|---|---|---|
| `render` | `npx hyperframes render --output out.mp4 --quality high` | Meng-encode video final ke MP4, WebM, MOV, GIF, PNG sequence, atau HLS. |
| `preview` | `npx hyperframes preview --port 3002 --background` | Membuka local preview dev server & HyperFrames Studio UI dengan live HMR. |
| `lint` | `npx hyperframes lint` | Static HTML validator super cepat (memeriksa ketiadaan adapter, ID timing, aturan audio). |
| `check` | `npx hyperframes check --snapshots --strict` | **The Browser Gate:** Menjalankan headless Chrome untuk memverifikasi console error, CSS layout overflow, motion drift (*.motion.json), dan WCAG contrast. |
| `snapshot` | `npx hyperframes snapshot --at 0,1.5,4.0` | Mengambil capture frame PNG resolusi penuh pada timestamp detik tertentu. |
| `keyframes` | `npx hyperframes keyframes --selector "#hero" --shot motion.png` | Menganalisis keyframe animasi GSAP dan membuat onion-skin visual trajectory. |
| `compositions` | `npx hyperframes compositions` | Mendaftar semua ID komposisi, resolusi, dan durasi dalam proyek. |
| `doctor` | `npx hyperframes doctor` | Diagnosis environment lokal (FFmpeg, Node.js, Chrome headless, disk space cache). |
| `clean` | `npx hyperframes clean --snapshots` | Membersihkan cache frame sementara dan render artifacts yang tertinggal. |

### 9.2. Flags Detail `hyperframes render`

| Flag | Default | Pilihan Nilai / Deskripsi |
|---|---|---|
| `--output, -o` | `renders/<name>.mp4` | Path file output. |
| `--format` | `mp4` | `mp4`, `webm` (transparan VP9), `mov` (ProRes 4444 alpha), `gif`, `png-sequence`, `hls`. |
| `--fps, -f` | 30 / dari `data-fps` | Framerate render (1 - 240 fps). |
| `--quality, -q` | `looks` | Preset kualitas: `draft`, `looks` (CRF 16), `delivery`/`high`, `standard`. |
| `--crf` | auto | Nilai CRF FFmpeg (0-51) untuk kontrol bitrate manual. |
| `--workers, -w` | auto | Jumlah instance browser worker paralel (1-24). |
| `--docker` | off | Render dalam container Docker terisolasi untuk determinisme mutlak. |
| `--variables` | — | JSON string untuk menimpa nilai default `data-composition-variables`. |
| `--batch` | — | Path ke file `rows.json` untuk me-render massal video berkonten dinamis. |
| `--low-memory-mode` | auto (RAM <=8GB)| Mengurangi konsumsi memori ke 1 worker screenshot capture. |

---

## 10. HyperFrames vs. Remotion: In-depth Comparison & Migration

Sumber: `docs/guides/hyperframes-vs-remotion.mdx` & skill `remotion-to-hyperframes`

### 10.1. Perbandingan Filosofis & Teknis

| Dimensi | HyperFrames | Remotion |
|---|---|---|
| **Authoring Paradigm** | Deklaratif HTML5 + CSS + GSAP Timelines | Functional React Components + Hooks |
| **Animation Driving** | Playhead **seeking** pada timeline eksternal yang di-pause | Komponen dievaluasi sebagai fungsi dari `frame` number |
| **Model Timing** | Satuan waktu **Detik** (`data-duration="3.5"`) | Satuan waktu **Frame** (`durationInFrames={105}`) |
| **Lisensi** | **Apache 2.0 (100% Free & Open Source)** | Custom Commercial License (Berbayar untuk tim > 3 orang) |
| **Build Step** | **Nol build step** (buka `index.html` langsung di browser) | Membutuhkan Webpack/Vite + React compilation |
| **Agent Suitability** | Sangat ramah AI Agent (native HTML/CSS manipulation) | Memerlukan JSX syntax & state management yang ketat |

### 10.2. Tabel Mapping API Remotion $\to$ HyperFrames

| Fitur / Komponen Remotion | HyperFrames Equivalent | Aturan Terjemahan |
|---|---|---|
| `<Composition width height fps durationInFrames>` | `<div id="stage" data-composition-id data-width data-height data-fps data-duration>` | Durasi dikonversi: $\text{duration} = \text{durationInFrames} / \text{fps}$. |
| `<AbsoluteFill>` | `<div style="position:absolute;inset:0;">` | Menggunakan inline style atau class `.clip`. |
| `<Sequence from={F} durationInFrames={D}>` | Host `<div data-composition-src="scene.html" data-start="F/fps" data-duration="D/fps">` | Dipecah menjadi sub-komposisi modular terpisah. |
| `<Series>` & `<Series.Sequence>` | Sibling `<div>` berurutan dengan `data-start` kumulatif | Menjumlahkan durasi scene sebelumnya. |
| `useCurrentFrame()` | **Dihapus (Drop)** | Logika frame diubah menjadi tween GSAP terdaftar. |
| `interpolate(frame, [a, b], [x, y])` | `gsap.fromTo(el, {p: x}, {p: y, duration: (b-a)/fps, ease: "none"}, a/fps)` | Linear tween dengan `ease: "none"`. |
| `spring({ damping, stiffness })` | `gsap.to(el, { ease: "back.out(1.4)", duration: 0.7 })` | Damping $\approx 12$, stiffness $\approx 100 \implies$ `back.out(1.4)`. |
| `<Audio src volume>` | `<audio data-start data-duration data-volume src>` | Volume statis via `data-volume`, ramps via `data-automation`. |
| `<Video src>` | `<video playsinline data-has-audio="true" muted src>` | Tambahkan `data-has-audio="true"` jika ada audio; `muted` jika bisu. |
| `staticFile("img.png")` | `assets/img.png` | Relative path ke direktori `assets/`. |

### 10.3. Blocker Migrasi & The 20% Rule
Skill migrasi HyperFrames (`remotion-to-hyperframes`) secara mekanis dapat mengonversi ~80% kode Remotion. Namun, 20% pola React berikut **DITOLAK (Refuse)** karena melanggar determinisme frame seek:
- ❌ **React State Machines:** Penggunaan `useState` dan `useReducer` untuk mengendalikan jalannya animasi.
- ❌ **Asynchronous Side-Effects:** `useEffect` / `useLayoutEffect` dengan dependency dinamis.
- ❌ **Async Metadata:** `calculateMetadata` asynchronous yang melakukan fetch jaringan saat render.
- ❌ **Heavy Third-party React UI:** Komponen React kompleks dari library seperti MUI, AntD, Chakra, atau Radix UI.

---

## 11. Common Mistakes & Troubleshooting

Berikut adalah jebakan teknis paling sering yang menyebabkan render gagal atau freeze:

### 1. Polling Hang 45 Detik (`missing_data_no_timeline`)
- **Gejala:** Render berjalan lambat dan berhenti persis 45 detik sebelum memproses frame.
- **Penyebab:** Elemen root memiliki `data-composition-id="foo"`, tetapi script tidak pernah mendaftarkan `window.__timelines["foo"]`. Engine menunggu timeout `player-ready-timeout`.
- **Solusi:** Jika komposisi memang murni statis tanpa animasi JS, tambahkan atribut boolean `data-no-timeline` pada root element.

### 2. Animasi Langsung pada Elemen `<video>`
- **Gejala:** Video mengalami glitch atau freeze saat ukurannya dianimasikan.
- **Penyebab:** Mengubah dimensi layout (`width`, `height`, `top`, `left`) langsung pada tag `<video>` mengganggu hardware decoding frame capture.
- **Solusi:** Bungkus video dalam container `<div id="video-wrapper">` dan animasikan wrapper tersebut via GSAP.

### 3. Memanggil `.play()`, `.pause()`, atau `.currentTime` dari Script
- **Gejala:** Audio/video bergeser desinkronisasi atau looping kacau saat dirender.
- **Penyebab:** Script JavaScript berebut kontrol playback dengan engine HyperFrames.
- **Solusi:** Serahkan seluruh kendali media ke data attributes (`data-start`, `data-duration`, `data-media-start`).

### 4. Kebingungan `data-media-start` vs `data-playback-start`
- **Gejala:** Video terpotong pada visual tetapi audionya tetap memainkan detik ke-0 (untrimmed audio).
- **Penyebab:** Penulis menggunakan `data-playback-start` pada tag `<video>`. FFmpeg audio mixer hanya membaca `data-media-start`.
- **Aturan Baku:**
  - Gunakan `data-media-start` untuk `<video>` dan `<audio>`.
  - Gunakan `data-playback-start` untuk host Sub-composition (`data-composition-src`).

### 5. Timeline Tidak Dibuat Paused
- **Gejala:** Animasi berjalan sendiri sebelum seek dimulai atau meloncat-loncat saat render.
- **Penyebab:** Timeline GSAP dibuat tanpa opsi `{ paused: true }`.
- **Solusi:** Selalu inisialisasi dengan `gsap.timeline({ paused: true })`.

---

## 12. Best Practice: 3-Minute Multi-Scene Video Architecture

Untuk video berdurasi lebih dari 30 detik (hingga 3 menit), jangan pernah menulis seluruh markup dalam satu file monolitik `index.html`. Gunakan **Conductor & Sub-compositions Architecture**:

### 12.1. Conductor `index.html`
File `index.html` bertindak sebagai *Director/Conductor* yang mengatur timeline global, background music, dan mounting slot sub-komposisi.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, height=1080" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    body { margin: 0; background: #0b0f19; overflow: hidden; }
    #stage { position: relative; width: 1920px; height: 1080px; }
    .clip { position: absolute; inset: 0; }
  </style>
</head>
<body>
  <div id="stage" data-composition-id="main-stage" data-start="0" data-duration="180" data-width="1920" data-height="1080" data-fps="30">
    
    <!-- Audio Bed Global -->
    <audio id="bgm" src="assets/soundtrack.mp3" data-start="0" data-duration="180" data-volume="0.3" data-fade-out="3"></audio>

    <!-- Scene 1: Problem Intro (0 - 30s) -->
    <div id="host-scene-1" class="clip"
         data-composition-id="scene-problem"
         data-composition-src="compositions/scene-1.html"
         data-start="0" data-duration="30" data-track-index="0"
         data-variable-values='{"clientName":"Acme Corp","accentColor":"#3b82f6"}'>
    </div>

    <!-- Scene 2: Solution Showcase (30 - 120s) -->
    <div id="host-scene-2" class="clip"
         data-composition-id="scene-solution"
         data-composition-src="compositions/scene-2.html"
         data-start="30" data-duration="90" data-track-index="0">
    </div>

    <!-- Scene 3: Call to Action (120 - 180s) -->
    <div id="host-scene-3" class="clip"
         data-composition-id="scene-cta"
         data-composition-src="compositions/scene-3.html"
         data-start="120" data-duration="60" data-track-index="0"
         data-variable-values='{"ctaText":"Get Started Today"}'>
    </div>
  </div>

  <script>
    // Conductor Timeline (opsional, untuk transisi antar scene)
    window.__timelines = window.__timelines || {};
    window.__timelines["main-stage"] = gsap.timeline({ paused: true });
  </script>
</body>
</html>
```

### 12.2. Sub-Composition Scene (`compositions/scene-1.html`)
Setiap scene dibungkus dalam tag `<template>` dengan styles, markup, deklarasi variabel, dan timeline GSAP lokalnya sendiri:

```html
<template id="scene-problem-template">
  <div data-composition-id="scene-problem" data-width="1920" data-height="1080">
    <style>
      [data-composition-id="scene-problem"] {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      [data-composition-id="scene-problem"] .headline {
        font-family: system-ui, sans-serif; font-size: 72px; color: var(--accent, #ffffff);
      }
    </style>

    <h1 class="headline" data-var-text="clientName">Default Client</h1>

    <script>
      (function() {
        const { clientName = "Default Client", accentColor = "#3b82f6" } = window.__hyperframes?.getVariables() || {};
        const root = document.querySelector('[data-composition-id="scene-problem"]');
        root.style.setProperty("--accent", accentColor);

        window.__timelines = window.__timelines || {};
        const tl = gsap.timeline({ paused: true });
        
        // Waktu lokal dimulai dari 0s
        tl.fromTo(root.querySelector(".headline"), 
          { opacity: 0, scale: 0.8 }, 
          { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }, 
          0.5
        );

        window.__timelines["scene-problem"] = tl;
      })();
    </script>
  </div>
</template>
```

### 12.3. Resolusi Asset Dinamis
Untuk script yang memuat asset secara dinamis (misal Three.js texture loaders), gunakan helper `window.__hyperframes.assetUrl("path/to/asset")` untuk memastikan path relatif scene tetap ter-resolve dengan benar saat di-mount ke root.

---

## 13. READY-CHECKLIST: Scaffold & First Render Verification

Gunakan checklist ini untuk memverifikasi proyek baru Anda sebelum memulai full production:

- [ ] **1. System Health Check:**
  ```bash
  npx hyperframes doctor
  ```
  *Pastikan Node >= 20/22, FFmpeg terdeteksi, dan Chrome headless tersedia.*
- [ ] **2. Project Scaffolding:**
  ```bash
  npx hyperframes init my-project --resolution landscape --non-interactive
  cd my-project
  ```
- [ ] **3. Composition Contract Verification:**
  - [ ] Tag root memiliki `data-composition-id`, `data-start="0"`, `data-duration`, `data-width`, `data-height`.
  - [ ] Setiap elemen timed memiliki `class="clip"`, `data-start`, dan `data-duration`.
  - [ ] Semua timeline GSAP diinisialisasi dengan `{ paused: true }`.
  - [ ] Key `window.__timelines[id]` persis sama dengan `data-composition-id`.
  - [ ] Semua `<video>` bersuara memiliki `data-has-audio="true"`, sedangkan video hening memiliki `muted`.
- [ ] **4. Static Validation Gate:**
  ```bash
  npx hyperframes lint
  ```
  *Wajib lolos 0 error.*
- [ ] **5. Browser Runtime & Motion Gate:**
  ```bash
  npx hyperframes check --snapshots
  ```
  *Memverifikasi tidak ada runtime crash, layout overflow, atau kontras yang melanggar WCAG.*
- [ ] **6. Spot-Check Frame Visual:**
  ```bash
  npx hyperframes snapshot --at 0,1.5,2.9
  ```
  *Buka file di folder `snapshots/` untuk memeriksa kesesuaian render visual.*
- [ ] **7. First Final Output Render:**
  ```bash
  npx hyperframes render --output renders/first-cut.mp4 --quality looks
  ```
  *Periksa hasil MP4 di pemutar video lokal.*
