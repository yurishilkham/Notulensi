import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const input = process.argv[2] ?? "shots/notulensi.pdf";
const data = new Uint8Array(await readFile(input));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
  const page = await doc.getPage(pageNumber);
  const [, , , height] = page.view;
  const content = await page.getTextContent();
  console.log(`\n=== page ${pageNumber} (height ${height}pt) ===`);
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const yTop = height - y;
    console.log(
      `${item.str.replace(/\s+/g, " ").slice(0, 80).padEnd(50)} x=${x.toFixed(1)} yTop=${yTop.toFixed(1)} h=${item.height.toFixed(1)}`,
    );
  }
}
