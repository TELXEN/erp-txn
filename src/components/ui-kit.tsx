import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";


export function Panel({
  titulo,
  extra,
  children,
  className = "",
}: {
  titulo?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel rise overflow-hidden ${className}`}>
      {(titulo || extra) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          {titulo && <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>}
          {extra}
        </div>
      )}
      {children}
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
}: {
  titulo: string;
  subtitulo?: string;
  abierta: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
  ocultarBarra?: boolean;
}) {
  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierta, onCerrar]);

  if (!abierta) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 ${ocultarBarra ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`} onMouseDown={onCerrar}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`panel my-4 flex ${ocultarBarra ? "max-h-[calc(100dvh-4rem)]" : "max-h-[calc(100vh-2rem)]"} w-full flex-col overflow-hidden shadow-xl ${ancho}`}
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
        <div className={`min-h-0 overflow-y-auto ${ocultarBarra ? "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}>{children}</div>
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
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Boton({
  variante = "primario",
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
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-xs font-medium transition-colors disabled:opacity-50 ${estilos} ${props.className ?? ""}`}
    />
  );
}

export function Etiqueta({ tono, children }: { tono: "good" | "bad" | "warn" | "neutro"; children: ReactNode }) {
  const c =
    tono === "good"
      ? "text-good bg-good/10 ring-good/20"
      : tono === "bad"
        ? "text-bad bg-bad/10 ring-bad/20"
        : tono === "warn"
          ? "text-warn bg-warn/10 ring-warn/25"
          : "text-muted-foreground bg-muted ring-line";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ring-1 ${c}`}>
      {children}
    </span>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="px-5 py-8 text-center font-mono text-xs text-muted-foreground">{texto}</p>;
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

