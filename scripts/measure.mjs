import { chromium } from "playwright-core";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edge, headless: true });
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto("http://localhost:4175/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const app = document.querySelector(".app-shell");
  const printRoot = document.querySelector(".print-root");
  if (app instanceof HTMLElement) app.style.display = "none";
  if (printRoot instanceof HTMLElement) printRoot.style.display = "block";
});
const info = await page.evaluate(() => {
  const doc = document.querySelector(".doc--print");
  const pick = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      paddingLeft: styles.paddingLeft,
      marginLeft: styles.marginLeft,
      gridTemplateColumns: styles.gridTemplateColumns,
    };
  };
  return {
    doc: pick(".doc--print"),
    letterhead: pick(".doc--print .doc-letterhead"),
    addressRow: pick(".doc--print .doc-address-row"),
    addressLabel: pick(".doc--print .doc-address-label"),
    section: pick(".doc--print .doc-section"),
    heading: pick(".doc--print .doc-heading"),
    fields: pick(".doc--print .doc-fields"),
    field: pick(".doc--print .doc-field"),
    label: pick(".doc--print .doc-field-label"),
    colon: pick(".doc--print .doc-field-colon"),
    value: pick(".doc--print .doc-field-value"),
    list: pick(".doc--print .doc-list"),
    body: pick(".doc--print .doc-body"),
    bodyLine: pick(".doc--print .doc-body-line"),
    signature: pick(".doc--print .doc-signature"),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
