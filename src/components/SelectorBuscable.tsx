import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type OpcionLista = { value: string; texto: string; /** Comentario a la derecha, p. ej. «m» → «Metro lineal». */ detalle?: string };

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
  "aria-label"?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; arriba: boolean } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const colocar = useCallback(() => {
    const el = caja.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ALTO = 260; // alto máx. aproximado de la lista
    const arriba = r.bottom + ALTO > window.innerHeight && r.top > ALTO;
    setPos({
      top: arriba ? r.top - 8 : r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 160) - 8)),
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
      if (caja.current?.contains(e.target as Node) || panel.current?.contains(e.target as Node)) return;
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

  return (
    <div ref={caja} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        onClick={abierto ? () => setAbierto(false) : abrir}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-md border border-line bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
      >
        <span className={`min-w-0 truncate ${texto ? "" : "text-muted-foreground"}`}>{texto || placeholder}</span>
        <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
      </button>
      {abierto && pos &&
        createPortal(
          <div
            ref={panel}
            style={{
              position: "fixed",
              top: pos.arriba ? undefined : pos.top,
              bottom: pos.arriba ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: Math.max(pos.width, 160),
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
            <div className="max-h-60 overflow-y-auto py-0.5">
              {lista.map((o, ix) => (
                <button
                  key={`${o.value}-${ix}`}
                  type="button"
                  title={o.detalle ? `${o.texto} — ${o.detalle}` : o.texto}
                  onMouseEnter={() => setActivo(ix)}
                  onClick={() => elegir(o.value)}
                  className={`flex w-full items-baseline justify-between gap-2 truncate px-2 py-1 text-left text-xs ${ix === activo ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <span className="min-w-0 truncate">{o.texto}</span>
                  {o.detalle && <span className="shrink-0 text-[10px] text-muted-foreground">{o.detalle}</span>}
                </button>
              ))}
              {lista.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin coincidencias.</p>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
