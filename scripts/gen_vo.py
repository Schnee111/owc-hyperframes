#!/usr/bin/env python3
"""Generate 12 VO segmen film OWC 180s via Edge TTS id-ID-ArdiNeural.
Naskah: docs/STORY-180.md (beat 1-12). Deterministik, rate -8% agar natural."""
import asyncio
import os

import edge_tts

VOICE = "id-ID-ArdiNeural"
RATE = "+4%"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "vo")

BEATS = [
    (1, "Sepanjang garis pantai, samudra menyimpan energi kinetik yang masif. Namun gelombang berosilasi acak, menghantam daratan dengan gaya hidrodinamika liar. Karakter fluida yang tak menentu, menyulitkan konversi daya langsung."),
    (2, "Menempatkan turbin di bawah air, mengundang kegagalan struktural. Salinitas memicu korosi cepat, dan sedimen merusak bilah. Dibutuhkan rekayasa yang menjauhkan komponen bergerak dari air laut."),
    (3, "Spektrum gelombang lepas dipetakan dengan tinggi signifikan tiga meter. Periode delapan detik, energi merambat melintasi batimetri dangkal menuju pantai. Data spektral ini, acuan utama perancangan penangkap energi."),
    (4, "Struktur caisson beton bertulang, berukuran dua belas kali delapan koma lima meter. Struktur kokoh ini berfungsi ganda, sebagai pelindung pantai, sekaligus perangkap gelombang. Massa air laut masuk leluasa, melalui bukaan bawah yang terendam."),
    (5, "Di dalam bilik kedap, permukaan air naik turun mengikuti gelombang. Kolom air bekerja layaknya piston hidraulis alami. Osilasi air mengubah ruang bilik, menjadi kompresi udara bolak balik. Tanpa satu pun komponen bergerak di dalam air."),
    (6, "Ketika gelombang mendesak air naik, udara terkompresi, dan tersembur melewati saluran sempit. Saat air laut surut kembali turun, udara luar terhisap masuk ke bilik. Penyempitan penampang duct, melipatgandakan kecepatan aliran udara."),
    (7, "Arah aliran yang selalu berbalik, dijawab oleh rotor Wells. Bilah simetris aerofoil menerima angin dari arah hembusan maupun hisapan. Kedua arah aliran, selalu menghasilkan gaya dorong ke arah sama. Putaran kontinu, tanpa katup pembalik mekanis."),
    (8, "Poros rotor terhubung langsung ke generator magnet permanen, PMSG. Tanpa kotak roda gigi, rugi friksi mekanik meniadakan. Setiap embusan udara, langsung dikonversi menjadi listrik."),
    (9, "Model skala Froude satu banding lima puluh, membuktikan dinamika sistem. Pada periode model satu koma satu tiga detik, tekanan bilik berosilasi stabil. Sensor mencatat tekanan dinamis, tiga koma satu hingga empat koma tujuh kilopaskal."),
    (10, "Rotor beroperasi pada putaran sembilan ratus, hingga seribu empat ratus lima puluh RPM. Daya pneumatik duct mencapai delapan belas koma empat, hingga tiga puluh kilowatt. Efisiensi konversi total, dari gelombang hingga listrik, terukur tiga puluh lima persen."),
    (11, "Listrik yang dihasilkan disearahkan inverter, dan distabilkan unit penyimpan energi BESS. Fluktuasi siklik gelombang teredam, sebelum daya dialirkan ke jaringan pesisir."),
    (12, "Teknologi kolom air berosilasi, membuktikan keandalan konversi energi laut yang ramah lingkungan. Sebuah cetak biru rekayasa maritim, siap mewujudkan kemandirian energi masa depan."),
]


async def gen(beat: int, text: str) -> None:
    mp3 = os.path.join(OUT, f"beat_{beat:02d}.mp3")
    if os.path.exists(mp3) and os.path.getsize(mp3) > 10_000:
        return
    tts = edge_tts.Communicate(text, VOICE, rate=RATE)
    await tts.save(mp3)


async def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for b, t in BEATS:
        await gen(b, t)
        print(f"beat_{b:02d} ok")


if __name__ == "__main__":
    asyncio.run(main())