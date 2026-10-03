# owc-hyperframes

Rebuild total film PLTO-OWC 3 menit (180s, 5400 frame @ 30fps, 1920×1080) dengan **HyperFrames** (HTML→MP4 deterministik, heygen-com/hyperframes) — bukan Remotion.

Satu continuous world rig 6720×2160, kamera glide kontinu via satu master GSAP timeline, fisika gelombang Airy + Wells rotor CW deterministik, storytelling natural 6 babak (pembuka masalah → penutup).

## Dokumen SSOT (docs/)
- `STORY-180.md` — beat map 12 beat, VO script 427 kata, claim ledger legal
- `BANK-EXTRACT.md` — fisika/kamera/tipografi/koordinat proven dari bank Remotion v4
- `HF-DOCS.md` — riset kontrak framework HyperFrames
- `HF-ANIM.md` — mapping Remotion→GSAP + pola animasi seek-safe

## Aturan keras
- Deterministik: dilarang `Math.random()`, `Date.now()`, fetch jaringan di render path
- Satu paused root timeline per composition di `window.__timelines`
- Dilarang fade antar scene / zoom punch / blur transisi — kamera translate+scale murni
- Klaim angka di layar hanya dari claim ledger STORY-180
- Merge PR hanya full `--merge`, dilarang squash; dilarang push langsung ke main
- Output `renders/` gitignored

## Verifikasi
lint → check → snapshot → render ×2 (sha256 identik) → ffprobe → decode null → stills