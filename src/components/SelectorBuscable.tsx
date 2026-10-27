import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type OpcionLista = { value: string; texto: string };

/** Quita mayúsculas, tildes y signos para filtrar sin sensibilidad. */
const limpiar = (t: string) => t.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Lista desplegable con buscador: al escribir, la lista se filtra.
 *  Se usa para Marca y Unidad en el maestro de insumos y en la ventana de insumo. */
export function SelectorBuscable({
  value,
  onChange,
  opciones,
  placeholder = "— Elegir —",
  buscarEn = "Escribe para filtrar…",
  permitirLibre = false,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionLista[];
  placeholder?: string;
  buscarEn?: string;
  /** Permite aceptar un texto que no está en la lista (Enter o «Usar…»). */
  permitirLibre?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

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
        onClick={abierto ? () => setAbierto(false) : abrir}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-md border border-line bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
      >
        <span className={`min-w-0 truncate ${texto ? "" : "text-muted-foreground"}`}>{texto || placeholder}</span>
        <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[10rem] overflow-hidden rounded-md border border-line bg-background shadow-lg">
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
                onMouseEnter={() => setActivo(ix)}
                onClick={() => elegir(o.value)}
                className={`block w-full truncate px-2 py-1 text-left text-xs ${ix === activo ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                {o.texto}
              </button>
            ))}
            {lista.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin coincidencias.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
