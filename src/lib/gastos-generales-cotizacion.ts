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
  /** 'fijo' ignora el tiempo; 'variable' multiplica por la duración. */
  tipo?: TipoGG;
  tiempo_manual?: boolean;
};
export type TipoGG = "fijo" | "variable";

export const parcialGG = (f: Pick<FilaGG, "cantidad" | "tiempo" | "precio_unitario"> & { tipo?: TipoGG }) =>
  Math.round(Number(f.cantidad || 0) * (f.tipo === "fijo" ? 1 : Number(f.tiempo || 0)) * Number(f.precio_unitario || 0) * 100) / 100;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Totales separados de gastos fijos y variables. */
export function totalesGG(filas: FilaGG[]) {
  let fijos = 0, variables = 0;
  for (const f of filas) if (f.nivel === "item") (f.tipo === "fijo" ? (fijos += parcialGG(f)) : (variables += parcialGG(f)));
  return { fijos: r2(fijos), variables: r2(variables) };
}

/** Desglose final: subtotal = CD + GG; utilidad sobre el subtotal; IGV sobre el valor venta. */
export function resumenPresupuesto(cd: number, fijos: number, variables: number, pctUtilidad: number, pctIgv: number) {
  const subtotal = r2(cd + fijos + variables);
  const utilidad = r2(subtotal * pctUtilidad / 100);
  const venta = r2(subtotal + utilidad);
  const igv = r2(venta * pctIgv / 100);
  return { subtotal, utilidad, venta, igv, total: r2(venta + igv) };
}

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

type Semilla = { nivel: NivelGG; descripcion: string; unidad?: string; cantidad?: number; tipo: TipoGG };
const F = (d: string, u = "GLB", c = 1): Semilla => ({ nivel: "item", descripcion: d, unidad: u, cantidad: c, tipo: "fijo" });
const V = (d: string, c = 1): Semilla => ({ nivel: "item", descripcion: d, unidad: "mes", cantidad: c, tipo: "variable" });
const G = (d: string, tipo: TipoGG): Semilla => ({ nivel: "grupo", descripcion: d, tipo });
/** Estructura estándar precargada: 1 Fijos (no dependen del plazo), 2 Variables (dependen de la duración). */
export const ESTRUCTURA_GG: Semilla[] = [
  { nivel: "bloque", descripcion: "GASTOS GENERALES FIJOS (No relacionados con el tiempo)", tipo: "fijo" },
  G("Ingeniería, legales y documentación", "fijo"),
  F("Ingeniería: Revisión de diagramas unifilares y memorias de cálculo"),
  F("Legales/Permisos: Firmas y trámites ante entidades/Perito Colegiado"),
  F("Planos As-Built: Documentación final conforme a obra"),
  G("Movilización y logística", "fijo"),
  F("Movilización: Flete de maquinaria pesada (Grúas, elevadores de tijera)", "viaje", 2),
  F("Logística: Traslado de herramientas, tableros y transformadores", "viaje", 2),
  F("Desmovilización y limpieza final de la obra"),
  G("Instalaciones provisionales", "fijo"),
  F("Facilidades Temporales: Implementación de oficinas/talleres provisionales"),
  F("Almacén Seguro: Resguardo techado para cables y componentes críticos"),
  G("Seguros y financieros", "fijo"),
  F("Seguros: Pólizas de Responsabilidad Civil y SCTR"),
  F("Financieros: Gastos bancarios por cartas fianza de anticipo/fiel cumplimiento"),
  { nivel: "bloque", descripcion: "GASTOS GENERALES VARIABLES (Relacionados con la duración de la obra)", tipo: "variable" },
  G("Staff", "variable"),
  V("Staff: Ingeniero Residente / Gerente de Obra"),
  V("Staff: Supervisor de Seguridad y Salud Ocupacional HSE/SST"),
  V("Staff: Planificador / Controlador de Proyectos", 0.5),
  V("Staff: Maestro de Obra / Líder Eléctrico"),
  V("Staff: Almacenero / Guardián nocturno de obra"),
  G("Logística", "variable"),
  V("Logística: Alojamiento y alimentación para el personal de Staff"),
  V("Logística: Alquiler de camioneta de supervisión 4x4, inc. combustible"),
  V("Logística: Internet de obra, telefonía y energía provisional"),
  V("Logística: Alquiler de baños químicos y gestión de residuos industriales"),
  G("Seguridad", "variable"),
  V("Seguridad: Reposición de EPP dieléctrico e ignífugo Arc Flash"),
  V("Seguridad: Consumibles para sistemas de bloqueo y etiquetado LOTO"),
  V("Seguridad: Equipos de rescate médico y estaciones de primeros auxilios"),
  G("Herramientas", "variable"),
  V("Herramientas: Alquiler de andamios certificados y plataformas"),
  V("Herramientas: Alquiler de herramientas aisladas 1000V y ponchadoras hidráulicas"),
  V("Herramientas: Certificación y calibración de equipos Megger/Telurómetro"),
];
