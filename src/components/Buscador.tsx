import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

/** Normaliza texto: minúsculas y sin tildes. */
export const normalizar = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** true si alguno de los campos contiene el término (sin tildes, sin mayúsculas). */
export function coincide(termino: string, ...campos: unknown[]) {
  const t = normalizar(termino).trim();
  if (!t) return true;
  return campos.some((c) => normalizar(c).includes(t));
}

/** Resalta el término dentro del texto. */
export function Resaltar({ texto, termino }: { texto: unknown; termino: string }): ReactNode {
  const s = String(texto ?? "");
  const t = normalizar(termino).trim();
  if (!t || !s) return s;
  const n = normalizar(s);
  const partes: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (true) {
    const j = n.indexOf(t, i);
    if (j < 0) break;
    if (j > i) partes.push(s.slice(i, j));
    partes.push(
      <mark key={k++} className="rounded-sm bg-cta/60 px-0.5 text-ink">
        {s.slice(j, j + t.length)}
      </mark>,
    );
    i = j + t.length;
  }
  if (partes.length === 0) return s;
  partes.push(s.slice(i));
  return <>{partes}</>;
}

export function Buscador({
  valor,
  onChange,
  placeholder = "Buscar...",
  total,
  className = "",
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  total?: number;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={14} className="pointer-events-none absolute left-2.5 text-muted-foreground" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`w-56 rounded-md border bg-card py-1.5 pl-8 pr-8 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 ${
          valor ? "border-cta ring-2 ring-cta/30" : "border-line"
        }`}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Limpiar búsqueda"
          className="absolute right-2 text-muted-foreground hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
      {valor && total !== undefined && (
        <span className="ml-2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
          {total} resultado{total === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
