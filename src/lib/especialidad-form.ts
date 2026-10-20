import { claveNombre, formatearTexto } from "@/lib/formato-texto";

export function validarEspecialidad(
  codigo: string,
  nombre: string,
  lista: { id: string; codigo: string; nombre: string; activo: boolean }[],
  exceptoId?: string,
) {
  if (!/^[0-9]{2}$/.test(codigo) || codigo === "00") return "El código debe tener 2 dígitos (01–99).";
  const limpio = formatearTexto(nombre, "mayusculas");
  if (!limpio) return "Escribe el nombre de la especialidad.";
  if (lista.some((e) => e.id !== exceptoId && claveNombre(e.nombre) === claveNombre(limpio)))
    return `La especialidad «${limpio}» ya existe.`;
  if (lista.some((e) => e.activo && e.id !== exceptoId && e.codigo === codigo))
    return `El código ${codigo} ya existe.`;
  return "";
}