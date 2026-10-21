import type { ReactNode } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { BotonIcono } from "@/components/ui-kit";

/** Columna vertical de iconos (Agregar, Editar, Copiar, Eliminar) igual a la hoja de Insumos.
 *  Las acciones omitidas no se muestran; `extras` va en un bloque inferior. */
export function BarraIconosHoja({ objeto, haySeleccion, onAgregar, onEditar, onCopiar, onEliminar, extras }: {
  objeto: string; haySeleccion: boolean;
  onAgregar?: (() => void) | undefined; onEditar?: (() => void) | undefined; onCopiar?: (() => void) | undefined; onEliminar?: (() => void) | undefined;
  extras?: ReactNode | undefined;
}) {
  return (
    <div className="sticky top-2 flex h-fit shrink-0 flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
      {onAgregar && <BotonIcono etiqueta={`Agregar ${objeto}`} tono="primario" onClick={onAgregar}><Plus size={15} /></BotonIcono>}
      {onEditar && <BotonIcono etiqueta={`Editar ${objeto}`} disabled={!haySeleccion} onClick={onEditar}><Pencil size={15} /></BotonIcono>}
      {onCopiar && <BotonIcono etiqueta={`Copiar ${objeto}`} disabled={!haySeleccion} onClick={onCopiar}><Copy size={15} /></BotonIcono>}
      {onEliminar && <BotonIcono etiqueta={`Eliminar ${objeto}`} tono="peligro" disabled={!haySeleccion} onClick={onEliminar}><Trash2 size={15} /></BotonIcono>}
      {extras && <div className="mt-1 flex flex-col gap-1.5 border-t pt-2.5">{extras}</div>}
    </div>
  );
}
