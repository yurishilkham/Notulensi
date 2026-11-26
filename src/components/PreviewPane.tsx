import { useEffect, useRef, useState } from "react";
import { mmToPx, paperFor } from "../lib/paper";
import type { Notulensi, PaperSize } from "../types";
import { NotulensiDocument } from "./NotulensiDocument";

const MIN_SCALE = 0.5;

type Props = {
  draft: Notulensi;
  hidden?: boolean;
  id?: string;
  labelledBy?: string;
  onPaperSizeChange: (size: PaperSize) => void;
};

export function PreviewPane({
  draft,
  hidden,
  id,
  labelledBy,
  onPaperSizeChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const paper = paperFor(draft.paperSize);
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(() =>
    Math.round(mmToPx(paper.widthMm)),
  );
  const [height, setHeight] = useState(() =>
    Math.round(mmToPx(paper.heightMm)),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const sheet = sheetRef.current;
    if (!canvas || !sheet) return;

    const update = () => {
      const styles = window.getComputedStyle(canvas);
      const left = Number.parseFloat(styles.paddingLeft) || 0;
      const right = Number.parseFloat(styles.paddingRight) || 0;
      const available = canvas.clientWidth - left - right;
      const width = sheet.offsetWidth || Math.round(mmToPx(paper.widthMm));
      const fit = available / width;
      const next = Math.max(MIN_SCALE, Math.min(1, fit));
      setPageWidth(width);
      setScale(next);
      setHeight((sheet.offsetHeight || mmToPx(paper.heightMm)) * next);
    };

    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    observer.observe(sheet);
    update();

    return () => observer.disconnect();
  }, [draft.paperSize, paper.widthMm, paper.heightMm]);

  return (
    <section
      className="preview-pane"
      id={id}
      role={labelledBy ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "Pratinjau dokumen"}
      hidden={hidden}
    >
      <div className="preview-toolbar">
        <span className="preview-title">Pratinjau dokumen</span>
        <div className="preview-tools">
          <div className="paper-control">
            <span className="paper-label" id="paper-size-label">
              Kertas
            </span>
            <div
              className="paper-toggle"
              role="group"
              aria-labelledby="paper-size-label"
            >
              {(["A4", "F4"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  className="paper-option"
                  aria-label={`Kertas ${size}`}
                  aria-pressed={draft.paperSize === size}
                  onClick={() => onPaperSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <span className="preview-meta">Skala {Math.round(scale * 100)}%</span>
        </div>
      </div>
      <div className="preview-canvas" ref={canvasRef}>
        <div
          className="preview-scaler"
          style={{ width: pageWidth * scale, height }}
        >
          <div
            className="preview-sheet"
            ref={sheetRef}
            style={{
              width: `${paper.widthMm}mm`,
              transform: `scale(${scale})`,
            }}
          >
            <NotulensiDocument draft={draft} />
          </div>
        </div>
      </div>
    </section>
  );
}
