import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { BotonIcono } from "@/components/ui-kit";

/** Columna vertical de iconos (Agregar, Editar, Copiar, Eliminar) igual a la hoja de Insumos. */
export function BarraIconosHoja({ objeto, haySeleccion, onAgregar, onEditar, onCopiar, onEliminar }: {
  objeto: string; haySeleccion: boolean;
  onAgregar: () => void; onEditar: () => void; onCopiar: () => void; onEliminar: () => void;
}) {
  return (
    <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
      <BotonIcono etiqueta={`Agregar ${objeto}`} title={`Agregar ${objeto}`} tono="primario" onClick={onAgregar}><Plus size={15} /></BotonIcono>
      <BotonIcono etiqueta={`Editar ${objeto}`} title={`Editar ${objeto}`} disabled={!haySeleccion} onClick={onEditar}><Pencil size={15} /></BotonIcono>
      <BotonIcono etiqueta={`Copiar ${objeto}`} title={`Copiar ${objeto}`} disabled={!haySeleccion} onClick={onCopiar}><Copy size={15} /></BotonIcono>
      <BotonIcono etiqueta={`Eliminar ${objeto}`} title={`Eliminar ${objeto}`} tono="peligro" disabled={!haySeleccion} onClick={onEliminar}><Trash2 size={15} /></BotonIcono>
    </div>
  );
}
