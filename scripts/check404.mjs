import { chromium } from "playwright-core";
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: edge, headless: true });
const page = await browser.newPage();
page.on("response", (response) => { if (response.status() >= 400) console.log(response.status(), response.url()); });
await page.goto("http://localhost:4175/", { waitUntil: "networkidle" });
await browser.close();
