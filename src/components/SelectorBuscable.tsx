import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type OpcionLista = { value: string; texto: string; /** Comentario a la derecha, p. ej. «m» → «Metro lineal». */ detalle?: string | undefined; /** Guía que se muestra en amarillo al recorrer la lista. */ nota?: string | null | undefined };

/** Quita mayúsculas, tildes y signos para filtrar sin sensibilidad. */
const limpiar = (t: string) => t.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Lista desplegable con buscador: al escribir, la lista se filtra.
 *  La lista se monta en un portal fijo (no la cortan contenedores con overflow,
 *  como las filas de una tabla). Se usa para Marca y Unidad en el maestro de
 *  insumos y en la ventana de insumo. */
export function SelectorBuscable({
  value,
  onChange,
  opciones,
  placeholder = "— Elegir —",
  buscarEn = "Escribe para filtrar…",
  permitirLibre = false,
  codigoIzquierda = false,
  ["aria-label"]: ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionLista[];
  placeholder?: string;
  buscarEn?: string;
  /** Permite aceptar un texto que no está en la lista (Enter o «Usar…»). */
  permitirLibre?: boolean;
  /** Pone el código del catálogo a la izquierda del nombre (subfamilias, especialidades). */
  codigoIzquierda?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; arriba: boolean } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const notaRef = useRef<HTMLDivElement>(null);
  /** Nota flotante colocada a un costado de la lista. */
  const [nota, setNota] = useState<{ top: number; left: number; width: number; texto: string } | null>(null);

  const colocar = useCallback(() => {
    const el = caja.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ALTO = 300; // alto máx. aproximado de la lista
    const arriba = r.bottom + ALTO > window.innerHeight && r.top > ALTO;
    setPos({
      top: arriba ? r.top - 8 : r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 240) - 8)),
      width: r.width,
      arriba,
    });
  }, []);

  useLayoutEffect(() => {
    if (abierto) colocar();
  }, [abierto, colocar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current?.contains(e.target as Node) || panel.current?.contains(e.target as Node) || notaRef.current?.contains(e.target as Node)) return;
      setAbierto(false);
    };
    const mover = () => colocar();
    document.addEventListener("mousedown", fuera);
    window.addEventListener("scroll", mover, true);
    window.addEventListener("resize", mover);
    return () => {
      document.removeEventListener("mousedown", fuera);
      window.removeEventListener("scroll", mover, true);
      window.removeEventListener("resize", mover);
    };
  }, [abierto, colocar]);

  // La nota del catálogo flota a un costado de la lista, alineada con la fila activa.
  useLayoutEffect(() => {
    if (!abierto || !pos) {
      setNota(null);
      return;
    }
    const el = panel.current;
    const fila = el?.querySelectorAll<HTMLElement>("[data-fila]")[activo];
    const texto = lista[activo]?.nota ?? "";
    if (!el || !fila || !texto) {
      setNota(null);
      return;
    }
    const pr = el.getBoundingClientRect();
    const fr = fila.getBoundingClientRect();
    const ancho = Math.min(320, Math.max(200, Math.round(window.innerWidth * 0.25)));
    let left = pr.right + 8;
    if (left + ancho > window.innerWidth - 8) {
      const aIzq = pr.left - 8 - ancho;
      left = aIzq >= 8 ? aIzq : -1;
    }
    if (left < 0) {
      setNota(null);
      return;
    }
    const top = Math.max(8, fr.top - 2);
    setNota((p) => (p && p.texto === texto && p.left === left && p.width === ancho && Math.abs(p.top - top) < 0.5 ? p : { top, left, width: ancho, texto }));
  }, [abierto, activo, lista, pos]);

  // Si la nota flotante se sale por abajo de la pantalla, se sube hasta caber.
  useLayoutEffect(() => {
    const el = notaRef.current;
    if (!el || !nota) return;
    const maxTop = window.innerHeight - 8 - el.getBoundingClientRect().height;
    if (nota.top > maxTop) setNota((p) => (p ? { ...p, top: Math.max(8, maxTop) } : p));
  }, [nota]);

  const lista = useMemo(() => {
    const n = limpiar(q.trim());
    const f = n ? opciones.filter((o) => limpiar(o.texto).includes(n) || limpiar(o.value).includes(n)) : opciones;
    if (permitirLibre && q.trim() && !f.some((o) => limpiar(o.value) === limpiar(q.trim())))
      return [...f, { value: q.trim(), texto: `Usar «${q.trim()}»` }];
    return f;
  }, [opciones, q, permitirLibre]);

  const texto = opciones.find((o) => o.value === value)?.texto ?? (permitirLibre && value ? value : "");

  function elegir(v: string) {
    onChange(v);
    setAbierto(false);
  }
  function abrir() {
    setQ("");
    setActivo(0);
    setAbierto(true);
  }

  // La lista se ensancha para leer el texto completo: si se sale de la pantalla, se corre a la izquierda.
  useLayoutEffect(() => {
    if (!abierto || !pos) return;
    const el = panel.current;
    if (!el) return;
    const maxIzq = window.innerWidth - el.getBoundingClientRect().width - 8;
    if (maxIzq < 8 || pos.left <= maxIzq) return;
    setPos((p) => (p ? { ...p, left: maxIzq } : p));
  }, [abierto, pos, lista]);

  return (
    <div ref={caja} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        title={opciones.find((o) => o.value === value)?.nota ?? undefined}
        onClick={abierto ? () => setAbierto(false) : abrir}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-md border border-line bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
      >
        <span className={`min-w-0 truncate ${texto ? "" : "text-muted-foreground"}`}>{texto || placeholder}</span>
        <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
      </button>
      {abierto && pos &&
        createPortal(
          <>
          <div
            ref={panel}
            style={{
              position: "fixed",
              top: pos.arriba ? undefined : pos.top,
              bottom: pos.arriba ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: "max-content",
              minWidth: Math.max(pos.width, 240),
              maxWidth: Math.max(window.innerWidth - pos.left - 8, 240),
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-md border border-line bg-background shadow-lg"
          >
            <input
              autoFocus
              className="w-full border-b border-line bg-transparent px-2 py-1.5 text-xs outline-none"
              placeholder={buscarEn}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActivo(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setAbierto(false);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActivo((a) => Math.min(a + 1, lista.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActivo((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const o = lista[activo];
                  if (o) elegir(o.value);
                }
              }}
            />
            <div className="max-h-72 overflow-y-auto py-0.5">
              {lista.map((o, ix) => (
                <button
                  data-fila
                  key={`${o.value}-${ix}`}
                  type="button"
                  title={o.detalle ? `${o.detalle} — ${o.texto}` : o.texto}
                  onMouseEnter={() => setActivo(ix)}
                  onClick={() => elegir(o.value)}
                  className={`flex w-full items-center gap-2 whitespace-nowrap px-2 py-1 text-left text-xs ${ix === activo ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  {codigoIzquierda && o.detalle && (
                    <span className="w-8 shrink-0 text-[10px] tabular-nums text-muted-foreground">{o.detalle}</span>
                  )}
                  <span className="min-w-0">{o.texto}</span>
                  {!codigoIzquierda && o.detalle && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{o.detalle}</span>
                  )}
                </button>
              ))}
              {lista.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin coincidencias.</p>}
            </div>
            {!nota &&
              (() => {
                const n = (lista[activo] ?? opciones.find((o) => o.value === value))?.nota;
                return n ? <p className="max-w-md whitespace-normal border-t border-line bg-nota px-2 py-1.5 text-[11px] text-muted-foreground">{n}</p> : null;
              })()}
          </div>
          {nota && (
            <div
              ref={notaRef}
              style={{ position: "fixed", top: nota.top, left: nota.left, width: nota.width, maxHeight: 260, zIndex: 9999 }}
              className="overflow-y-auto whitespace-normal rounded-md border border-line bg-nota px-2.5 py-2 text-[11px] leading-snug text-muted-foreground shadow-lg"
            >
              {nota.texto}
            </div>
          )}
          </>,
          document.body,
        )}
    </div>
  );
}
