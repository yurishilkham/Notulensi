import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import { chromium } from "playwright-core";
import { pdfToPng } from "pdf-to-png-converter";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:4175/";
const STORAGE_KEY = "notulensi-bawaslu-v1";
const BACKUP_KEY = "notulensi-bawaslu-v1-cadangan";
const SAMPLE_TITLE = "Rapat koordinasi pengawasan tahapan kampanye";

let checks = 0;

async function ensurePreviewServer() {
  try {
    const response = await fetch(BASE);
    if (response.ok) return null;
  } catch {
    // Server is not running yet.
  }

  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--port",
      "4175",
      "--strictPort",
    ],
    {
      cwd: process.cwd(),
      stdio: "ignore",
      windowsHide: true,
    },
  );

  for (let attempt = 0; attempt < 50; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      const response = await fetch(BASE);
      if (response.ok) return server;
    } catch {
      // Keep waiting for the preview server.
    }
  }

  server.kill();
  throw new Error("Preview server did not start on port 4175.");
}

function ok(value, message) {
  assert.ok(value, message);
  checks += 1;
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}

async function openPage(context, options = {}) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  if (options.viewport) await page.setViewportSize(options.viewport);
  return { page, errors };
}

async function expectNoErrors(errors, label) {
  equal(errors.length, 0, `${label}: unexpected errors\n${errors.join("\n")}`);
}

function desktopSave(page) {
  return page
    .locator(".topbar")
    .getByRole("button", { name: "Simpan", exact: true });
}

function confirmDialog(page, name) {
  return page.getByRole("dialog", { name });
}

async function fillSample(page) {
  await page.getByLabel("Nama kegiatan").fill(SAMPLE_TITLE);
  await page.getByLabel("Hari/Tanggal").fill("2026-11-19");
  await page.getByLabel("Waktu").fill("09.00 - 12.00 WIB");
  await page.getByLabel("Tempat").fill("Kantor Bawaslu Kota Pasuruan");
  await page.getByLabel("Jumlah hadir").fill("24");
  await page
    .getByLabel("Unsur peserta 1", { exact: true })
    .fill("Pimpinan Bawaslu Kota Pasuruan");
  await page
    .getByLabel("Unsur peserta 2", { exact: true })
    .fill("Divisi Pengawasan dan Hubungan Antar Lembaga");
  await page
    .getByLabel("Unsur peserta 3", { exact: true })
    .fill("Perwakilan partai politik peserta pemilu");
  await page.getByLabel("Pembahasan rapat").fill(
    "1. Evaluasi pengawasan tahapan kampanye pekan pertama.\n" +
      "2. Pembahasan jadwal patroli pengawasan bersama.\n" +
      "3. Penyusunan laporan hasil pengawasan.",
  );
  await page.getByLabel("Keputusan dan tindak lanjut").fill(
    "1. Patroli pengawasan dilaksanakan setiap akhir pekan.\n" +
      "2. Laporan hasil pengawasan disusun paling lambat tiga hari setelah kegiatan.",
  );
  await page.getByLabel("Kota").fill("Pasuruan");
  await page.getByLabel("Tanggal tanda tangan").fill("2026-11-19");
  await page.getByLabel("Nama notulis").fill("Nama Notulis");
  await page.getByLabel("NIP/NPP").fill("19800101 200501 1 001");
  await desktopSave(page).click();
  await page.waitForFunction(
    (key) => {
      const raw = localStorage.getItem(key);
      return raw?.includes("Nama Notulis") ?? false;
    },
    STORAGE_KEY,
  );
}

async function readPdf(path) {
  const data = new Uint8Array(await readFile(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const pdfPage = await doc.getPage(number);
    const [, , width, height] = pdfPage.view;
    const content = await pdfPage.getTextContent();
    const text = content.items
      .filter((item) => "str" in item)
      .map((item) => item.str)
      .join(" ");
    pages.push({ width, height, text });
  }
  return pages;
}

const previewServer = await ensurePreviewServer();
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

try {
  console.log("1. Save, reload, unsaved warning, draft switch, delete, undo");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);

    await page.getByRole("button", { name: "Kertas F4", exact: true }).click();
    await page.waitForTimeout(700);
    ok(
      await page.locator(".preview-sheet .doc--f4").isVisible(),
      "blank form preview switches to F4",
    );
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      null,
      "switching to F4 on a blank form does not store an empty draft",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      0,
      "no empty draft appears in sidebar after clicking F4",
    );
    await page.getByRole("button", { name: "Kertas A4", exact: true }).click();

    await page.getByLabel("Nama kegiatan").fill("Uji simpan manual");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      0,
      "unsaved new draft is not listed",
    );
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      null,
      "unsaved new draft is not stored",
    );
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Uji simpan manual"),
      STORAGE_KEY,
    );
    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Uji simpan manual",
      "saved title survives reload",
    );

    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    equal(stored.drafts.length, 1, "one draft stored after first save");

    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await page.getByLabel("Nama kegiatan").fill("Draft kedua");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      1,
      "second new draft stays out of the list before save",
    );
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => {
        const raw = localStorage.getItem(key);
        return (
          raw?.includes("Uji simpan manual") && raw.includes("Draft kedua")
        );
      },
      STORAGE_KEY,
    );
    equal(await page.locator(".sidebar .draft-item").count(), 2, "two drafts listed");

    await page
      .locator(".sidebar .draft-item", { hasText: "Uji simpan manual" })
      .locator(".draft-select")
      .click();
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Uji simpan manual",
      "selecting a draft loads its content",
    );

    await page
      .locator(".sidebar .draft-item", { hasText: "Uji simpan manual" })
      .locator(".draft-delete")
      .click();
    await confirmDialog(page, "Hapus notulensi ini?").waitFor({
      state: "visible",
    });
    await page.keyboard.press("Escape");
    await confirmDialog(page, "Hapus notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.locator(".sidebar .draft-item").count(),
      2,
      "Escape cancels the delete dialog",
    );

    await page
      .locator(".sidebar .draft-item", { hasText: "Uji simpan manual" })
      .locator(".draft-delete")
      .click();
    await page
      .getByRole("button", { name: "Hapus notulensi", exact: true })
      .click();
    await page.getByText("Notulensi dihapus.").waitFor();
    equal(
      await page.locator(".sidebar .draft-item").count(),
      1,
      "draft removed after confirmation",
    );

    await page.getByRole("button", { name: "Urungkan", exact: true }).click();
    equal(
      await page.locator(".sidebar .draft-item").count(),
      2,
      "undo restores the deleted draft",
    );
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Uji simpan manual",
      "undo restores the active draft content",
    );
    const afterUndo = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    equal(afterUndo.drafts.length, 2, "undo writes both drafts back");

    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await page.getByLabel("Nama kegiatan").fill("Belum disimpan");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      2,
      "draft waiting for save is not listed",
    );
    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "visible",
    });
    ok(
      await page.getByText(/belum disimpan ke daftar dokumen/).isVisible(),
      "creating a new notulensi warns about the unsaved draft",
    );
    await confirmDialog(page, "Simpan notulensi ini?")
      .getByRole("button", { name: "Buang", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "",
      "discard starts a blank notulensi",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      2,
      "discarded draft is not listed",
    );

    await page.getByLabel("Nama kegiatan").fill("Draft ketiga");
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Draft ketiga"),
      STORAGE_KEY,
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      3,
      "saved draft from the form is listed",
    );

    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await page.getByLabel("Nama kegiatan").fill("Draft keempat");
    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "visible",
    });
    await confirmDialog(page, "Simpan notulensi ini?")
      .getByRole("button", { name: "Simpan", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "",
      "save then new starts a blank notulensi",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      4,
      "draft saved from the warning is listed",
    );

    await page.getByLabel("Nama kegiatan").fill("Pindah dokumen");
    await page
      .locator(".sidebar .draft-item")
      .first()
      .locator(".draft-select")
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "visible",
    });
    await confirmDialog(page, "Simpan notulensi ini?")
      .getByRole("button", { name: "Batal", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Pindah dokumen",
      "cancel keeps the unsaved draft open",
    );
    await page
      .locator(".sidebar .draft-item")
      .first()
      .locator(".draft-select")
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "visible",
    });
    await confirmDialog(page, "Simpan notulensi ini?")
      .getByRole("button", { name: "Buang", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Draft keempat",
      "discard then open another saved draft",
    );

    await page.getByLabel("Nama kegiatan").fill("Perubahan tertunda");
    await page.waitForTimeout(700);
    equal(
      await page.evaluate(
        (key) => localStorage.getItem(key)?.includes("Perubahan tertunda"),
        STORAGE_KEY,
      ),
      false,
      "editing a saved draft does not autosave",
    );
    equal(
      await page
        .locator(".sidebar .draft-item", { hasText: "Perubahan tertunda" })
        .count(),
      0,
      "sidebar keeps the saved title until Simpan",
    );
    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "visible",
    });
    ok(
      await page.getByText(/Perubahan pada .* belum disimpan/).isVisible(),
      "editing a saved draft triggers the unsaved warning",
    );
    await confirmDialog(page, "Simpan notulensi ini?")
      .getByRole("button", { name: "Batal", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Perubahan tertunda"),
      STORAGE_KEY,
    );
    equal(
      await page
        .locator(".sidebar .draft-item", { hasText: "Perubahan tertunda" })
        .count(),
      1,
      "saved edit updates the sidebar title",
    );
    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await confirmDialog(page, "Simpan notulensi ini?").waitFor({
      state: "hidden",
    });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "",
      "saved edit no longer blocks a new notulensi",
    );

    await expectNoErrors(errors, "save and unsaved warning test");
    await context.close();
  }

  console.log("2. Corrupt storage is preserved and backed up");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);
    const corrupt = "{not-json";
    await page.evaluate(
      ([key, raw]) => localStorage.setItem(key, raw),
      [STORAGE_KEY, corrupt],
    );
    await page.reload({ waitUntil: "networkidle" });

    ok(
      await page.locator(".storage-banner").isVisible(),
      "corrupt data shows the storage banner",
    );
    equal(
      await page.locator(".save-status-full").innerText(),
      "Penyimpanan nonaktif",
      "storage status shows disabled while storage is unreadable",
    );

    ok(
      await desktopSave(page).isDisabled(),
      "save is disabled while storage is unreadable",
    );
    await page.getByLabel("Nama kegiatan").fill("Jangan timpa data rusak");
    await page.waitForTimeout(800);
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      corrupt,
      "typing does not overwrite corrupt raw data",
    );

    await page.reload({ waitUntil: "networkidle" });
    ok(
      await page.locator(".storage-banner").isVisible(),
      "banner returns after reload",
    );
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      corrupt,
      "corrupt raw data still intact after reload",
    );

    await page
      .getByRole("button", { name: "Mulai penyimpanan baru", exact: true })
      .click();
    await page.locator(".storage-banner").waitFor({ state: "hidden" });
    equal(
      await page.evaluate((key) => localStorage.getItem(key), BACKUP_KEY),
      corrupt,
      "raw corrupt data is copied to the backup key",
    );
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      null,
      "main storage key is cleared only after backup",
    );

    await page.getByLabel("Nama kegiatan").fill("Data baru");
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Data baru"),
      STORAGE_KEY,
    );
    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Data baru",
      "new storage accepts save after reset",
    );
    equal(
      await page.locator(".storage-banner").count(),
      0,
      "banner is gone after starting fresh",
    );

    await page.evaluate(
      ([key, raw]) => localStorage.setItem(key, raw),
      [STORAGE_KEY, '{"version":1,"drafts":"rusak"}'],
    );
    await page.reload({ waitUntil: "networkidle" });
    ok(
      await page.locator(".storage-banner").isVisible(),
      "valid JSON with the wrong shape is treated as unreadable",
    );

    await expectNoErrors(errors, "corrupt storage test");
    await context.close();
  }

  console.log("2b. Failed write keeps the last saved data");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);

    await page.getByLabel("Nama kegiatan").fill("Data awal");
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Data awal"),
      STORAGE_KEY,
    );

    await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
    });
    await page.getByLabel("Nama kegiatan").fill("Data gagal");
    await desktopSave(page).click();
    await page
      .getByText(/Penyimpanan peramban penuh atau tidak tersedia/)
      .waitFor();
    const rawAfterFailure = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY,
    );
    ok(
      rawAfterFailure.includes("Data awal"),
      "failed save leaves the previous saved data intact",
    );
    ok(
      !rawAfterFailure.includes("Data gagal"),
      "failed save does not write the new data",
    );

    await page.evaluate(() => {
      Storage.prototype.setItem = window.__originalSetItem;
    });
    await page.getByLabel("Nama kegiatan").fill("Data pulih");
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes("Data pulih"),
      STORAGE_KEY,
    );
    ok(
      (await page.locator(".save-status-full").innerText()).startsWith(
        "Tersimpan",
      ),
      "save status recovers after storage returns",
    );

    await expectNoErrors(errors, "failed write test");
    await context.close();
  }

  console.log("3. Print PDF keeps the signature together (A4 & F4)");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);
    await fillSample(page);
    equal(
      await page.getByRole("button", { name: "Unduh Word" }).count(),
      0,
      "Unduh Word button is removed",
    );
    await page.evaluate(() => {
      window.__printCalled = false;
      window.print = () => {
        window.__printCalled = true;
      };
    });
    await page
      .getByRole("button", { name: "Cetak / PDF", exact: true })
      .click();
    equal(
      await page.evaluate(() => window.__printCalled),
      true,
      "print button opens the browser print flow",
    );
    await page.pdf({
      path: "shots/print.pdf",
      preferCSSPageSize: true,
      printBackground: true,
    });

    const pages = await readPdf("shots/print.pdf");
    ok(pages.length >= 1, "print PDF has at least one page");
    for (const [index, pdfPage] of pages.entries()) {
      ok(
        Math.abs(pdfPage.width - 595.28) < 2 &&
          Math.abs(pdfPage.height - 841.89) < 2,
        `print page ${index + 1} is A4`,
      );
      ok(pdfPage.text.trim().length > 0, `print page ${index + 1} is not blank`);
    }

    const signaturePage = pages.findIndex((pdfPage) =>
      pdfPage.text.includes("Notulis"),
    );
    const nipPage = pages.findIndex((pdfPage) =>
      pdfPage.text.includes("(NIP/NPP"),
    );
    const datePage = pages.findIndex((pdfPage) =>
      pdfPage.text.includes("Pasuruan,"),
    );
    ok(signaturePage >= 0, "print PDF contains the signature role");
    equal(nipPage, signaturePage, "signature role and NIP stay on one page");
    equal(datePage, signaturePage, "signature date stays with the block");
    ok(
      pages[0].text.includes("NOTULENSI KEGIATAN"),
      "first print page contains the document title",
    );

    await rm("shots/print-pages", { recursive: true, force: true });
    await mkdir("shots/print-pages", { recursive: true });
    const rendered = await pdfToPng("shots/print.pdf", {
      outputFolder: "shots/print-pages",
      viewportScale: 2,
      useSystemFonts: true,
      outputFileMaskFunc: (number) => `page-${number}.png`,
    });
    equal(
      rendered.length,
      pages.length,
      "rendered print page count matches PDF page count",
    );
    console.log(
      `   A4 print pages: ${pages.length}; signature on page ${signaturePage + 1}`,
    );

    await page.getByRole("button", { name: "Kertas F4", exact: true }).click();
    equal(
      await page
        .getByRole("button", { name: "Kertas F4", exact: true })
        .getAttribute("aria-pressed"),
      "true",
      "F4 paper button is pressed",
    );
    ok(
      await page.locator(".preview-sheet .doc--f4").isVisible(),
      "preview switches to F4 sheet",
    );
    equal(
      await page.evaluate(
        (key) => localStorage.getItem(key)?.includes('"paperSize":"F4"'),
        STORAGE_KEY,
      ),
      false,
      "F4 change is not saved before Simpan",
    );
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => localStorage.getItem(key)?.includes('"paperSize":"F4"'),
      STORAGE_KEY,
    );
    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page
        .getByRole("button", { name: "Kertas F4", exact: true })
        .getAttribute("aria-pressed"),
      "true",
      "F4 paper choice persists after reload",
    );

    await page.pdf({
      path: "shots/print-f4.pdf",
      preferCSSPageSize: true,
      printBackground: true,
    });
    const f4Pages = await readPdf("shots/print-f4.pdf");
    ok(f4Pages.length >= 1, "F4 print PDF has at least one page");
    for (const [index, pdfPage] of f4Pages.entries()) {
      ok(
        Math.abs(pdfPage.width - 609.45) < 2 &&
          Math.abs(pdfPage.height - 935.43) < 2,
        `F4 print page ${index + 1} is F4`,
      );
    }
    const f4SigPage = f4Pages.findIndex((pdfPage) =>
      pdfPage.text.includes("Notulis"),
    );
    const f4NipPage = f4Pages.findIndex((pdfPage) =>
      pdfPage.text.includes("(NIP/NPP"),
    );
    const f4DatePage = f4Pages.findIndex((pdfPage) =>
      pdfPage.text.includes("Pasuruan,"),
    );
    ok(f4SigPage >= 0, "F4 PDF contains the signature role");
    equal(f4NipPage, f4SigPage, "F4 signature role and NIP stay on one page");
    equal(f4DatePage, f4SigPage, "F4 signature date stays with the block");
    console.log(
      `   F4 print pages: ${f4Pages.length}; signature on page ${f4SigPage + 1}`,
    );

    await expectNoErrors(errors, "print test");
    await context.close();
  }

  console.log("3b. Documentation photos compress, persist, render, and print");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);

    await page
      .locator("#foto-dokumentasi")
      .setInputFiles([
        "src/assets/logo-bawaslu.jpeg",
        "src/assets/logo-bawaslu.jpeg",
      ]);
    await page.locator(".photo-card").nth(1).waitFor({ state: "visible" });
    equal(await page.locator(".photo-card").count(), 2, "two photos added");
    equal(
      await page.locator(".preview-sheet .doc-photo").count(),
      2,
      "two photos render in preview",
    );

    await page
      .getByLabel("Keterangan foto 1", { exact: true })
      .fill("Pembukaan rapat koordinasi");
    await desktopSave(page).click();
    await page.waitForFunction(
      (key) => {
        const raw = localStorage.getItem(key);
        return (
          (raw?.includes("Pembukaan rapat koordinasi") ?? false) &&
          (raw?.includes("data:image/jpeg") ?? false)
        );
      },
      STORAGE_KEY,
    );

    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.locator(".photo-card").count(),
      2,
      "uploaded photos persist across reload",
    );
    equal(
      await page.getByLabel("Keterangan foto 1", { exact: true }).inputValue(),
      "Pembukaan rapat koordinasi",
      "photo caption persists across reload",
    );

    await page.pdf({
      path: "shots/print-photos.pdf",
      preferCSSPageSize: true,
      printBackground: true,
    });
    const photoPdfPages = await readPdf("shots/print-photos.pdf");
    const joinedText = photoPdfPages.map((item) => item.text).join(" ");
    ok(
      joinedText.includes("E. DOKUMENTASI KEGIATAN"),
      "PDF includes documentation heading",
    );
    ok(
      joinedText.includes("Pembukaan rapat koordinasi"),
      "PDF includes photo caption",
    );

    await page.getByRole("button", { name: "Hapus foto 2", exact: true }).click();
    equal(await page.locator(".photo-card").count(), 1, "photo can be removed");
    ok(
      await page.locator(".preview-sheet .doc-photos--single").isVisible(),
      "single photo uses single-column layout",
    );

    await expectNoErrors(errors, "photo documentation test");
    await context.close();
  }

  console.log("4. Keyboard order, focus ring, mobile tabs and drawer");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);

    equal(
      await page.locator(".unsur-row").count(),
      3,
      "form starts with three participant rows",
    );
    await page.getByRole("button", { name: "Tambah unsur" }).click();
    equal(
      await page.locator(".unsur-row").count(),
      4,
      "Tambah unsur adds a participant row",
    );
    await page
      .getByRole("button", { name: "Hapus unsur peserta 4" })
      .click();
    equal(
      await page.locator(".unsur-row").count(),
      3,
      "remove participant row restores the initial count",
    );

    await page.getByLabel("Nama kegiatan").focus();
    await page.keyboard.press("Tab");
    equal(
      await page.evaluate(() => document.activeElement?.id),
      "tanggal-kegiatan",
      "Tab moves from name to date in form order",
    );
    const focusStyle = await page.evaluate(() => {
      const styles = getComputedStyle(document.activeElement);
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
      };
    });
    ok(
      focusStyle.outlineStyle !== "none" &&
        focusStyle.outlineWidth !== "0px",
      "keyboard focus has a visible outline",
    );
    // Native date inputs keep Tab inside their day, month, and year segments.
    await page.locator("#waktu-kegiatan").focus();
    await page.keyboard.press("Tab");
    equal(
      await page.evaluate(() => document.activeElement?.id),
      "tempat-kegiatan",
      "Tab moves from Waktu to Tempat",
    );
    await page.keyboard.press("Tab");
    equal(
      await page.evaluate(() => document.activeElement?.id),
      "jumlah-hadir",
      "Tab moves from Tempat to Jumlah hadir",
    );

    await expectNoErrors(errors, "desktop keyboard test");
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const { page, errors } = await openPage(context);

    const initialOverflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    ok(
      initialOverflow.documentWidth <= initialOverflow.viewportWidth + 1,
      "mobile form has no horizontal page overflow",
    );
    ok(
      await page.locator(".mobile-actionbar").isVisible(),
      "mobile action bar is visible",
    );
    equal(
      await page.getByRole("button", { name: "Unduh Word" }).count(),
      0,
      "Unduh Word button is removed on mobile",
    );
    const mobileSave = page
      .locator(".mobile-actionbar")
      .getByRole("button", { name: "Simpan", exact: true });
    const saveBox = await mobileSave.boundingBox();
    ok(saveBox && saveBox.height >= 44, "Simpan tap target is at least 44px");
    ok(
      await mobileSave.isDisabled(),
      "Simpan is disabled before the first change",
    );
    await page.getByLabel("Nama kegiatan").fill("Uji ponsel");
    ok(
      await mobileSave.isEnabled(),
      "Simpan is enabled after a change on mobile",
    );
    const printBox = await page
      .getByRole("button", { name: "Cetak / PDF", exact: true })
      .boundingBox();
    ok(printBox && printBox.height >= 44, "Cetak / PDF tap target is at least 44px");
    for (const name of ["Formulir", "Pratinjau"]) {
      const box = await page.getByRole("tab", { name }).boundingBox();
      ok(box && box.height >= 44, `${name} tab is at least 44px`);
    }

    await page.getByRole("tab", { name: "Formulir" }).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    equal(
      await page
        .getByRole("tab", { name: "Pratinjau" })
        .getAttribute("aria-selected"),
      "true",
      "ArrowRight selects the preview tab",
    );
    ok(
      await page.locator("#panel-preview").isVisible(),
      "preview panel is visible after tab switch",
    );
    for (const name of ["Kertas A4", "Kertas F4"]) {
      const box = await page
        .getByRole("button", { name, exact: true })
        .boundingBox();
      ok(box && box.height >= 44, `${name} tap target is at least 44px`);
    }
    const previewOverflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    ok(
      previewOverflow.documentWidth <= previewOverflow.viewportWidth + 1,
      "mobile preview has no horizontal page overflow",
    );

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(80);
    equal(
      await page
        .getByRole("tab", { name: "Formulir" })
        .getAttribute("aria-selected"),
      "true",
      "ArrowLeft returns to the form tab",
    );

    await page.getByRole("button", { name: /^Daftar/ }).click();
    ok(
      await page.locator(".draft-drawer").isVisible(),
      "mobile drawer opens",
    );
    await page.keyboard.press("Escape");
    await page.locator(".draft-drawer").waitFor({ state: "hidden" });
    ok(
      !(await page.locator(".draft-drawer").isVisible()),
      "Escape closes the mobile drawer",
    );

    await expectNoErrors(errors, "mobile test");
    await context.close();
  }

  console.log(`verify: ${checks} checks passed`);
} finally {
  await browser.close();
  previewServer?.kill();
}
