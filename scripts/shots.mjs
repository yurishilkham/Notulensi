import { chromium } from "playwright-core";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edge, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

await page.goto("http://localhost:4175/", { waitUntil: "networkidle" });
await page.screenshot({ path: "shots/desktop-1440.png" });

await page.setViewportSize({ width: 1280, height: 900 });
await page.screenshot({ path: "shots/desktop-1280.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "shots/mobile-form.png" });

await page.getByRole("tab", { name: "Pratinjau" }).click();
await page.screenshot({ path: "shots/mobile-preview.png" });

await page.getByRole("tab", { name: "Formulir" }).click();
await page.getByRole("button", { name: /^Daftar/ }).click();
await page.screenshot({ path: "shots/mobile-drawer.png" });
await page.keyboard.press("Escape");

await page.getByLabel("Nama kegiatan").fill("Rapat koordinasi pengawasan tahapan kampanye");
await page.getByLabel("Hari/Tanggal").fill("2026-11-19");
await page.getByLabel("Waktu").fill("09.00 - 12.00 WIB");
await page.getByLabel("Tempat").fill("Kantor Bawaslu Kota Pasuruan");
await page.getByLabel("Jumlah hadir").fill("24");
await page.getByLabel("Unsur peserta 1", { exact: true }).fill("Pimpinan Bawaslu Kota Pasuruan");
await page.getByLabel("Unsur peserta 2", { exact: true }).fill("Divisi Pengawasan dan Hubungan Antar Lembaga");
await page.getByLabel("Unsur peserta 3", { exact: true }).fill("Perwakilan partai politik peserta pemilu");
await page.getByLabel("Pembahasan rapat").fill(
  "1. Evaluasi pengawasan tahapan kampanye pekan pertama.\n2. Pembahasan jadwal patroli pengawasan bersama.\n3. Penyusunan laporan hasil pengawasan.",
);
await page.getByLabel("Keputusan dan tindak lanjut").fill(
  "1. Patroli pengawasan dilaksanakan setiap akhir pekan.\n2. Laporan hasil pengawasan disusun paling lambat tiga hari setelah kegiatan.",
);
await page.getByLabel("Nama notulis").fill("Nama Notulis");
await page.getByLabel("NIP/NPP").fill("19800101 200501 1 001");

await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: "shots/desktop-filled.png" });

await page.setViewportSize({ width: 794, height: 1123 });
await page.evaluate(() => {
  const app = document.querySelector(".app-shell");
  const printRoot = document.querySelector(".print-root");
  if (app instanceof HTMLElement) app.style.display = "none";
  if (printRoot instanceof HTMLElement) printRoot.style.display = "block";
});
await page.locator(".doc--print").screenshot({ path: "shots/doc-full.png" });

await browser.close();
console.log("screenshots written");
