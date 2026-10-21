import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui-kit";
import { claveNombre } from "@/lib/formato-texto";

/** Campo de texto con lista del catálogo filtrada; acepta nombres libres. */
export function ComboNombre({
  value,
  opciones,
  onChange,
  listaAlta = false,
}: {
  value: string;
  opciones: string[];
  onChange: (v: string) => void;
  /** Lista más alta y espaciada, para catálogos extensos. */
  listaAlta?: boolean;
}) {
  const [abierto, setAbierto] = useState(true);
  const [activo, setActivo] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);
  const clave = claveNombre(value);
  const filtradas = useMemo(
    () => (clave ? opciones.filter((o) => claveNombre(o).includes(clave)) : opciones).slice(0, 300),
    [opciones, clave],
  );
  const enCatalogo = !value.trim() || opciones.some((o) => claveNombre(o) === clave) || (abierto && filtradas.length > 0);
  const dosColumnas = listaAlta && filtradas.length > 10;

  const elegir = (o: string) => {
    onChange(o);
    setAbierto(false);
  };

  useEffect(() => {
    const activoEl = listaRef.current?.querySelector('[data-activo="true"]');
    activoEl?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  return (
    <div>
      <Input
        autoFocus
        value={value}
        placeholder="Escribe o elige del catálogo"
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onKeyDown={(e) => {
          if (!abierto || filtradas.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((a) => Math.min(a + 1, filtradas.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            elegir(filtradas[activo] ?? value);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setAbierto(false);
          }
        }}
      />
      {abierto && filtradas.length > 0 && (
        <>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {clave ? `${filtradas.length} de ${opciones.length} del catálogo` : `${opciones.length} en el catálogo`}
          </p>
          <ul
            ref={listaRef}
            className={`mt-1 overflow-y-auto rounded-md border border-line bg-card py-1 text-[13px] shadow-sm ${
              listaAlta ? "max-h-[min(46vh,420px)]" : "max-h-60"
            } ${dosColumnas ? "mb-3 grid grid-cols-2 gap-x-1" : "mb-3"}`}
          >
            {filtradas.map((o, i) => (
              <li key={o}>
                <button
                  type="button"
                  title={o}
                  data-activo={i === activo}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegir(o);
                  }}
                  onMouseEnter={() => setActivo(i)}
                  className={`block w-full truncate px-3 text-left ${
                    listaAlta ? "py-2" : "py-1"
                  } ${i === activo ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted/50"}`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {!enCatalogo && <p className="mt-1 text-[11px] text-warn">No está en el catálogo; se usará solo en esta cotización.</p>}
    </div>
  );
}
