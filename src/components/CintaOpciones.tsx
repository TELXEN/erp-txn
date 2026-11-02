import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Clock, Home, Palette, PanelLeft, Pin, Rows2, Rows3, Search, Star } from "lucide-react";
import { claveNombre } from "@/lib/formato-texto";

export type ModoNavegacion = "lateral" | "simplificada" | "clasica";
export type SubOpcionCinta = { texto: string; seccion?: string; campo?: string; icono?: React.ElementType; corto?: string; a?: string; grande?: boolean; search?: Record<string, string> };
export type ItemCinta = { a: string; texto: string; icono: React.ElementType; hijos?: ItemCinta[]; sub?: SubOpcionCinta[]; sub2?: { titulo: string; opciones: SubOpcionCinta[] }; subFilas?: number };
export type CategoriaCinta = { titulo: string; items: ItemCinta[] };

const CORTO: Record<string, string> = {
  "Finanzas y Contabilidad": "Finanzas",
  "Recursos Humanos": "Personal",
  "Temas de colores": "Temas",
};

/** Subgrupos de cada pestaña, en el orden del flujo de trabajo. */
const GRUPO: Record<string, string> = {
  "/clientes": "Clientes", "/datos-apu": "Presupuestar", "/cotizaciones": "Presupuestar",
  "/valorizaciones": "Preliquidaciones", "/registro-ventas": "Registro de Ventas",
  "/dashboard-proyectos": "Planificar", "/proyectos": "Planificar", "/partidas": "Planificar",
  "/gantt": "Ejecutar y controlar", "/avance": "Ejecutar y controlar", "/valorizaciones-obra": "Ejecutar y controlar",
  "/generar-requerimiento": "Solicitar", "/aprobaciones": "Solicitar",
  "/proveedores": "Socios", "/transportistas": "Socios",
  "/requerimientos": "Comprar", "/ordenes-compra": "Comprar", "/importaciones": "Comprar",
  "/vehiculos": "Vehículos",
  "/dashboard": "Análisis",
  "/gastos-directos": "Costos", "/gastos-generales": "Costos",
  "/tesoreria": "Caja y bancos", "/caja-chica": "Caja y bancos", "/sire": "SUNAT",
  "/personal": "Personal", "/tareo": "Personal",
  "/nomina": "Remuneraciones", "/honorarios": "Remuneraciones", "/beneficios": "Beneficios Sociales",
};
const INICIO = "__inicio";
const LS_REC = "erp-telxen-recientes";
const LS_FAV = "erp-telxen-favoritos";
function leerLista(k: string): string[] { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }

type Resultado = { a: string; texto: string; ruta: string; icono: React.ElementType; search?: Record<string, string> | undefined };
function Buscador({ items }: { items: Resultado[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [foco, setFoco] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === "q") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);
  const c = claveNombre(q);
  const res = c ? items.filter((r) => claveNombre(`${r.texto} ${r.ruta}`).includes(c)).slice(0, 8) : [];
  const ir = (r: Resultado) => { navigate({ to: r.a, search: (r.search ?? {}) as never }); setQ(""); ref.current?.blur(); };
  return (
    <div className="relative hidden shrink-0 md:block">
      <div className="flex h-7 w-44 items-center gap-1.5 rounded-md border border-cinta-borde bg-cinta-inf px-2 text-cinta-tenue focus-within:border-cinta-acento lg:w-48">
        <Search className="size-3.5 shrink-0" />
        <input ref={ref} value={q} placeholder="¿Qué desea hacer?" title="¿Qué desea hacer? (Alt+Q)" aria-label="Buscar módulo"
          onChange={(e) => { setQ(e.target.value); setSel(0); }} onFocus={() => setFoco(true)} onBlur={() => setTimeout(() => setFoco(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === "Enter" && res[sel]) ir(res[sel]);
            else if (e.key === "Escape") { setQ(""); ref.current?.blur(); }
          }}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-cinta-texto outline-none placeholder:text-cinta-tenue" />
      </div>
      {foco && c && (
        <div className="absolute left-0 top-8 z-[100] w-80 rounded-md border border-border bg-popover py-1 text-xs text-popover-foreground shadow-lg">
          {res.length === 0 && <p className="px-3 py-2 text-muted-foreground">Sin resultados</p>}
          {res.map((r, i) => { const I = r.icono; return (
            <button key={r.a + r.texto} type="button" onMouseDown={(e) => { e.preventDefault(); ir(r); }} onMouseEnter={() => setSel(i)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${i === sel ? "bg-accent text-accent-foreground" : ""}`}>
              <I className="size-4 shrink-0" /><span className="flex-1 truncate">{r.texto}</span>
              <span className="truncate text-[10px] text-muted-foreground">{r.ruta}</span>
            </button>); })}
        </div>
      )}
    </div>
  );
}

function SubMenu({ a, sub, onIr }: { a: string; sub: SubOpcionCinta[]; onIr?: (destino: string) => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!pos) return;
    const cerrar = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.("[data-submenu-cinta]")) setPos(null); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [pos]);
  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    setPos((p) => (p || !r ? null : { x: r.left, y: r.bottom + 2 }));
  };
  return (
    <>
      <button ref={ref} type="button" data-submenu-cinta aria-label="Ver secciones" onClick={abrir}
        className="absolute bottom-0 right-0 grid size-4 place-items-center rounded text-cinta-tenue hover:bg-cinta-hover">
        <ChevronDown className="size-3" />
      </button>
      {pos && createPortal(
        <div data-submenu-cinta style={{ left: pos.x, top: pos.y }}
          className="fixed z-[100] min-w-56 rounded-md border border-border bg-popover py-1 text-xs text-popover-foreground shadow-lg">
          {sub.map((o) => {
            const cls = "block px-3 py-1.5 hover:bg-accent hover:text-accent-foreground";
            return o.a ? (
              <Link key={o.a} to={o.a} {...(o.search ? { search: o.search as never } : {})} onClick={() => { setPos(null); onIr?.(o.a ?? a); }} className={cls}>{o.texto}</Link>
            ) : (
              <Link key={o.seccion} to={a} search={{ [o.campo ?? "seccion"]: o.seccion } as never} onClick={() => { setPos(null); onIr?.(a); }} className={cls}>{o.texto}</Link>
            );
          })}
        </div>, document.body)}
    </>
  );
}

function contiene(c: CategoriaCinta, p: string) {
  return c.items.some((m) => m.a === p || m.hijos?.some((h) => h.a === p) || m.sub?.some((o) => (o.a ?? m.a) === p) || m.sub2?.opciones.some((o) => (o.a ?? m.a) === p));
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
          <div className="my-1 border-t border-border" />
          <Link to="/tema-colores" onClick={() => setAbierto(false)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted">
            <Palette className="size-4" /> Temas de colores
          </Link>
        </div>
      )}
    </div>
  );
}

export function SelectorModoLateral(props: { modo: ModoNavegacion; onModo: (m: ModoNavegacion) => void }) {
  return <SelectorModo {...props} contraida={false} onContraer={() => {}} />;
}

export type ContextoCinta = { titulo: string; subtitulo: string };

/** Grupo de botones con título opcional dentro de la pestaña contextual de la cinta. */
export function GrupoCinta({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="grupo-cinta flex flex-col justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {titulo && <p className="whitespace-nowrap pt-0.5 text-center text-[10px] text-cinta-tenue">{titulo}</p>}
    </div>
  );
}

export function CintaOpciones({ categorias, pathname, modo, onModo, distintivo, logo, usuario, pantallaCompleta, contextual, onRanuraContextual }: {
  categorias: CategoriaCinta[]; pathname: string; modo: Exclude<ModoNavegacion, "lateral">;
  onModo: (m: ModoNavegacion) => void; distintivo: (a: string) => number; logo: React.ReactNode;
  usuario?: React.ReactNode; pantallaCompleta?: React.ReactNode;
  contextual?: ContextoCinta | null; onRanuraContextual?: (el: HTMLDivElement | null) => void;
}) {
  categorias = categorias.filter((c) => c.titulo !== "Temas de colores");
  const plano = categorias.flatMap((c) => c.items.flatMap((m) => (m.hijos ?? [m]).map((h) => ({ ...h, cat: CORTO[c.titulo] ?? c.titulo }))));
  // Rutas del menú, incluidas las que una opción de submenú lleva a otra pantalla.
  const rutas = plano.flatMap((m) => [m.a, ...(m.sub ?? []).map((o) => o.a ?? m.a), ...(m.sub2?.opciones ?? []).map((o) => o.a ?? m.a)]);
  const resultados: Resultado[] = plano.flatMap((m) => {
    const s2 = m.sub2;
    return [
      { a: m.a, texto: m.texto, ruta: m.cat, icono: m.icono },
      ...(m.sub ?? []).map((o) => ({ a: o.a ?? m.a, texto: o.texto, ruta: `${m.cat} › ${m.texto}`, icono: o.icono ?? m.icono, search: o.a ? o.search : ({ [o.campo ?? "seccion"]: o.seccion ?? "" } as Record<string, string>) })),
      ...(s2 ? s2.opciones.map((o) => ({ a: o.a ?? m.a, texto: o.texto, ruta: `${m.cat} › ${s2.titulo}`, icono: o.icono ?? m.icono, search: o.a ? undefined : ({ [o.campo ?? "seccion"]: o.seccion ?? "" } as Record<string, string>) })) : []),
    ];
  });
  const [recientes, setRecientes] = useState<string[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  useEffect(() => { setRecientes(leerLista(LS_REC)); setFavoritos(leerLista(LS_FAV)); }, []);
  useEffect(() => {
    if (!rutas.includes(pathname)) return;
    setRecientes((r) => { const n = [pathname, ...r.filter((x) => x !== pathname)].slice(0, 5); try { localStorage.setItem(LS_REC, JSON.stringify(n)); } catch { /* */ } return n; });
  }, [pathname]);
  const alternarFav = (a: string) => setFavoritos((f) => { const n = f.includes(a) ? f.filter((x) => x !== a) : [...f, a]; try { localStorage.setItem(LS_FAV, JSON.stringify(n)); } catch { /* */ } return n; });
  const activa = categorias.find((c) => contiene(c, pathname))?.titulo ?? categorias[0]?.titulo;
  const [pestana, setPestana] = useState(activa);
  const [contraida, setContraida] = useState(false);
  useEffect(() => { try { setContraida(localStorage.getItem("erp-telxen-cinta-contraida") === "1"); } catch { /* */ } }, []);
  useEffect(() => { setPestana(activa); }, [activa]);
  // Las acciones de la pantalla abierta se muestran siempre a la derecha de la cinta, junto a los botones de su categoría.
  const enCtx = !!contextual && pestana === activa;
  const alternarContraer = () => setContraida((v) => { try { localStorage.setItem("erp-telxen-cinta-contraida", v ? "0" : "1"); } catch { /* */ } return !v; });
  const enInicio = pestana === INICIO;
  const clicPestana = (t: string) => {
    if (contraida && pestana === t) alternarContraer();
    if (t === pestana) return;
    setPestana(t);
  };
  const cat = enInicio ? null : categorias.find((c) => c.titulo === pestana) ?? categorias[0];

  const Insignia = ({ a }: { a: string }) => {
    const n = distintivo(a);
    return n > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold leading-[14px] text-destructive-foreground">{n}</span> : null;
  };

  const boton = (m: ItemCinta) => {
    const act = pathname === m.a;
    const I = m.icono;
    const tono = act ? "bg-cinta-acento text-cinta-acento-foreground font-semibold" : "text-cinta-texto hover:bg-cinta-hover";
    if (modo === "simplificada") {
      const link = (
        <Link key={m.a} to={m.a} title={`${m.texto} — clic derecho: ${favoritos.includes(m.a) ? "quitar de" : "anclar a"} Inicio`} onContextMenu={(e) => { e.preventDefault(); alternarFav(m.a); }}
          className={`relative flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs ${tono}`}>
          <I className="size-4 shrink-0" /> {m.texto}<Insignia a={m.a} />
        </Link>
      );
      return m.sub ? <div key={m.a} className="relative flex shrink-0 pr-3">{link}<SubMenu a={m.a} sub={[...m.sub, ...(m.sub2?.opciones ?? [])]} /></div> : link;
    }
    const link = (
      <Link key={m.a} to={m.a} title={`${m.texto} — clic derecho: ${favoritos.includes(m.a) ? "quitar de" : "anclar a"} Inicio`} onContextMenu={(e) => { e.preventDefault(); alternarFav(m.a); }}
        className={`relative flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-center text-[11px] leading-tight ${tono}`}>
        <I className="size-6 shrink-0" />
        <span className="line-clamp-2">{m.texto}</span><Insignia a={m.a} />
        {favoritos.includes(m.a) && <Star className="absolute left-1 top-1 size-2.5 fill-current text-cinta-acento" />}
      </Link>
    );
    if (m.sub && m.sub.every((o) => o.icono)) {
      const subs = m.sub.slice(0, 8);
      // Puede haber más de un botón grande: cada uno ocupa su propia columna a la izquierda.
      const idxGrande = subs.map((o, i) => (o.grande ? i : -1)).filter((i) => i >= 0);
      const nGrande = idxGrande.length;
      const hayGrande = nGrande > 0;
      const nPeq = subs.length - nGrande;
      // Con dos opciones van lado a lado; con más, se reparten en dos filas.
      const filas = subs.length > 2 || hayGrande ? 2 : 1;
      // Con más filas (p. ej. tres opciones pequeñas bajo el botón grande) las filas se afinan para no agrandar la cinta.
      const filasPeq = m.subFilas ?? 2;
      const alto = filasPeq > 2 ? 20 : 24;
      const padBloque = filasPeq > 2 ? "py-1" : "py-2.5";
      // Los grandes ocupan todas las filas a la izquierda; las demás se reparten en columnas a su derecha.
      // Cada columna mide lo que mide su etiqueta más larga: así las opciones cortas no arrastran huecos.
      const colsPeq = Math.ceil(nPeq / filasPeq);
      const cols = hayGrande ? nGrande + colsPeq : Math.min(4, Math.ceil(subs.length / filas));
      const celda = (o: NonNullable<ItemCinta["sub"]>[number], i: number) => {
        const SI = o.icono;
        if (!SI) return null;
        const rGrande = idxGrande.indexOf(i);
        const grande = rGrande >= 0;
        // Las pequeñas se leen por filas: primero la fila de arriba, luego la de abajo.
        const j = subs.slice(0, i).filter((x) => !x.grande).length;
        // Con una sola pequeña, ocupa todo el alto para quedar centrada junto a los grandes.
        const sitio = hayGrande ? (grande ? { gridColumn: rGrande + 1, gridRow: `1 / span ${filasPeq}` }
          : nPeq === 1 ? { gridColumn: nGrande + 1, gridRow: `1 / span ${filasPeq}` }
          : { gridColumn: nGrande + 1 + (j % colsPeq), gridRow: 1 + Math.floor(j / colsPeq) }) : undefined;
        const cls = `whitespace-nowrap rounded text-[11px] ${grande ? "flex h-full min-w-[84px] flex-col items-center justify-center gap-1 px-1.5" : "flex h-full min-w-[76px] items-center gap-1.5 px-1.5"}`;
        const contenido = grande ? <><SI className="size-6 shrink-0" /><span>{o.corto ?? o.texto}</span></> : <><SI className="size-3.5 shrink-0" /> {o.corto ?? o.texto}</>;

        if (o.a) {
          return (
            <Link key={o.a} to={o.a} title={o.texto} className={cls} {...(sitio ? { style: sitio } : {})} {...(o.search ? { search: o.search as never } : {})}
              activeOptions={{ includeSearch: true }}
              activeProps={{ className: "bg-cinta-acento text-cinta-acento-foreground font-semibold" }}
              inactiveProps={{ className: "text-cinta-texto hover:bg-cinta-hover" }}>{contenido}</Link>
          );
        }
        return (
          <Link key={o.seccion} to={m.a} search={{ [o.campo ?? "seccion"]: o.seccion } as never} title={o.texto} className={cls} {...(sitio ? { style: sitio } : {})}
            activeOptions={{ includeSearch: true }}
            activeProps={{ className: "bg-cinta-acento text-cinta-acento-foreground font-semibold" }}
            inactiveProps={{ className: "text-cinta-texto hover:bg-cinta-hover" }}>{contenido}</Link>
        );
      };
      return (
        <div key={m.a} className={`grid shrink-0 content-center ${padBloque}`} style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridAutoRows: `${alto}px`, columnGap: 6 }}>
          {subs.map(celda)}
        </div>
      );
    }
    return m.sub ? <div key={m.a} className="relative flex shrink-0">{link}<SubMenu a={m.a} sub={[...m.sub, ...(m.sub2?.opciones ?? [])]} /></div> : link;
  };

  // En la clásica: los ítems simples forman un grupo con el nombre de la pestaña; cada submenú es su propio grupo.
  const porGrupo = (lista: ItemCinta[], defecto: string) => {
    const g: { titulo: string; items: ItemCinta[]; sub?: boolean; mezcla?: boolean }[] = [];
    for (const m of lista) {
      if (m.hijos) { g.push({ titulo: m.texto, items: m.hijos }); continue; }
      if (m.sub && m.sub.every((o) => o.icono)) {
        const t = GRUPO[m.a];
        if (t) {
          // El ítem se integra en el grupo que le corresponde (p. ej. Gastos Generales dentro de Costos).
          const e = g.find((x) => x.titulo === t);
          if (e) { e.items.push(m); e.mezcla = true; } else g.push({ titulo: t, items: [m], mezcla: true });
        } else {
          g.push({ titulo: m.texto, items: [m], sub: true });
        }
        // Un ítem puede aportar un segundo grupo (p. ej. Operaciones especiales junto a Facturación Electrónica).
        if (m.sub2) { const { sub2, ...resto } = m; g.push({ titulo: sub2.titulo, items: [{ ...resto, sub: sub2.opciones }], sub: true }); }
        continue;
      }
      const t = GRUPO[m.a] ?? defecto; const e = g.find((x) => x.titulo === t);
      e ? e.items.push(m) : g.push({ titulo: t, items: [m] });
    }
    return g;
  };
  const buscar = (a: string) => plano.find((m) => m.a === a);
  const gruposVista = enInicio
    ? [
        { titulo: "Favoritos", items: favoritos.map(buscar).filter(Boolean) as ItemCinta[], sub: false },
        { titulo: "Recientes", items: recientes.filter((a) => !favoritos.includes(a)).map(buscar).filter(Boolean) as ItemCinta[], sub: false },
      ]
    : cat ? porGrupo(cat.items, CORTO[cat.titulo] ?? cat.titulo) : [];
  const visibles = gruposVista.filter((g) => g.items.length);
  // Cada grupo queda enmarcado por líneas verticales finas a la izquierda y a la derecha.
  const clasesGrupo = (g: { titulo: string; items: ItemCinta[]; sub?: boolean }, i: number) => {
    const izq = g.sub ? !visibles[i - 1]?.sub : i > 0;
    const der = g.sub || i === visibles.length - 1;
    return `flex shrink-0 flex-col ${izq ? "border-l border-cinta-tenue/70" : ""} ${der ? "border-r border-cinta-tenue/70" : ""} ${g.sub ? "px-1.5" : "px-1"}`;
  };


  return (
    <div className="cinta-opciones no-print shrink-0 border-b border-cinta-borde bg-cinta-inf text-cinta-texto">
      <div className="flex h-9 items-center gap-1 bg-cinta-sup px-2">
        {logo}
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          <button type="button" role="tab" aria-selected={enInicio} title="Favoritos y recientes"
            onClick={() => clicPestana(INICIO)}
            className={`relative flex h-9 shrink-0 items-center gap-1 whitespace-nowrap px-2.5 text-[13px] transition-colors hover:bg-cinta-hover ${enInicio ? "font-semibold" : "text-cinta-tenue"}`}>
            <Home className="size-3.5" /> Inicio
            {enInicio && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-cinta-acento" />}
          </button>
          {categorias.map((c) => {
            const sel = c.titulo === pestana;
            return (
              <button key={c.titulo} type="button" role="tab" aria-selected={sel}
                title={c.titulo === activa && contextual ? contextual.titulo : undefined}
                onClick={() => clicPestana(c.titulo)}
                className={`relative h-9 shrink-0 whitespace-nowrap px-2.5 text-[13px] transition-colors hover:bg-cinta-hover ${sel ? "font-semibold" : "text-cinta-tenue"}`}>
                {CORTO[c.titulo] ?? c.titulo}
                {sel && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-cinta-acento" />}
              </button>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <Buscador items={resultados} />
          {usuario}
          {pantallaCompleta}
          <SelectorModo modo={modo} onModo={onModo} contraida={contraida} onContraer={alternarContraer} />
        </div>
      </div>
      {!contraida && (
        <div className={`flex ${modo === "simplificada" ? "h-11 items-center gap-1" : "items-stretch pt-1"} overflow-x-auto border-t border-cinta-borde bg-cinta-inf px-2`}>
          {enInicio && !favoritos.length && !recientes.length && (
            <p className="flex items-center gap-2 px-2 py-3 text-xs text-cinta-tenue"><Pin className="size-4" /> Haz clic derecho en cualquier botón para anclarlo aquí.</p>
          )}
          {visibles.map((g, i) => modo === "simplificada" ? (
            <div key={g.titulo} className={`flex items-center gap-1 ${i ? "border-l border-cinta-borde pl-1" : ""}`}>{g.items.map(boton)}</div>
          ) : (
            <div key={g.titulo} className={clasesGrupo(g, i)}>
              <div className={`flex flex-1 gap-0.5 ${g.sub ? "items-center" : "items-start"}`}>{g.items.map(boton)}</div>
              <p className="flex items-center justify-center gap-1 whitespace-nowrap py-0.5 text-center text-[10px] text-cinta-tenue">
                {g.titulo === "Recientes" && <Clock className="size-2.5" />}{g.titulo === "Favoritos" && <Star className="size-2.5" />}{g.titulo}
              </p>
            </div>
          ))}
          {enCtx && (
            <div ref={onRanuraContextual}
              className="ml-auto flex min-h-11 shrink-0 items-stretch gap-2 border-l border-cinta-borde py-1.5 pl-2 text-xs [&>div]:flex [&>div]:flex-wrap [&>div]:items-center [&>div]:gap-2 [&_.grupo-cinta+.grupo-cinta]:border-l [&_.grupo-cinta+.grupo-cinta]:border-cinta-borde [&_.grupo-cinta+.grupo-cinta]:pl-2" />
          )}
        </div>
      )}
    </div>
  );
}
