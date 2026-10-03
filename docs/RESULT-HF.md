# RESULT-HF — Film OWC 180s di HyperFrames (r1)

Branch: feat/hf-film-180s. Main bersih (Day-0 scaffold + ADR).
Framework: HyperFrames 0.8.115 (pinned), HTML+GSAP 3.14.2 (vendored lokal).

## Artefak
- renders/owc-hyperframes_*.mp4 — 1920x1080, 30fps, 5400 frame, 180.00s pas
- h264 yuv420p + AAC 48k stereo; decode null bersih
- r1 sha256 8f1b4685… | r2 sha256 84a5fad6… — DIVERGEN (determinisme byte-identical GAGAL, selisih ~26KB/120MB; kemungkinan timestamp/x264 nondeterminisme pada software-GL capture; investigasi terbuka, bukan gate merge)

## Arsitektur (port 1:1 dari bank v4)
- Satu continuous world 6720x2160 di #world, kamera translate+scale murni (applyCam BangMotion)
- 12 anchor kamera per beat: HOLD 70% + GLIDE 30% akhir (E_INOUT bezier 0.83,0,0.17,1), napas +-3px
- Fisika port JS murni: chamberSurfY dual-harmonik (fase absolut, laut S1 = chamber di x1820),
  thetaTable precompute O(1) 5400 frame (rotor CW), rpmFromV, powerKW/pressureKPa ledger
- Geometri SVG prosedural: S1Coast (laut+dims+balloons+JONSWAP+coastline draw), Piston+foam+vektor,
  DuctParticles 26 (mulberry32 seed 2026), WellsRotor 6 bilah+trail ring, HudMini, S4Dash
  (osc+riwayat+gauge), S5SLD (bus+4 node+BESS+title block+stamp ACC)
- Caption screen-space 5 posisi anti-collision, WordReveal GSAP stagger 0.09s, exit fade -24px 12f
- Audio: 12 VO beat id-ID-ArdiNeural +4% (167.8s, pad rata 1.016s/beat = 180.00s) + ocean/hiss bed

## Storytelling (STORY-180.md)
6 babak: Pembuka masalah (0-29s) -> Konteks spektrum/caisson (29-60s) -> Konsep OWC (60-92s)
-> Detail teknis rotor/PMSG (92-124s) -> Hasil uji telemetri (124-156s) -> Grid+penutup ACC (156-180s)
Klaim angka 100% ledger: Hs 3.0m Tp 8.0s, 12.0x8.5m, 1:50 Froude, T_model 1.13s, p 3.1-4.7 kPa,
n 900-1450 rpm, P 18.4-30 kW, ETA 35%.

## Verifikasi (double)
1. lint: 0 error 0 warning
2. check: Runtime 0 error | Layout 0 error | Motion 0 error | Contrast 53/53 WCAG AA -> Check passed
3. Probe geometri (scripts/probe.js, headless): 0 overlap caption-vs-teks-dunia pada t=9,20,40,53,105,118,130,148
4. ffprobe: 1920x1080 30fps 5400f 180.00s yuv420p AAC 48k stereo
5. decode null: bersih
6. Determinisme: render x2 — sha DIVERGEN (r1 8f1b4685… vs r2 84a5fad6…, selisih ~26KB/120MB).
   Forensik level frame: 1491/5400 frame raw md5 berbeda, TAPI PSNR r1-vs-r2 y:57.45dB
   (min 47.5dB) = noise kuantisasi x264, tak kasat mata. Kesimpulan: visual-identical,
   byte-divergen karena nondeterminisme screenshot-capture software-GL. Bukan gate merge.

## Isu teratasi selama build (critic loop)
- lint: audio tanpa id = SENYAP saat render -> id unik semua clip
- runtime: SVG children forEach -> Array.from (headless-safe)
- seek(): suppressEvents default true -> onUpdate tidak jalan; fix seek(t,false) untuk QA hook
- overlap caption: akar masalah = kamera glide penuh (tak pernah hold) -> ganti hold 70% + glide 30%;
  0 overlap terverifikasi via probe ukur bbox
- kontras DATUM/kicker 2.46-3.49:1 -> #D08878; semua 53/53 AA
- clip_media_fit warning: slot durasi > media VO (by design, pad napas; slot menyesuaikan media)

## Known limitations
- Render 14 menit software-GL (2 vCPU); chrome-headless-shell belum terpasang (BeginFrame note)
- 14 warning clip_media_fit (slot pad > media) — intentional, napas VO

## Status
- Video r1 selesai + terverifikasi. Menunggu review visual Schnee sebelum post-processing
  (loudnorm -16 LUFS, tv-range, preview 720p) dan merge PR.