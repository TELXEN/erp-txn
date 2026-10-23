import { leerTodo } from "@/lib/datos";
import { useQuery } from "@tanstack/react-query";
import { apuDb } from "@/lib/apu";

export type OrdenCompra = {
  id: string;
  codigo: string;
  proyecto_id: string;
  proveedor_id: string | null;
  requerimiento_id: string | null;
  fecha: string;
  fecha_entrega: string | null;
  estado: string;
  condicion_pago: string;
  observacion: string;
};
export type ItemOC = {
  id: string;
  orden_id: string;
  insumo_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
};
export type Movimiento = {
  id: string;
  fecha: string;
  tipo: "Ingreso" | "Salida";
  proyecto_id: string;
  insumo_id: string | null;
  descripcion: string;
  unidad: string;
  cantidad: number;
  costo_unitario: number;
  orden_item_id: string | null;
  documento: string;
  observacion: string;
};
export type Requerimiento = {
  id: string;
  proyecto_id: string;
  codigo: string;
  fecha: string;
  estado: string;
  observacion: string;
  creado_por: string | null;
};
export type ItemReq = {
  id: string;
  requerimiento_id: string;
  insumo_id: string | null;
  tipo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_referencial: number;
};

const lista = <T,>(tabla: string, orden = "created_at") =>
  useQuery({
    queryKey: [tabla],
    queryFn: async () => {
      return leerTodo<T>(() => apuDb.from(tabla).select("*").order(orden, { ascending: false }).order("id"));
    },
  });

export const useOrdenesCompra = () => lista<OrdenCompra>("ordenes_compra");
export const useItemsOC = () => lista<ItemOC>("orden_compra_items");
export const useMovimientos = () => lista<Movimiento>("movimientos_almacen");
export const useRequerimientos = () => lista<Requerimiento>("requerimientos");
export const useItemsReq = () => lista<ItemReq>("requerimiento_items");

export const ESTADOS_OC = ["Emitida", "Recibida parcial", "Recibida", "Anulada"];

/** Recalcula el estado de una OC según lo recibido en almacén (no toca Anulada). */
export async function sincronizarEstadoOC(ordenId: string) {
  const { data: oc } = await apuDb.from("ordenes_compra").select("id,estado").eq("id", ordenId).single();
  if (!oc || oc.estado === "Anulada") return;
  const { data: itemsRaw } = await apuDb.from("orden_compra_items").select("id,cantidad").eq("orden_id", ordenId);
  const items = (itemsRaw ?? []) as { id: string; cantidad: number }[];
  const ids = items.map((i) => i.id);
  const { data: movsRaw } = ids.length
    ? await apuDb.from("movimientos_almacen").select("orden_item_id,cantidad").eq("tipo", "Ingreso").in("orden_item_id", ids)
    : { data: [] as { orden_item_id: string; cantidad: number }[] };
  const recibido = new Map<string, number>();
  for (const m of movsRaw ?? []) recibido.set(m.orden_item_id, (recibido.get(m.orden_item_id) ?? 0) + Number(m.cantidad));
  const total = items.reduce((s, i) => s + Number(i.cantidad), 0);
  const rec = items.reduce((s, i) => s + Math.min(Number(i.cantidad), recibido.get(i.id) ?? 0), 0);
  const estado = rec <= 0.0001 ? "Emitida" : rec >= total - 0.0001 ? "Recibida" : "Recibida parcial";
  if (estado !== oc.estado) await apuDb.from("ordenes_compra").update({ estado }).eq("id", ordenId);
}
export const num = (n: number, d = 2) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Clave de stock: obra + insumo (o descripción si no hay insumo). */
export const claveStock = (m: { proyecto_id: string; insumo_id: string | null; descripcion: string }) =>
  `${m.proyecto_id}|${m.insumo_id ?? m.descripcion.trim().toLowerCase()}`;

/** Stock por obra/insumo con costo promedio ponderado de ingresos. */
export function calcularStock(movs: Movimiento[]) {
  const mapa = new Map<
    string,
    { proyecto_id: string; insumo_id: string | null; descripcion: string; unidad: string; ingresos: number; salidas: number; valorIngresos: number }
  >();
  for (const m of movs) {
    const k = claveStock(m);
    const s = mapa.get(k) ?? {
      proyecto_id: m.proyecto_id,
      insumo_id: m.insumo_id,
      descripcion: m.descripcion,
      unidad: m.unidad,
      ingresos: 0,
      salidas: 0,
      valorIngresos: 0,
    };
    if (m.tipo === "Ingreso") {
      s.ingresos += Number(m.cantidad);
      s.valorIngresos += Number(m.cantidad) * Number(m.costo_unitario);
    } else s.salidas += Number(m.cantidad);
    mapa.set(k, s);
  }
  return [...mapa.entries()].map(([clave, s]) => {
    const costoPromedio = s.ingresos > 0 ? s.valorIngresos / s.ingresos : 0;
    const stock = s.ingresos - s.salidas;
    return { clave, ...s, stock, costoPromedio, valor: stock * costoPromedio };
  });
}
