import type { PaperSize } from "../types";

export type PaperDefinition = {
  label: PaperSize;
  widthMm: number;
  heightMm: number;
  cssSize: string;
};

export const PAPER_SIZES: Record<PaperSize, PaperDefinition> = {
  A4: {
    label: "A4",
    widthMm: 210,
    heightMm: 297,
    cssSize: "210mm 297mm",
  },
  F4: {
    label: "F4",
    widthMm: 215,
    heightMm: 330,
    cssSize: "215mm 330mm",
  },
};

export function paperFor(size: PaperSize): PaperDefinition {
  return PAPER_SIZES[size] ?? PAPER_SIZES.A4;
}

export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}
