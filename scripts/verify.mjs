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

function waitForStored(page, needle) {
  return page.waitForFunction(
    ({ key, needle }) => localStorage.getItem(key)?.includes(needle),
    { key: STORAGE_KEY, needle },
  );
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
  await waitForStored(page, "Nama Notulis");
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
  console.log("1. Autosave, reload, draft switch, delete, undo");
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const { page, errors } = await openPage(context);

    equal(
      await page.getByRole("button", { name: "Simpan", exact: true }).count(),
      0,
      "autosave mode has no Save button",
    );

    await page.getByRole("button", { name: "Kertas F4", exact: true }).click();
    await page.waitForTimeout(700);
    ok(
      await page.locator(".preview-sheet .doc--f4").isVisible(),
      "blank form preview switches to F4",
    );
    equal(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      null,
      "paper size change on a blank form does not store an empty draft",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      0,
      "no empty draft appears in sidebar after clicking F4",
    );
    equal(
      await page.locator(".save-status-full").innerText(),
      "Belum tersimpan",
      "blank form stays unsaved",
    );
    await page.getByRole("button", { name: "Kertas A4", exact: true }).click();

    await page.getByLabel("Nama kegiatan").fill("Uji autosave");
    await waitForStored(page, "Uji autosave");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      1,
      "autosaved draft appears in the sidebar",
    );
    ok(
      (await page.locator(".save-status-full").innerText()).startsWith(
        "Tersimpan",
      ),
      "status shows saved after autosave",
    );

    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Uji autosave",
      "autosaved title survives reload",
    );

    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    equal(stored.drafts.length, 1, "one draft stored after autosave");

    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "",
      "new notulensi starts blank",
    );
    await page.getByLabel("Nama kegiatan").fill("Draft kedua");
    await waitForStored(page, "Draft kedua");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      2,
      "second autosaved draft is listed",
    );

    await page
      .locator(".sidebar .draft-item", { hasText: "Uji autosave" })
      .locator(".draft-select")
      .click();
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Uji autosave",
      "selecting a draft loads its content",
    );

    await page
      .locator(".sidebar .draft-item", { hasText: "Uji autosave" })
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
      .locator(".sidebar .draft-item", { hasText: "Uji autosave" })
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
      "Uji autosave",
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
    await page.getByLabel("Nama kegiatan").fill("Draft ketiga");
    await page
      .getByRole("button", { name: "Notulensi baru", exact: true })
      .click();
    await waitForStored(page, "Draft ketiga");
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "",
      "new notulensi flushes the previous autosave and starts blank",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      3,
      "draft flushed by the new action is listed",
    );

    await page.getByLabel("Nama kegiatan").fill("Pindah dokumen");
    await page
      .locator(".sidebar .draft-item", { hasText: "Draft ketiga" })
      .locator(".draft-select")
      .click();
    await waitForStored(page, "Pindah dokumen");
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Draft ketiga",
      "switching flushes the previous draft and loads the selected one",
    );
    equal(
      await page.locator(".sidebar .draft-item").count(),
      4,
      "draft flushed by switching is listed",
    );

    await page.getByLabel("Nama kegiatan").fill("Perubahan autosave");
    await waitForStored(page, "Perubahan autosave");
    equal(
      await page
        .locator(".sidebar .draft-item", { hasText: "Perubahan autosave" })
        .count(),
      1,
      "editing a saved draft autosaves and updates the sidebar title",
    );
    equal(
      await page
        .locator(".sidebar .draft-item", { hasText: "Draft ketiga" })
        .count(),
      0,
      "old saved title is replaced after autosave",
    );
    ok(
      (await page.locator(".save-status-full").innerText()).startsWith(
        "Tersimpan",
      ),
      "status shows saved after editing a saved draft",
    );

    await page.getByRole("button", { name: "Kertas F4", exact: true }).click();
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
      "paper size on a saved draft autosaves and survives reload",
    );

    await page.getByLabel("Nama kegiatan").fill("Sebelum muat ulang");
    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Sebelum muat ulang",
      "unsaved change flushes before reload",
    );

    const finalStored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      STORAGE_KEY,
    );
    equal(finalStored.drafts.length, 4, "four drafts stored after autosave flows");

    await expectNoErrors(errors, "autosave and draft test");
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

    equal(
      await page.getByRole("button", { name: "Simpan", exact: true }).count(),
      0,
      "autosave mode has no Save button while storage is unreadable",
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
    await waitForStored(page, "Data baru");
    await page.reload({ waitUntil: "networkidle" });
    equal(
      await page.getByLabel("Nama kegiatan").inputValue(),
      "Data baru",
      "new storage autosaves after reset",
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
    await waitForStored(page, "Data awal");

    await page.evaluate(() => {
      window.__originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
    });
    await page.getByLabel("Nama kegiatan").fill("Data gagal");
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
    await waitForStored(page, "Data pulih");
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
    await waitForStored(page, '"paperSize":"F4"');
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
    equal(
      await page.getByRole("button", { name: "Simpan", exact: true }).count(),
      0,
      "autosave mode has no Save button on mobile",
    );
    const printBox = await page
      .getByRole("button", { name: "Cetak / PDF", exact: true })
      .boundingBox();
    ok(printBox && printBox.height >= 44, "Cetak / PDF tap target is at least 44px");
    await page.getByLabel("Nama kegiatan").fill("Uji ponsel");
    await waitForStored(page, "Uji ponsel");
    equal(
      await page.locator(".sidebar .draft-item").count(),
      1,
      "mobile autosave stores the draft",
    );
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
    equal(
      await page.locator(".draft-drawer .draft-item").count(),
      1,
      "mobile drawer lists the autosaved draft",
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
