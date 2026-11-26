import { chromium } from "playwright-core";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edge, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:4175/", { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const selectors = [
    "body",
    ".app-shell",
    ".topbar",
    ".topbar-inner",
    ".app-body",
    ".workspace",
    ".workspace-tabs",
    ".form-pane",
    ".form-inner",
    ".field-grid",
    "#nama-kegiatan",
    ".preview-pane",
    ".mobile-actionbar",
  ];
  const out = {};
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) {
      out[selector] = "missing";
      continue;
    }
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    out[selector] = {
      rect: {
        x: Math.round(rect.x),
        width: Math.round(rect.width),
        right: Math.round(rect.right),
      },
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      display: styles.display,
      gridTemplateColumns: styles.gridTemplateColumns,
      minWidth: styles.minWidth,
      overflowX: styles.overflowX,
      hidden: el.hasAttribute("hidden"),
    };
  }
  const wide = [];
  for (const el of document.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth + 1) {
      wide.push({
        tag: el.tagName,
        cls: typeof el.className === "string" ? el.className : "",
        id: el.id,
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }
  }
  return {
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    info: out,
    wide: wide.slice(0, 30),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
