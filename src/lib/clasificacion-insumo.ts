import type { EspecialidadPartida } from "@/lib/especialidades";

/** Opción de un catálogo (especialidad o subfamilia) para los selectores con buscador. */
export type OpcionClasificacion = { value: string; texto: string; detalle?: string | undefined };

/** Especialidades que pueden formar un código: activas y con sus 2 dígitos. Conserva la asignada aunque se haya inactivado. */
export function opcionesEspecialidad(
  especialidades: EspecialidadPartida[],
  actualId?: string | null,
): OpcionClasificacion[] {
  return especialidades
    .filter((e) => (e.activo || e.id === actualId) && Boolean(e.codigo_modular))
    .map((e) => ({ value: e.id, texto: e.nombre, detalle: e.codigo_modular ?? undefined }));
}

/** Subfamilias de una especialidad. Sin especialidad no hay opciones; la asignada se mantiene aunque esté inactiva. */
export function opcionesSubfamilia(
  subfamilias: { id: string; especialidad_id: string; codigo: string; nombre: string; activo: boolean }[],
  especialidadId: string | null | undefined,
  actualId?: string | null,
): OpcionClasificacion[] {
  if (!especialidadId) return [];
  return subfamilias
    .filter((s) => s.especialidad_id === especialidadId && (s.activo || s.id === actualId))
    .map((s) => ({ value: s.id, texto: s.nombre, detalle: s.codigo }));
}

/** Tipos cuyo código lleva subfamilia (SS). Mano de obra y subcontratos no la usan nunca: sus dos dígitos van en 00. */
export function usaSubfamilia(tipo: string): boolean {
  return tipo !== "MO" && tipo !== "mano_obra" && tipo !== "SC" && tipo !== "subcontratos";
}

/** Reglas del código T+EE+SS+NNN: la especialidad siempre hace falta; la subfamilia, solo en materiales. */
export function validarClasificacion(tipo: string, especialidadId: string, subfamiliaId: string): string | null {
  if (!especialidadId) return "Elige la especialidad: con ella se genera el código.";
  if (!usaSubfamilia(tipo)) return null;
  if ((tipo === "MAT" || tipo === "materiales") && !subfamiliaId)
    return "Elige la subfamilia: los materiales la requieren.";
  return null;
}
