import { claveNombre } from "./formato-texto";

type FilaInsumo = { id?: string; descripcion?: string | null; estado?: string | null };

/** Busca un insumo con la misma descripción (ignora mayúsculas, tildes y espacios de más).
 *  Con `incluirInactivos` también considera filas inactivas del catálogo. */
export function buscarInsumoDuplicado<T extends FilaInsumo>(
  filas: T[],
  descripcion: string,
  excludeId?: string,
  incluirInactivos = false,
): T | null {
  const clave = claveNombre(descripcion);
  if (!clave) return null;
  return (
    filas.find(
      (f) => f.id !== excludeId && (incluirInactivos || f.estado !== "inactivo") && claveNombre(String(f.descripcion ?? "")) === clave,
    ) ?? null
  );
}
