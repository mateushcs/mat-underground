import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, ZoomIn, ZoomOut } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt: string;
}

interface CaseLightboxProps {
  images: LightboxImage[];
  index: number;
  lang: "pt" | "en";
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Full-screen image viewer for the case pages. Click the photo to open it at
 * full size; ←/→ step through the case's images and Esc/click closes.
 */
export function CaseLightbox({ images, index, lang, onClose, onNavigate }: CaseLightboxProps) {
  const en = lang === "en";
  const image = images[index];
  const many = images.length > 1;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (zoom > 0) return;
      if (!many) return;
      if (event.key === "ArrowRight") onNavigate((index + 1) % images.length);
      if (event.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, images.length, many, onClose, onNavigate, zoom]);

  if (!image) return null;
  const step = (delta: number) => {
    setZoom(0);
    setNaturalWidth(0);
    viewportRef.current?.scrollTo(0, 0);
    onNavigate((index + delta + images.length) % images.length);
  };

  return (
    <dialog
      ref={dialogRef}
      className="case-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || (en ? "Project image" : "Imagem do projeto")}
      onClick={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <button
        type="button"
        className="case-lightbox-close"
        onClick={onClose}
        aria-label={en ? "Close image" : "Fechar imagem"}
      >
        <X aria-hidden="true" />
      </button>
      {many && (
        <>
          <button
            type="button"
            className="case-lightbox-nav case-lightbox-prev"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            aria-label={en ? "Previous image" : "Imagem anterior"}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="case-lightbox-nav case-lightbox-next"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            aria-label={en ? "Next image" : "Próxima imagem"}
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </>
      )}
      <div className="case-lightbox-tools" onClick={(event) => event.stopPropagation()} role="group" aria-label={en ? "Image zoom" : "Zoom da imagem"}>
        <button type="button" onClick={() => setZoom(0)} aria-pressed={zoom === 0}>{en ? "Fit" : "Ajustar"}</button>
        <button type="button" onClick={() => setZoom(1)} aria-pressed={zoom === 1}>100%</button>
        <button type="button" disabled={zoom === 0} aria-label={en ? "Zoom out" : "Diminuir zoom"} onClick={() => setZoom(value => value <= 1 ? 0 : value - 0.5)}><ZoomOut /></button>
        <output aria-live="polite">{zoom === 0 ? (en ? "Fit" : "Ajustado") : `${zoom * 100}%`}</output>
        <button type="button" disabled={zoom >= 4 || !naturalWidth} aria-label={en ? "Zoom in" : "Ampliar imagem"} onClick={() => setZoom(value => value === 0 ? 1 : Math.min(4, value + 0.5))}><ZoomIn /></button>
        <a href={image.src} target="_blank" rel="noopener noreferrer">{en ? "Original ↗" : "Original ↗"}</a>
      </div>
      <figure className="case-lightbox-figure" onClick={(event) => event.stopPropagation()}>
        <div ref={viewportRef} className={`case-lightbox-viewport${zoom > 0 ? " is-zoomed" : ""}`} tabIndex={0} aria-label={en ? "Image; scroll to explore when zoomed" : "Imagem; role para explorar quando ampliada"}>
          <img key={image.src} src={image.src} alt={image.alt} onLoad={(event) => setNaturalWidth(event.currentTarget.naturalWidth)} style={zoom > 0 && naturalWidth ? { width: naturalWidth * zoom, maxWidth: "none", maxHeight: "none" } : undefined} />
        </div>
        {image.alt && <figcaption>{image.alt}</figcaption>}
      </figure>
    </dialog>
  );
}
