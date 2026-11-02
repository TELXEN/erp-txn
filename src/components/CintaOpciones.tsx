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
    <div ref={ref} className="relative flex items-center gap-1">
      {modo !== "lateral" && (
        <button type="button" onClick={onContraer} title={contraida ? "Expandir cinta" : "Contraer cinta"} aria-label={contraida ? "Expandir cinta" : "Contraer cinta"}
          className="grid size-7 place-items-center rounded-md text-cinta-tenue hover:bg-cinta-hover hover:text-cinta-texto">
          {contraida ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      )}
      <button type="button" onClick={() => setAbierto((v) => !v)} title="Opciones de navegación" aria-label="Opciones de navegación" aria-expanded={abierto}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-cinta-tenue hover:bg-cinta-hover hover:text-cinta-texto">
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

export type ContextoCinta = { titulo: string; subtitulo: string };
const CTX = "__pantalla";

/** Grupo de botones con título opcional dentro de la pestaña contextual de la cinta. */
export function GrupoCinta({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="grupo-cinta flex flex-col justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {titulo && <p className="pt-0.5 text-center text-[10px] text-cinta-tenue">{titulo}</p>}
    </div>
  );
}

export function CintaOpciones({ categorias, pathname, modo, onModo, distintivo, logo, usuario, pantallaCompleta, contextual, onRanuraContextual }: {
  categorias: CategoriaCinta[]; pathname: string; modo: Exclude<ModoNavegacion, "lateral">;
  onModo: (m: ModoNavegacion) => void; distintivo: (a: string) => number; logo: React.ReactNode;
  usuario?: React.ReactNode; pantallaCompleta?: React.ReactNode;
  contextual?: ContextoCinta | null; onRanuraContextual?: (el: HTMLDivElement | null) => void;
}) {
  const activa = categorias.find((c) => contiene(c, pathname))?.titulo ?? categorias[0]?.titulo;
  const [pestana, setPestana] = useState(activa);
  const [contraida, setContraida] = useState(false);
  useEffect(() => { try { setContraida(localStorage.getItem("erp-telxen-cinta-contraida") === "1"); } catch { /* */ } }, []);
  useEffect(() => { setPestana(contextual ? CTX : activa); }, [activa, pathname, !!contextual]);
  const enCtx = pestana === CTX && !!contextual;
  const alternarContraer = () => setContraida((v) => { try { localStorage.setItem("erp-telxen-cinta-contraida", v ? "0" : "1"); } catch { /* */ } return !v; });
  const cat = categorias.find((c) => c.titulo === pestana) ?? categorias[0];

  const Insignia = ({ a }: { a: string }) => {
    const n = distintivo(a);
    return n > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold leading-[14px] text-destructive-foreground">{n}</span> : null;
  };

  const boton = (m: ItemCinta) => {
    const act = pathname === m.a;
    const I = m.icono;
    const tono = act ? "bg-cinta-acento text-cinta-acento-foreground font-semibold" : "text-cinta-texto hover:bg-cinta-hover";
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
    <div className="cinta-opciones no-print shrink-0 border-b border-cinta-borde bg-cinta-inf text-cinta-texto">
      <div className="flex h-9 items-center gap-1 bg-cinta-sup px-2">
        {logo}
        {contextual && (
          <div className="hidden max-w-[180px] min-w-0 shrink border-r border-cinta-borde pr-2 leading-tight 2xl:block" title={contextual.subtitulo}>
            <p className="truncate text-xs font-semibold">{contextual.titulo}</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-wide text-cinta-tenue">{contextual.subtitulo}</p>
          </div>
        )}
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]" role="tablist">
          {categorias.map((c) => {
            const sel = c.titulo === pestana;
            return (
              <button key={c.titulo} type="button" role="tab" aria-selected={sel}
                onClick={() => { if (contraida && sel) alternarContraer(); setPestana(c.titulo); }}
                className={`relative h-9 shrink-0 whitespace-nowrap px-2.5 text-[13px] transition-colors hover:bg-cinta-hover ${sel ? "font-semibold" : "text-cinta-tenue"}`}>
                {CORTO[c.titulo] ?? c.titulo}
                {sel && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-cinta-acento" />}
              </button>
            );
          })}
          {contextual && (
            <button type="button" role="tab" aria-selected={enCtx}
              onClick={() => { if (contraida && enCtx) alternarContraer(); setPestana(CTX); }}
              className={`relative ml-1 h-9 shrink-0 whitespace-nowrap border-l border-cinta-borde px-3 text-[13px] font-semibold text-cinta-acento transition-colors hover:bg-cinta-hover`}>
              {contextual.titulo}
              {enCtx && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-cinta-acento" />}
            </button>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
        {usuario}
        {pantallaCompleta}
        <SelectorModo modo={modo} onModo={onModo} contraida={contraida} onContraer={alternarContraer} />
        </div>
      </div>
      <div ref={onRanuraContextual}
        className={`${!contraida && enCtx ? "flex" : "hidden"} min-h-11 items-stretch gap-2 overflow-x-auto border-t border-cinta-borde bg-cinta-inf px-2 py-1.5 text-xs [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-2 [&_.grupo-cinta+.grupo-cinta]:border-l [&_.grupo-cinta+.grupo-cinta]:border-cinta-borde [&_.grupo-cinta+.grupo-cinta]:pl-2`} />
      {!contraida && !enCtx && cat && (
        modo === "simplificada" ? (
          <div className="flex h-11 items-center gap-1 overflow-x-auto border-t border-cinta-borde bg-cinta-inf px-2">
            {simples.map(boton)}
            {grupos.map((g) => (
              <div key={g.a} className="flex items-center gap-1 border-l border-cinta-borde pl-1">
                {g.hijos!.map(boton)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-stretch overflow-x-auto border-t border-cinta-borde bg-cinta-inf px-2 pt-1">
            {[{ titulo: CORTO[cat.titulo] ?? cat.titulo, items: simples }, ...grupos.map((g) => ({ titulo: g.texto, items: g.hijos! }))]
              .filter((g) => g.items.length)
              .map((g, i) => (
                <div key={g.titulo} className={`flex flex-col ${i ? "border-l border-cinta-borde pl-1" : ""} pr-1`}>
                  <div className="flex flex-1 items-start gap-0.5">{g.items.map(boton)}</div>
                  <p className="py-0.5 text-center text-[10px] text-cinta-tenue">{g.titulo}</p>
                </div>
              ))}
          </div>
        )
      )}
    </div>
  );
}
