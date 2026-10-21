import { useMemo, useState } from "react";
import { Input } from "@/components/ui-kit";
import { claveNombre } from "@/lib/formato-texto";

/** Campo de texto con lista desplegable filtrada del catálogo; acepta nombres libres. */
export function ComboNombre({ value, opciones, onChange }: { value: string; opciones: string[]; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const clave = claveNombre(value);
  const filtradas = useMemo(
    () => (clave ? opciones.filter((o) => claveNombre(o).includes(clave)) : opciones).slice(0, 50),
    [opciones, clave],
  );
  const enCatalogo = !value.trim() || opciones.some((o) => claveNombre(o) === clave);

  const elegir = (o: string) => { onChange(o); setAbierto(false); };

  return (
    <div className="relative">
      <Input
        autoFocus
        value={value}
        placeholder="Escribe o elige del catálogo"
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(0); }}
        onKeyDown={(e) => {
          if (!abierto || filtradas.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(a + 1, filtradas.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); elegir(filtradas[activo] ?? value); }
          else if (e.key === "Escape") { e.stopPropagation(); setAbierto(false); }
        }}
      />
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-card py-1 text-xs shadow-md">
          {filtradas.map((o, i) => (
            <li key={o}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); elegir(o); }} onMouseEnter={() => setActivo(i)}
                className={`block w-full px-3 py-1 text-left ${i === activo ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!enCatalogo && <p className="mt-1 text-[11px] text-warn">No está en el catálogo; se usará solo en esta cotización.</p>}
    </div>
  );
}
