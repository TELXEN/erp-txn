import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, PanelLeft, Rows2, Rows3 } from "lucide-react";

export type ModoNavegacion = "lateral" | "simplificada" | "clasica";
export type ItemCinta = { a: string; texto: string; icono: React.ElementType; hijos?: ItemCinta[] };
export type CategoriaCinta = { titulo: string; items: ItemCinta[] };

const CORTO: Record<string, string> = {
  "Finanzas y Contabilidad": "Finanzas",
  "Recursos Humanos": "Personal",
  "Temas de colores": "Temas",
};

function contiene(c: CategoriaCinta, p: string) {
  return c.items.some((m) => m.a === p || m.hijos?.some((h) => h.a === p));
}

function SelectorModo({ modo, onModo, contraida, onContraer }: {
  modo: ModoNavegacion; onModo: (m: ModoNavegacion) => void; contraida: boolean; onContraer: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);
  const opciones: { m: ModoNavegacion; t: string; I: React.ElementType }[] = [
    { m: "clasica", t: "Cinta clásica", I: Rows3 },
    { m: "simplificada", t: "Cinta simplificada", I: Rows2 },
    { m: "lateral", t: "Menú lateral", I: PanelLeft },
  ];
  return (
    <div ref={ref} className="relative ml-auto flex items-center gap-1">
      {modo !== "lateral" && (
        <button type="button" onClick={onContraer} title={contraida ? "Mostrar cinta" : "Contraer cinta"} aria-label={contraida ? "Mostrar cinta" : "Contraer cinta"}
          className="grid size-7 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground">
          {contraida ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      )}
      <button type="button" onClick={() => setAbierto((v) => !v)} title="Opciones de navegación" aria-label="Opciones de navegación" aria-expanded={abierto}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground">
        <Rows2 className="size-3.5" /> <span className="hidden lg:inline">Diseño</span> <ChevronDown className="size-3" />
      </button>
      {abierto && (
        <div className="absolute right-0 top-8 z-50 w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          {opciones.map(({ m, t, I }) => (
            <button key={m} type="button" onClick={() => { onModo(m); setAbierto(false); }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted ${modo === m ? "font-semibold text-primary" : ""}`}>
              <I className="size-4" /> {t}{modo === m && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectorModoLateral(props: { modo: ModoNavegacion; onModo: (m: ModoNavegacion) => void }) {
  return <SelectorModo {...props} contraida={false} onContraer={() => {}} />;
}

export function CintaOpciones({ categorias, pathname, modo, onModo, distintivo, logo, usuario }: {
  categorias: CategoriaCinta[]; pathname: string; modo: Exclude<ModoNavegacion, "lateral">;
  onModo: (m: ModoNavegacion) => void; distintivo: (a: string) => number; logo: React.ReactNode;
  usuario?: React.ReactNode;
}) {
  const activa = categorias.find((c) => contiene(c, pathname))?.titulo ?? categorias[0]?.titulo;
  const [pestana, setPestana] = useState(activa);
  const [contraida, setContraida] = useState(false);
  useEffect(() => { try { setContraida(localStorage.getItem("erp-telxen-cinta-contraida") === "1"); } catch { /* */ } }, []);
  useEffect(() => { setPestana(activa); }, [activa]);
  const alternarContraer = () => setContraida((v) => { try { localStorage.setItem("erp-telxen-cinta-contraida", v ? "0" : "1"); } catch { /* */ } return !v; });
  const cat = categorias.find((c) => c.titulo === pestana) ?? categorias[0];

  const Insignia = ({ a }: { a: string }) => {
    const n = distintivo(a);
    return n > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold leading-[14px] text-destructive-foreground">{n}</span> : null;
  };

  const boton = (m: ItemCinta) => {
    const act = pathname === m.a;
    const I = m.icono;
    const tono = act ? "bg-cta text-cta-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-hover";
    if (modo === "simplificada") {
      return (
        <Link key={m.a} to={m.a} title={m.texto} onClick={() => contraida && setPestana(pestana)}
          className={`relative flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs ${tono}`}>
          <I className="size-4 shrink-0" /> {m.texto}<Insignia a={m.a} />
        </Link>
      );
    }
    return (
      <Link key={m.a} to={m.a} title={m.texto}
        className={`relative flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center text-[11px] leading-tight ${tono}`}>
        <I className="size-6 shrink-0" />
        <span className="line-clamp-2">{m.texto}</span><Insignia a={m.a} />
      </Link>
    );
  };

  // En la clásica: los ítems simples forman un grupo con el nombre de la pestaña; cada submenú es su propio grupo.
  const simples = cat?.items.filter((m) => !m.hijos) ?? [];
  const grupos = cat?.items.filter((m) => m.hijos) ?? [];

  return (
    <div className="no-print shrink-0 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-9 items-center gap-1 px-2">
        {logo}
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto" role="tablist">
          {categorias.map((c) => {
            const sel = c.titulo === pestana;
            return (
              <button key={c.titulo} type="button" role="tab" aria-selected={sel}
                onClick={() => { if (contraida && sel) alternarContraer(); setPestana(c.titulo); }}
                className={`relative h-9 whitespace-nowrap px-3 text-[13px] transition-colors hover:bg-sidebar-hover ${sel ? "font-semibold" : "text-sidebar-muted"}`}>
                {CORTO[c.titulo] ?? c.titulo}
                {sel && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-cta" />}
              </button>
            );
          })}
        </nav>
        <SelectorModo modo={modo} onModo={onModo} contraida={contraida} onContraer={alternarContraer} />
      </div>
      {!contraida && cat && (
        modo === "simplificada" ? (
          <div className="flex h-11 items-center gap-1 overflow-x-auto border-t border-sidebar-border bg-sidebar-panel px-2">
            {simples.map(boton)}
            {grupos.map((g) => (
              <div key={g.a} className="flex items-center gap-1 border-l border-sidebar-border pl-1">
                {g.hijos!.map(boton)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-stretch overflow-x-auto border-t border-sidebar-border bg-sidebar-panel px-2 pt-1">
            {[{ titulo: CORTO[cat.titulo] ?? cat.titulo, items: simples }, ...grupos.map((g) => ({ titulo: g.texto, items: g.hijos! }))]
              .filter((g) => g.items.length)
              .map((g, i) => (
                <div key={g.titulo} className={`flex flex-col ${i ? "border-l border-sidebar-border pl-1" : ""} pr-1`}>
                  <div className="flex flex-1 items-start gap-0.5">{g.items.map(boton)}</div>
                  <p className="py-0.5 text-center text-[10px] text-sidebar-muted">{g.titulo}</p>
                </div>
              ))}
          </div>
        )
      )}
    </div>
  );
}
