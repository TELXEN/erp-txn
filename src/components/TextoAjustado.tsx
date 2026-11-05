import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Texto en una sola línea: baja el tamaño de letra todo lo necesario para que la
 * frase quepa de punta a punta del ancho disponible, sin cortarla ni subirla.
 * Mide la frase con el mismo tipo de letra que el documento está usando (canvas),
 * igual que las etiquetas de la cinta; nunca estima por número de caracteres.
 */
export function TextoAjustado({ texto, basePt = 8.5, minimoPt = 5.5, className, style }: {
  texto?: string | null | undefined;
  basePt?: number;
  minimoPt?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tamPt, setTamPt] = useState(basePt);

  useEffect(() => {
    const el = ref.current;
    if (!el || !texto) return;
    const medir = () => {
      const disponible = el.clientWidth;
      if (disponible <= 0) return;
      const cs = window.getComputedStyle(el);
      const px = (basePt * 96) / 72;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      ctx.font = `${cs.fontWeight} ${px}px ${cs.fontFamily}`;
      const natural = ctx.measureText(texto).width;
      if (natural <= disponible) { setTamPt(basePt); return; }
      setTamPt(Math.max(minimoPt, basePt * (disponible / natural) - 0.15));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    void document.fonts?.ready.then(medir);
    return () => observador.disconnect();
  }, [texto, basePt, minimoPt]);

  return (
    <div ref={ref} className={className} style={{ ...style, whiteSpace: "nowrap", overflow: "hidden", fontSize: `${tamPt}pt` }}>
      {texto}
    </div>
  );
}
