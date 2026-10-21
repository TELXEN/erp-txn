/** Desagregado de gastos generales de una cotización: filas planas (orden + nivel). */
export type NivelGG = "bloque" | "grupo" | "item";
export type FilaGG = {
  id: string;
  cotizacion_id: string;
  orden: number;
  nivel: NivelGG;
  descripcion: string;
  unidad: string;
  cantidad: number;
  tiempo: number;
  precio_unitario: number;
};

export const parcialGG = (f: Pick<FilaGG, "cantidad" | "tiempo" | "precio_unitario">) =>
  Math.round(Number(f.cantidad || 0) * Number(f.tiempo || 0) * Number(f.precio_unitario || 0) * 100) / 100;

export const totalGG = (filas: FilaGG[]) =>
  Math.round(filas.filter((f) => f.nivel === "item").reduce((s, f) => s + parcialGG(f), 0) * 100) / 100;

/** % GG = total GG ÷ costo directo × 100 (2 decimales); 0 si no hay costo directo. */
export const pctGG = (total: number, costoDirecto: number) =>
  costoDirecto > 0 ? Math.round((total / costoDirecto) * 100 * 100) / 100 : 0;

const RANGO: Record<NivelGG, number> = { bloque: 0, grupo: 1, item: 2 };

/** Numeración por posición: bloque 1, grupo 1.1, ítem 1.1.1 (salta niveles ausentes). */
export function numerarGG(filas: FilaGG[]): Map<string, string> {
  const c = [0, 0, 0];
  const res = new Map<string, string>();
  for (const f of filas) {
    const r = RANGO[f.nivel];
    c[r] = (c[r] ?? 0) + 1;
    for (let k = r + 1; k < 3; k++) c[k] = 0;
    res.set(f.id, c.slice(0, r + 1).map((n) => n || 1).join("."));
  }
  return res;
}

/** Subtotal de un bloque o grupo: suma de ítems hasta el siguiente encabezado de igual o mayor rango. */
export function subtotalGG(filas: FilaGG[], idx: number): number {
  const r = RANGO[filas[idx]!.nivel];
  let s = 0;
  for (let i = idx + 1; i < filas.length; i++) {
    const f = filas[i]!;
    if (RANGO[f.nivel] <= r) break;
    if (f.nivel === "item") s += parcialGG(f);
  }
  return Math.round(s * 100) / 100;
}

/** Fin (exclusivo) del bloque de la fila idx, incluyendo descendientes. */
export function finBloqueGG(filas: FilaGG[], idx: number): number {
  const r = RANGO[filas[idx]!.nivel];
  let i = idx + 1;
  while (i < filas.length && RANGO[filas[i]!.nivel] > r) i++;
  return i;
}

/** Mueve la fila idx (con descendientes) intercambiándola con su hermano contiguo. Devuelve nuevo arreglo o null. */
export function moverGG(filas: FilaGG[], idx: number, dir: -1 | 1): FilaGG[] | null {
  const r = RANGO[filas[idx]!.nivel];
  const fin = finBloqueGG(filas, idx);
  if (dir === 1) {
    if (fin >= filas.length || RANGO[filas[fin]!.nivel] !== r) return null;
    const fin2 = finBloqueGG(filas, fin);
    return [...filas.slice(0, idx), ...filas.slice(fin, fin2), ...filas.slice(idx, fin), ...filas.slice(fin2)];
  }
  let j = idx - 1;
  while (j >= 0 && RANGO[filas[j]!.nivel] > r) j--;
  if (j < 0 || RANGO[filas[j]!.nivel] !== r) return null;
  return [...filas.slice(0, j), ...filas.slice(idx, fin), ...filas.slice(j, idx), ...filas.slice(fin)];
}

const I = (d: string, u = "und-mes") => ({ nivel: "item" as const, descripcion: d, unidad: u });
/** Estructura estándar precargada la primera vez. */
export const ESTRUCTURA_GG: { nivel: NivelGG; descripcion: string; unidad?: string }[] = [
  { nivel: "bloque", descripcion: "GASTOS VARIABLES (No relacionados con el tiempo de ejecución de la obra)" },
  { nivel: "grupo", descripcion: "Gastos de Licitación y Contratación" },
  I("Compra de bases de licitación"), I("Visita a obra para formulación de propuesta"), I("Gastos notariales"),
  I("Tasas y comisiones por fianzas"), I("Costos por elaboración de propuesta"), I("Estudios previos para formulación de propuesta"),
  { nivel: "grupo", descripcion: "Gastos Indirectos Varios" },
  I("Investigaciones y estudios aplicados a propuestas no adjudicadas"), I("Gastos de licitación no adjudicadas"),
  I("Gastos notariales y legales relativos a la empresa en general"), I("Seguros contra siniestros relativos a la empresa"),
  I("Auditorías y trabajos especializados de la empresa"), I("Pagos por uso de licencias y obligaciones tributarias"),
  { nivel: "bloque", descripcion: "GASTOS FIJOS (Relacionados con el tiempo de ejecución de la obra)" },
  { nivel: "grupo", descripcion: "Gastos de Administración de Obra" },
  I("Sueldos, bonificaciones y beneficios sociales (personal técnico - administrativo)"), I("Gastos de supervisión"),
  I("Gastos de ingeniero de seguridad"), I("Gastos de ingeniero de calidad"),
  I("Jornales, bonificaciones y beneficios sociales (personal de mantenimiento, vigilancia, etc.)", "año"),
  I("Gastos por traslado de personal", "mes"), I("Útiles de escritorio y papelería en general de oficina"),
  I("Copias e impresiones de planos"), I("Amortización de instrumentos de ingeniería y equipamiento de oficina en campamentos"),
  I("Pasajes y viáticos del personal de obra"), I("Botiquín"), I("Mantenimiento de campamento"),
  { nivel: "grupo", descripcion: "Gastos de Administración de Oficina" },
  I("Dietas del directorio"), I("Sueldos del personal directivo de obra"), I("Sueldos del personal de administración"),
  I("Alquiler de locales"), I("Luz, agua, teléfonos, correos"), I("Impresiones y papelería de oficinas"),
  I("Copias e impresión de planos"), I("Amortización de equipos de oficina"), I("Pasajes y viáticos del personal de oficina"),
  { nivel: "grupo", descripcion: "Gastos Financieros relativos a la Obra" },
  I("Gastos por renovación de cartas fianza"), I("Intereses financieros"), I("Costos y mantenimiento de cuentas"),
  I("Obtención de cartas fianza"),
];
