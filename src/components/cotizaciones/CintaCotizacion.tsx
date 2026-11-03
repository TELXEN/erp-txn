import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Pencil, Undo2 } from "lucide-react";


import { GrupoCinta } from "@/components/CintaOpciones";
import { cn } from "@/lib/utils";

/** Rutas que la cinta conserva visibles mientras se edita o se ve una cotización. */
export const SOLO_COTIZ = ["/cotizaciones"];

type Base = { icono: ReactNode; texto: string; onClick?: () => void; disabled?: boolean; activo?: boolean; title?: string | undefined };

/** Botón grande de la cinta de cotización (icono arriba, rótulo en hasta dos líneas). */
export function BotonGrande({ icono, texto, onClick, disabled, activo, title }: Base) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-pressed={activo}
      className={cn("flex h-[76px] min-w-[56px] max-w-[84px] flex-col items-center justify-start gap-1 rounded-md px-1.5 pt-1.5 text-center text-[11px] leading-tight text-cinta-texto transition-colors hover:bg-black/5 disabled:opacity-40",
        activo && "cinta-activo bg-primary text-primary-foreground hover:bg-primary")}>
      <span className="[&>svg]:!size-8 [&>svg]:stroke-[1.75] [&>svg]:text-[var(--color-cinta-icono)]">{icono}</span>
      <span className="whitespace-pre-line">{texto}</span>
    </button>
  );
}

/** Botón pequeño (icono + texto) para columnas de tres filas. */
export function BotonPequeno({ icono, texto, onClick, disabled, title }: Base) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-[11px] text-cinta-texto transition-colors hover:bg-black/5 disabled:opacity-40 [&_svg]:size-4 [&_svg]:stroke-[2.25] [&_svg]:text-[var(--color-cinta-icono)]">
      {icono}{texto}
    </button>
  );
}

export function Columna({ children }: { children: ReactNode }) {
  return <div className="flex h-[76px] flex-col items-start justify-start gap-0.5 pt-0.5">{children}</div>;
}

/** Grupo «Vista»: sustituye a las pestañas Volver · Edición · Vista previa. */
export function GrupoVista({ id, modo, onVolver }: { id: string; modo: "edicion" | "vista"; onVolver?: () => void }) {
  return (
    <GrupoCinta titulo="Vista">
      {onVolver ? (
        <BotonGrande icono={<Undo2 />} texto="Volver" onClick={onVolver} />
      ) : (
        <Link to="/cotizaciones" search={{}}><BotonGrande icono={<Undo2 />} texto="Volver" /></Link>

      )}
      {modo === "vista" && (
        <Link to="/cotizaciones" search={{ abrir: id }}><BotonGrande icono={<Pencil />} texto="Edición" /></Link>
      )}
      {modo === "edicion" && (
        <Link to="/cotizacion-vista" search={{ id }}><BotonGrande icono={<Eye />} texto={"Vista\nprevia"} /></Link>
      )}
    </GrupoCinta>
  );
}
