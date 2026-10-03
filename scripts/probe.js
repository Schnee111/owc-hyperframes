// probe.js — ukur bbox caption vs teks dunia pada sample t, bukti objektif overlap.
import puppeteer from "/home/ubuntu/.npm/_npx/823d4e90d086ee3d/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { execSync } from "node:child_process";

const CHROME = execSync("which chromium-browser chromium google-chrome 2>/dev/null || ls /home/ubuntu/.cache/puppeteer/chrome/*/chrome-linux64/chrome 2>/dev/null | head -1").toString().trim().split("\n")[0];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1920,1080"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(`http://localhost:8093/index.html`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => window.__timelines && window.__timelines["main"], { timeout: 15000 });

const times = [9, 20, 40, 53, 105, 118, 130, 148];
for (const t of times) {
  await page.evaluate((sec) => {
    const tl = window.__timelines["main"];
    tl.seek(sec);
  }, t);
  await new Promise((r) => setTimeout(r, 120));
  const data = await page.evaluate(() => {
    const cap = document.getElementById("cap");
    const cr = cap.getBoundingClientRect();
    const picks = ["SKALA 1:50 MODEL FISIK", "DATUM 0", "RIWAYAT 4 DETIK", "SHEET 01/01 MODEL FISIK", "ETA TOTAL 35%"];
    const out = { cap: { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) }, hits: [] };
    const walk = (root) => {
      for (const el of root.querySelectorAll("text")) {
        const txt = el.textContent.trim();
        if (picks.includes(txt)) {
          const r = el.getBoundingClientRect();
          const overlap = !(r.right < cr.x || r.left > cr.right || r.bottom < cr.y || r.top > cr.bottom);
          out.hits.push({ txt, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), overlap });
        }
      }
    };
    walk(document);
    return out;
  });
  console.log(`t=${t}s cap=(${data.cap.x},${data.cap.y} ${data.cap.w}x${data.cap.h})`);
  for (const h of data.hits) console.log(`   ${h.txt}: (${h.x},${h.y} ${h.w}x${h.h}) ${h.overlap ? "OVERLAP!" : "ok"}`);
}
await browser.close();