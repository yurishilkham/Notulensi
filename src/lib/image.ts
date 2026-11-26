import type { DokumentasiFoto } from "../types";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.78;

function createPhotoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File gambar tidak dapat dibaca."));
    img.src = url;
  });
}

export async function compressImageFile(file: File): Promise<DokumentasiFoto> {
  if (
    file.type &&
    !file.type.startsWith("image/")
  ) {
    throw new Error(`"${file.name}" bukan file gambar.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      throw new Error(`Ukuran gambar "${file.name}" tidak valid.`);
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Kanvas gambar tidak tersedia di peramban ini.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return {
      id: createPhotoId(),
      dataUrl,
      caption: "",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
