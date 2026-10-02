import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoInsumo = "MO" | "MAT" | "EQ" | "HT" | "SC";
export const TIPOS_INSUMO: [TipoInsumo, string][] = [
  ["MO", "Mano de obra"],
  ["MAT", "Materiales"],
  ["EQ", "Equipos y maquinaria"],
  ["HT", "Herramientas menores"],
  ["SC", "Subcontratos / Servicios"],
];
export const nombreTipo = (t: string) => TIPOS_INSUMO.find(([k]) => k === t)?.[1] ?? t;

export type Insumo = {
  id: string;
  tipo: TipoInsumo;
  codigo: string;
  nombre: string;
  unidad: string;
  precio: number;
  margen_pct: number;
  activo: boolean;
  sueldo_mensual?: number;
  regimen_laboral?: RegimenLaboral;
  categoria_obrero?: string | null;
  asignacion_familiar?: boolean;
  propiedad?: "Propio" | "Alquilado";
  clase_equipo?: "Máquina" | "Equipo";
  marca_id?: string | null;
};

export type RegimenLaboral = "General" | "MYPE Pequeña" | "Construcción Civil";
export const REGIMENES_LABORALES: RegimenLaboral[] = ["General", "MYPE Pequeña", "Construcción Civil"];
export const CATEGORIAS_OBRERO = ["Operario", "Oficial", "Peon"] as const;

export type ParametrosLaborales = {
  id: string;
  rmv: number;
  essalud_pct: number;
  sctr_pct: number;
  vida_ley_pct: number;
  horas_semanales: number;
  feriados_anuales: number;
  jornal_operario: number;
  jornal_oficial: number;
  jornal_peon: number;
  buc_operario_pct: number;
  buc_oficial_pct: number;
  buc_peon_pct: number;
  pasaje_diario: number;
  herramienta_pct: number;
};

export const PARAMETROS_LABORALES_DEFECTO: Omit<ParametrosLaborales, "id"> = {
  rmv: 1130,
  essalud_pct: 9,
  sctr_pct: 1.5,
  vida_ley_pct: 0.53,
  horas_semanales: 48,
  feriados_anuales: 12,
  jornal_operario: 103.2,
  jornal_oficial: 89.2,
  jornal_peon: 79.8,
  buc_operario_pct: 32,
  buc_oficial_pct: 30,
  buc_peon_pct: 30,
  pasaje_diario: 7.2,
  herramienta_pct: 5,
};

export const useParametrosLaborales = () =>
  useQuery({
    queryKey: ["parametros_laborales"],
    queryFn: async () => {
      const { data, error } = await db.from("parametros_laborales").select("*").limit(1);
      if (error) throw error;
      const fila = (data ?? [])[0] as ParametrosLaborales | undefined;
      return fila ?? ({ id: "", ...PARAMETROS_LABORALES_DEFECTO } as ParametrosLaborales);
    },
  });

export type LineaCostoHH = { concepto: string; monto: number };

/**
 * Costo hora-hombre anualizado según régimen laboral peruano.
 * Devuelve el desglose de conceptos anuales, las horas efectivas y el costo HH.
 */
export function calcularCostoHH(
  insumo: Pick<Insumo, "sueldo_mensual" | "regimen_laboral" | "categoria_obrero" | "asignacion_familiar">,
  p: Omit<ParametrosLaborales, "id">,
): { lineas: LineaCostoHH[]; costoAnual: number; horasEfectivas: number; costoHH: number } {
  const horasEfectivas = Math.round(
    ((52 * Number(p.horas_semanales || 48)) - Number(p.feriados_anuales || 0) * 8 - 30 * 8) * 100,
  ) / 100; // 52 semanas − feriados − 30 días vacaciones (aprox. 2.192 h con 48 h/sem)
  const regimen = insumo.regimen_laboral ?? "General";
  const lineas: LineaCostoHH[] = [];

  if (regimen === "Construcción Civil") {
    const cat = insumo.categoria_obrero ?? "Operario";
    const jornal =
      cat === "Operario" ? Number(p.jornal_operario) : cat === "Oficial" ? Number(p.jornal_oficial) : Number(p.jornal_peon);
    const bucPct = cat === "Operario" ? Number(p.buc_operario_pct) : cat === "Oficial" ? Number(p.buc_oficial_pct) : Number(p.buc_peon_pct);
    const diasAnuales = 312; // 6 días × 52 semanas
    const diasEfectivos = diasAnuales - Number(p.feriados_anuales || 0) - 30; // descanso vacacional
    const jornales = jornal * diasEfectivos;
    lineas.push({ concepto: `Jornales (${diasEfectivos} días × S/ ${jornal.toFixed(2)})`, monto: jornales });
    lineas.push({ concepto: "Gratificaciones (80 jornales)", monto: jornal * 80 });
    lineas.push({ concepto: "Vacaciones (10% de jornales)", monto: jornales * 0.1 });
    lineas.push({ concepto: "CTS (15% de jornales)", monto: jornales * 0.15 });
    lineas.push({ concepto: `BUC (${bucPct}% de jornales)`, monto: (jornales * bucPct) / 100 });
    lineas.push({ concepto: `Pasaje diario (${diasEfectivos} × S/ ${Number(p.pasaje_diario).toFixed(2)})`, monto: diasEfectivos * Number(p.pasaje_diario) });
    if (cat === "Operario")
      lineas.push({ concepto: `Herramienta (${Number(p.herramienta_pct)}% de jornales)`, monto: (jornales * Number(p.herramienta_pct)) / 100 });
    lineas.push({ concepto: "CONAFOVICER 2% (informativo, lo paga el trabajador)", monto: 0 });
  } else {
    const sueldo = Number(insumo.sueldo_mensual || 0);
    const esMype = regimen === "MYPE Pequeña";
    const asigFamiliar = insumo.asignacion_familiar ? Number(p.rmv) * 0.1 : 0;
    const base = sueldo + asigFamiliar;
    const gratificaciones = esMype ? base : base * 2; // MYPE: ½ + ½ = 1 sueldo
    const diasVac = esMype ? 15 : 30;
    const vacaciones = (base / 30) * diasVac;
    const cts = esMype ? base / 2 : base + base / 6; // General: sueldo + 1/6 grati
    lineas.push({ concepto: "Sueldos (12 meses)", monto: sueldo * 12 });
    if (asigFamiliar > 0) lineas.push({ concepto: "Asignación familiar (10% RMV × 12)", monto: asigFamiliar * 12 });
    lineas.push({ concepto: esMype ? "Gratificaciones (½ julio + ½ diciembre)" : "Gratificaciones (2 sueldos)", monto: gratificaciones });
    lineas.push({ concepto: "Bonificación extraordinaria (9% de gratificaciones)", monto: gratificaciones * 0.09 });
    lineas.push({ concepto: `Vacaciones (${diasVac} días)`, monto: vacaciones });
    lineas.push({ concepto: esMype ? "CTS (½ sueldo)" : "CTS (sueldo + 1/6 grati)", monto: cts });
    const baseAsegurable = sueldo * 12 + gratificaciones + vacaciones;
    lineas.push({ concepto: `EsSalud (${Number(p.essalud_pct)}%)`, monto: (baseAsegurable * Number(p.essalud_pct)) / 100 });
    lineas.push({ concepto: `SCTR (${Number(p.sctr_pct)}%)`, monto: (baseAsegurable * Number(p.sctr_pct)) / 100 });
    lineas.push({ concepto: `Seguro Vida Ley (${Number(p.vida_ley_pct)}%)`, monto: (baseAsegurable * Number(p.vida_ley_pct)) / 100 });
  }

  const costoAnual = lineas.reduce((a, l) => a + l.monto, 0);
  const costoHH = horasEfectivas > 0 ? Math.round((costoAnual / horasEfectivas) * 100) / 100 : 0;
  return { lineas, costoAnual: Math.round(costoAnual * 100) / 100, horasEfectivas, costoHH };
}

/** Precio de venta = precio de compra + margen % sobre compra. */
export const precioVenta = (i: Pick<Insumo, "precio" | "margen_pct">) =>
  Number(i.precio) * (1 + Number(i.margen_pct || 0) / 100);

export type ComponenteApu = {
  id: string;
  partida_maestra_id: string;
  insumo_id: string;
  cuadrilla: number;
  cantidad: number;
};

const db = supabase as unknown as { from: (t: string) => any };

export type MargenesInsumo = Record<TipoInsumo, number>;
export const MARGENES_DEFECTO: MargenesInsumo = { MO: 0, MAT: 0, EQ: 0, HT: 0, SC: 0 };

async function cargarMargenes(): Promise<MargenesInsumo> {
  const { data, error } = await db.from("margenes_insumo").select("tipo, margen_pct");
  if (error) throw error;
  const m = { ...MARGENES_DEFECTO };
  for (const r of (data ?? []) as { tipo: TipoInsumo; margen_pct: number }[]) m[r.tipo] = Number(r.margen_pct || 0);
  return m;
}

/** Margen único por tipo de insumo (Configuración del Sistema › Márgenes APU). */
export const useMargenesInsumo = () => useQuery({ queryKey: ["margenes_insumo"], queryFn: cargarMargenes });

/** Equipos propios: el precio ya es el C. Unitario (sin margen). */
export const esPropioSinMargen = (i: Pick<Insumo, "tipo" | "propiedad">) =>
  i.tipo === "EQ" && (i.propiedad ?? "Propio") === "Propio";

/** Insumos con margen_pct reemplazado por el margen único de su tipo (HT: % de mano de obra). */
export const useInsumos = () =>
  useQuery({
    queryKey: ["insumos"],
    queryFn: async () => {
      const [{ data, error }, mg] = await Promise.all([
        db.from("insumos").select("*").order("tipo").order("nombre"),
        cargarMargenes(),
      ]);
      if (error) throw error;
      return ((data ?? []) as Insumo[]).map((i) => ({ ...i, margen_pct: esPropioSinMargen(i) ? 0 : mg[i.tipo] ?? 0 }));
    },
  });

export type OrigenApu = "maestra" | "obra" | "cotizacion";
export const ORIGEN_APU: Record<OrigenApu, { columna: string; tabla: string }> = {
  maestra: { columna: "partida_maestra_id", tabla: "partidas_maestras" },
  obra: { columna: "partida_id", tabla: "partidas" },
  cotizacion: { columna: "cotizacion_item_id", tabla: "cotizacion_items" },
};

export const useComponentesApu = (partidaId: string | null, origen: OrigenApu = "maestra") =>
  useQuery({
    queryKey: ["apu_componentes", partidaId],
    enabled: !!partidaId,
    queryFn: async () => {
      const { data, error } = await db
        .from("apu_componentes")
        .select("*")
        .eq(ORIGEN_APU[origen].columna, partidaId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ComponenteApu[];
    },
  });

export const apuDb = db;

/** Cantidad por unidad: con cuadrilla → cuadrilla × jornada / rendimiento; sin cuadrilla → cantidad directa. */
export function cantidadComponente(c: ComponenteApu, rendimiento: number, jornada: number) {
  if (Number(c.cuadrilla) > 0 && Number(rendimiento) > 0)
    return (Number(c.cuadrilla) * Number(jornada)) / Number(rendimiento);
  return Number(c.cantidad);
}

export function calcularApu(
  componentes: ComponenteApu[],
  insumos: Insumo[],
  rendimiento: number,
  jornada: number,
  pctHerramientas: number,
) {
  const tot: Record<TipoInsumo, number> = { MO: 0, MAT: 0, EQ: 0, HT: 0, SC: 0 };
  const base = componentes.map((c) => ({ c, ins: insumos.find((i) => i.id === c.insumo_id) }));
  // Primero todo menos herramientas menores (que dependen del total de mano de obra)
  const parciales = new Map<string, { cantidad: number; parcial: number }>();
  for (const { c, ins } of base) {
    if (ins?.tipo === "HT") continue;
    const cantidad = cantidadComponente(c, rendimiento, jornada);
    const parcial = cantidad * (ins ? precioVenta(ins) : 0);
    if (ins) tot[ins.tipo] += parcial;
    parciales.set(c.id, { cantidad, parcial });
  }
  const totMO = tot.MO;
  for (const { c, ins } of base) {
    if (ins?.tipo !== "HT") continue;
    const pct = Number(ins.margen_pct || 0);
    const parcial = (totMO * pct) / 100;
    tot.HT += parcial;
    parciales.set(c.id, { cantidad: pct, parcial });
  }
  const filas = base.map(({ c, ins }) => ({ c, ins, ...(parciales.get(c.id) ?? { cantidad: 0, parcial: 0 }) }));
  const herramientas = (totMO * Number(pctHerramientas || 0)) / 100;
  tot.HT += herramientas;
  const pu = Math.round((tot.MO + tot.MAT + tot.EQ + tot.HT + tot.SC) * 100) / 100;
  return { filas, tot, herramientas, pu };
}
