import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Inbox, Info, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";


export function Panel({
  titulo,
  extra,
  children,
  className = "",
  colapsable = false,
  abierto = true,
  onAbrirCambiar,
}: {
  titulo?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  colapsable?: boolean;
  abierto?: boolean;
  onAbrirCambiar?: (v: boolean) => void;
}) {
  const plegado = colapsable && !abierto;
  const alternar = () => onAbrirCambiar?.(!abierto);
  return (
    <section className={`panel rise overflow-hidden ${className}`}>
      {(titulo || extra) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${plegado ? "" : "border-b border-line"}`}>
          <div className="flex min-w-0 items-center gap-2">
            {colapsable && (
              <button
                type="button"
                aria-expanded={abierto}
                onClick={alternar}
                title={abierto ? "Contraer" : "Desplegar"}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-muted"
              >
                <ChevronDown size={13} className={`transition-transform ${abierto ? "" : "-rotate-90"}`} />
              </button>
            )}
            {titulo &&
              (colapsable ? (
                <button type="button" aria-expanded={abierto} onClick={alternar} className="text-base font-semibold tracking-tight hover:text-primary">
                  {titulo}
                </button>
              ) : (
                <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
              ))}
          </div>
          {extra}
        </div>
      )}
      {!plegado && children}
    </section>
  );
}


export function VentanaFlotante({
  titulo,
  subtitulo,
  abierta,
  onCerrar,
  children,
  ancho = "max-w-5xl",
  ocultarBarra = false,
  pantallaCompleta = false,
}: {
  titulo: string;
  subtitulo?: string;
  abierta: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
  ocultarBarra?: boolean;
  pantallaCompleta?: boolean;
}) {
  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierta, onCerrar]);

  if (!abierta) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center bg-ink/40 ${pantallaCompleta ? "overflow-hidden p-2" : "overflow-y-auto p-4"} ${ocultarBarra ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`} onMouseDown={onCerrar}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(`panel flex ${pantallaCompleta ? "h-[calc(100dvh-1rem)]" : `my-4 ${ocultarBarra ? "max-h-[calc(100dvh-4rem)]" : "max-h-[calc(100vh-2rem)]"}`} w-full flex-col overflow-hidden shadow-xl`, ancho)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-ink">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
          </div>
          <Boton type="button" variante="linea" onClick={onCerrar} className="h-8 w-8 px-0" aria-label="Cerrar" title="Cerrar">
            <X size={14} />
          </Boton>
        </div>
        <div className={`min-h-0 ${pantallaCompleta ? "flex flex-1 flex-col overflow-hidden" : "overflow-y-auto"} ${ocultarBarra ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}>{children}</div>
      </section>
    </div>
  );
}

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-mono">{etiqueta}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const baseInput =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50";

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input {...props} className={cn(baseInput, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(baseInput, props.className)} />;
}

export function Boton({
  variante = "primario",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "linea" | "peligro" | "accion" }) {
  const estilos = {
    primario: "bg-primary text-primary-foreground hover:ring-2 hover:ring-cta/70",
    accion: "bg-primary font-semibold text-primary-foreground hover:brightness-95",
    linea: "border border-primary/40 bg-card text-primary hover:bg-primary hover:text-primary-foreground",
    peligro: "border border-bad/40 text-bad hover:bg-bad hover:text-paper",
  }[variante];
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-xs font-medium transition-colors disabled:opacity-50",
        estilos,
        className,
      )}
    />
  );
}

// Botón cuadrado para acciones de tabla: icono siempre del mismo tamaño,
// con tono según la acción (ver, editar, eliminar).
export function BotonIcono({
  etiqueta,
  tono = "neutro",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  etiqueta: string;
  tono?: "neutro" | "primario" | "peligro";
}) {
  const tonos = {
    neutro: "border-line bg-card text-muted-foreground hover:border-primary/45 hover:bg-primary/10 hover:text-primary",
    primario: "border-primary/25 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/12",
    peligro: "border-bad/30 bg-bad/5 text-bad hover:border-bad/50 hover:bg-bad/12",
  }[tono];
  return (
    <button
      {...props}
      data-tono={tono}
      title={etiqueta}
      aria-label={etiqueta}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-50",
        tonos,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Etiqueta({ tono, children }: { tono: "good" | "bad" | "warn" | "info" | "doc" | "neutro" | "apagado"; children: ReactNode }) {
  const c =
    tono === "good"
      ? "text-good bg-good/10 ring-good/20"
      : tono === "bad"
        ? "text-bad bg-bad/10 ring-bad/20"
        : tono === "warn"
          ? "text-warn bg-warn/10 ring-warn/25"
          : tono === "info"
            ? "text-info bg-info/10 ring-info/20"
            : tono === "doc"
              ? "text-primary bg-primary/10 ring-primary/25"
              : tono === "apagado"
                ? "text-muted-foreground bg-transparent ring-line/70 border border-dashed border-line"
                : "text-muted-foreground bg-muted ring-line";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ring-1 ${c}`}>
      {children}
    </span>
  );
}

export function Vacio({ texto, icono, accion }: { texto: string; icono?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
        {icono ?? <Inbox className="size-4" />}
      </span>
      <p className="font-mono text-xs text-muted-foreground">{texto}</p>
      {accion}
    </div>
  );
}

/** Cabecera común de módulo: ruta + título a la izquierda, contexto al centro, acciones a la derecha. */
export function CabeceraModulo({
  ruta,
  titulo,
  descripcion,
  icono,
  contexto,
  acciones,
}: {
  ruta?: string;
  titulo: string;
  descripcion?: string;
  icono?: ReactNode;
  contexto?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icono && <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icono}</div>}
        <div className="min-w-0">
          {ruta && <p className="label-mono text-muted-foreground">{ruta}</p>}
          <h1 className="truncate text-xl font-bold">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
      </div>
      {contexto && <div className="flex items-center gap-2">{contexto}</div>}
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

/** Pestañas internas uniformes. Variantes: "linea" subrayado, "boton" botones
 *  (activa rellena del color primario, inactivas con borde), "texto" solo texto,
 *  "capsula" pastillas para sub-pestañas dentro de una sección. */
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
  variante = "linea",
}: {
  opciones: { id: T; texto: ReactNode; icono?: ReactNode; derecha?: boolean }[];
  valor: T;
  onCambiar: (v: T) => void;
  etiqueta: string;
  variante?: "linea" | "capsula" | "boton" | "texto";
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={
        variante === "capsula"
          ? "inline-flex flex-wrap gap-1 rounded-lg border border-line bg-muted/50 p-1"
          : variante === "boton"
            ? "flex flex-wrap gap-2"
            : variante === "texto"
              ? "flex flex-wrap items-center gap-3 border-b border-line"
              : "flex flex-wrap gap-1 border-b border-line"
      }
    >
      {opciones.map((o) => {
        const activa = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambiar(o.id)}
            className={cn(
              variante === "capsula" &&
                "inline-flex min-h-8 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              variante === "boton" &&
                "inline-flex min-h-9 items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors",
              variante === "texto" && "inline-flex items-center gap-1.5 py-2 text-xs font-medium transition-colors",
              variante === "linea" &&
                "-mb-px inline-flex min-h-9 items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              o.derecha && "ml-auto",
              activa
                ? variante === "capsula"
                  ? "bg-card text-primary shadow-sm"
                  : variante === "boton"
                    ? "border-primary bg-primary text-primary-foreground"
                    : variante === "texto"
                      ? "text-ink"
                      : "border-primary text-primary"
                : variante === "capsula"
                  ? "text-muted-foreground hover:bg-card/60 hover:text-ink"
                  : variante === "boton"
                    ? "border-primary/40 bg-card text-primary hover:bg-primary/10"
                    : variante === "texto"
                      ? "text-muted-foreground hover:text-ink"
                      : "border-transparent text-muted-foreground hover:border-line hover:text-ink",
            )}
          >
            {o.icono && (
              <span className={cn("inline-flex items-center", activa && variante === "texto" && "text-primary")}>
                {o.icono}
              </span>
            )}
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}

/** Tarjeta de resumen: etiqueta (con cantidad), monto grande; color solo en alerta; clic opcional para filtrar. */
export type TipoDistintivo = "monto" | "avance" | "cantidad";
/** Deduce el tipo de dato de una tarjeta por su valor: S/ → monto, % → avance, resto → cantidad. */
export function tipoDistintivo(v: ReactNode): TipoDistintivo {
  const t = typeof v === "string" || typeof v === "number" ? String(v) : textoDe(v);
  if (/S\/|US\$|\$/.test(t)) return "monto";
  if (/%/.test(t)) return "avance";
  return "cantidad";
}
function textoDe(v: ReactNode): string {
  if (v == null || typeof v === "boolean") return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(textoDe).join("");
  const p = (v as { props?: { children?: ReactNode } }).props;
  return p ? textoDe(p.children) : "";
}

export function TarjetaResumen({
  etiqueta,
  cantidad,
  valor,
  alerta,
  activa,
  onClick,
  guia,
  tipo,
}: {
  guia?: ReactNode;
  tipo?: TipoDistintivo | undefined;
  etiqueta: string;
  cantidad?: number | undefined;
  valor: ReactNode;
  alerta?: "bad" | "warn" | undefined;
  activa?: boolean | undefined;
  onClick?: (() => void) | undefined;
}) {
  const color = alerta === "bad" ? "text-bad" : alerta === "warn" ? "text-warn" : "text-ink";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      data-distintivo={alerta ?? tipo ?? tipoDistintivo(valor)}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!activa : undefined}
      className={cn(
        "panel flex h-full w-full flex-col p-4 text-left transition-colors",
        onClick && "hover:border-primary/50",
        activa && "border-primary ring-2 ring-primary/30",
      )}
    >
      <p className="label-mono text-muted-foreground">
        {etiqueta}
        {cantidad !== undefined && ` (${cantidad})`}
      </p>
      <p className={cn("mt-1 truncate font-mono text-xl font-bold tabular-nums", color)}>{valor}</p>
      <p className="mt-0.5 min-h-[15px] truncate text-[11px] leading-[15px] text-muted-foreground">{guia}</p>
    </Comp>
  );
}

/** Filas grises mientras carga una tabla. */
export function FilasCargando({ filas = 6, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <>
      {Array.from({ length: filas }).map((_, i) => (
        <tr key={i} aria-hidden="true">
          {Array.from({ length: columnas }).map((_, j) => (
            <td key={j} className="px-3 py-1.5">
              <span className="block h-3 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SinAcceso() {
  return (
    <div className="panel p-10 text-center">
      <p className="label-mono">Acceso restringido</p>
      <h2 className="mt-2 text-lg font-semibold">Tu rol no tiene permiso para ver esta pantalla</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comunícate con el Gerente si necesitas acceso a este módulo.
      </p>
    </div>
  );
}

export function InfoTooltip({ content }: { content: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-ink focus:outline-none"
        onClick={() => setVisible((v) => !v)}
        aria-label="Información"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {visible && (
        <span className="absolute left-1/2 top-full z-50 mt-1.5 block w-56 -translate-x-1/2 rounded-md border border-line bg-paper p-2.5 text-[11px] leading-relaxed text-ink shadow-md">
          {content}
          <span className="absolute -top-1 left-1/2 block h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-line bg-paper" />
        </span>
      )}

    </span>
  );
}


/** Lupa con menú desplegable que agrupa la búsqueda y los filtros de la página.
 *  Va en la barra vertical derecha: dentro de BarraIconosHoja (prop `filtros`) o, si la
 *  pantalla no tiene barra, con `flotante` como barra propia fija al lado derecho. */
export function MenuFiltros({ activos, onLimpiar, children, flotante = false }: { activos: number; onLimpiar: () => void; children: ReactNode; flotante?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    panel.current?.querySelector<HTMLElement>("input, select")?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);
  useEffect(() => {
    if (!flotante) return;
    document.documentElement.classList.add("con-barra-filtros");
    return () => document.documentElement.classList.remove("con-barra-filtros");
  }, [flotante]);
  const lupa = (
    <div className="relative">
      <BotonIcono etiqueta="Buscar y filtrar" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className={cn("opacity-70 hover:opacity-100", abierto && "border-primary/50 text-primary opacity-100")}>
        <Search size={15} />
      </BotonIcono>
      {activos > 0 && (
        <span className="pointer-events-none absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-primary-foreground">{activos}</span>
      )}
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div ref={panel} className="absolute right-full top-0 z-50 mr-2 grid w-72 gap-2.5 rounded-md border border-line bg-paper p-3 text-left text-ink shadow-lg">
            {children}
            <button type="button" onClick={onLimpiar} className="justify-self-end text-[11px] text-primary hover:underline">Limpiar filtros</button>
          </div>
        </>
      )}
    </div>
  );
  if (!flotante) return lupa;
  return <div className="fixed right-3 top-24 z-30 flex flex-col gap-1.5 rounded-md border p-1.5 shadow-sm barra-iconos">{lupa}</div>;
}

/** Fila de tarjetas de resumen: etiqueta, dato principal grande y guía o dato secundario en letra pequeña. */
export function FranjaResumen({ items }: { items: { etiqueta: string; valor: ReactNode; tono?: string; guia?: ReactNode; tipo?: TipoDistintivo }[] }) {
  return (
    <div className="mb-4 grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((d) => (
        <TarjetaResumen key={d.etiqueta} etiqueta={d.etiqueta} valor={<span className={d.tono}>{d.valor}</span>} guia={d.guia} tipo={d.tipo ?? tipoDistintivo(d.valor)} />
      ))}
    </div>
  );
}
