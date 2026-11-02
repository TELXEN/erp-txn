import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, PencilRuler } from "lucide-react";
import { GrupoCinta } from "@/components/CintaOpciones";
import { cn } from "@/lib/utils";

type Base = { icono: ReactNode; texto: string; onClick?: () => void; disabled?: boolean; activo?: boolean; title?: string | undefined };

/** Botón grande de la cinta de cotización (icono arriba, rótulo en hasta dos líneas). */
export function BotonGrande({ icono, texto, onClick, disabled, activo, title }: Base) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-pressed={activo}
      className={cn("flex h-[68px] min-w-[56px] max-w-[84px] flex-col items-center justify-start gap-1 rounded-md px-1.5 pt-1.5 text-center text-[11px] leading-tight text-cinta-texto transition-colors hover:bg-black/5 disabled:opacity-40",
        activo && "cinta-activo bg-primary text-primary-foreground hover:bg-primary")}>
      <span className="[&>svg]:size-7 [&>svg]:stroke-[1.4]">{icono}</span>
      <span className="whitespace-pre-line">{texto}</span>
    </button>
  );
}

/** Botón pequeño (icono + texto) para columnas de tres filas. */
export function BotonPequeno({ icono, texto, onClick, disabled, title }: Base) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="flex h-[20px] items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-[11px] text-cinta-texto transition-colors hover:bg-black/5 disabled:opacity-40 [&_svg]:size-3.5">
      {icono}{texto}
    </button>
  );
}

export function Columna({ children }: { children: ReactNode }) {
  return <div className="flex h-[68px] flex-col items-start justify-start gap-0.5 pt-0.5">{children}</div>;
}

/** Grupo «Vista»: sustituye a las pestañas Volver · Edición · Vista previa. */
export function GrupoVista({ id, modo, onVolver }: { id: string; modo: "edicion" | "vista"; onVolver?: () => void }) {
  return (
    <GrupoCinta titulo="Vista">
      {onVolver ? (
        <BotonGrande icono={<ArrowLeft />} texto="Volver" onClick={onVolver} />
      ) : (
        <Link to="/cotizaciones" search={{}}><BotonGrande icono={<ArrowLeft />} texto="Volver" /></Link>
      )}
      {modo === "edicion" ? (
        <BotonGrande icono={<PencilRuler />} texto="Edición" activo />
      ) : (
        <Link to="/cotizaciones" search={{ abrir: id }}><BotonGrande icono={<PencilRuler />} texto="Edición" /></Link>
      )}
      {modo === "vista" ? (
        <BotonGrande icono={<Eye />} texto={"Vista\nprevia"} activo />
      ) : (
        <Link to="/cotizacion-vista" search={{ id }}><BotonGrande icono={<Eye />} texto={"Vista\nprevia"} /></Link>
      )}
    </GrupoCinta>
  );
}
