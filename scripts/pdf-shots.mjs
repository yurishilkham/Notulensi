import { mkdir, readdir, rm } from "node:fs/promises";
import { pdfToPng } from "pdf-to-png-converter";

const input = process.argv[2] ?? "shots/notulensi.pdf";
const outputFolder = process.argv[3] ?? "shots/pdf-pages";
await rm(outputFolder, { recursive: true, force: true });
await mkdir(outputFolder, { recursive: true });

const pages = await pdfToPng(input, {
  outputFolder,
  viewportScale: 2,
  useSystemFonts: true,
  outputFileMaskFunc: (pageNumber) => `page-${pageNumber}.png`,
});

console.log(`pages: ${pages.length}`);
console.log((await readdir(outputFolder)).join("\n"));
