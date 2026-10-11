import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { Boton, Input, Select } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import { BANCOS_RECURSO, copiarRecetaACotizacion, costoReceta, dbBanco, useBancoTabla, useRecursosApu } from "@/lib/banco-apu";
import { useUnidadesMedida } from "@/lib/unidades";

type ItemApu = {
  id: string;
  nombre: string;
  unidad: string;
  metrado?: number;
  rendimiento?: number;
  jornada?: number;
  partida_apu_id?: string | null;
};

export type OrigenBanco =
  | { tipo: "cotizacion"; tablaDetalle: "cotizacion_apu_detalle"; columna: "cotizacion_item_id"; tablaItem: "cotizacion_items" }
  | { tipo: "obra"; tablaDetalle: "partida_detalle"; columna: "partida_obra_id"; tablaItem: "partidas" };

export const ORIGEN_COTIZACION: OrigenBanco = { tipo: "cotizacion", tablaDetalle: "cotizacion_apu_detalle", columna: "cotizacion_item_id", tablaItem: "cotizacion_items" };
export const ORIGEN_OBRA: OrigenBanco = { tipo: "obra", tablaDetalle: "partida_detalle", columna: "partida_obra_id", tablaItem: "partidas" };

/**
 * Análisis de precios de un ítem (cotización u obra) respaldado por el Banco APU:
 * recursos de los cuatro bancos y receta copiable desde la partida de origen.
 */
export function ApuBanco({
  item,
  origen,
  onCerrar,
  invalidar = [],
}: {
  item: ItemApu;
  origen: OrigenBanco;
  onCerrar: () => void;
  invalidar?: unknown[][];
}) {
  const qc = useQueryClient();
  const recursos = useRecursosApu();
  const { data: detalle = [] } = useBancoTabla(origen.tablaDetalle);
  const { data: detalleBanco = [] } = useBancoTabla("partida_detalle");
  const { data: partidasBanco = [] } = useBancoTabla("partidas_apu");
  const { data: unidades = [] } = useUnidadesMedida();
  const [rend, setRend] = useState(String(item.rendimiento ?? 1));
  const [jornada, setJornada] = useState(String(item.jornada ?? 8));
  const [und, setUnd] = useState(item.unidad || "und");
  const [banco, setBanco] = useState(0);
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState("");

  const propias = detalle.filter((d) => d[origen.columna] === item.id);
  const calc = costoReceta(propias, recursos, Number(rend), Number(jornada));
  const partidaBanco = partidasBanco.find((p) => p.id === item.partida_apu_id);
  const refrescar = () => qc.invalidateQueries({ queryKey: ["banco_apu", origen.tablaDetalle] });

  const [col, tabla, etiqueta] = BANCOS_RECURSO[banco]!;
  const opciones = (recursos[tabla as keyof typeof recursos] ?? []).filter((x) => x.estado === "activo");

  async function agregar() {
    if (!elegido) return;
    setError("");
    const { error: e } = await dbBanco
      .from(origen.tablaDetalle)
      .insert({ [origen.columna]: item.id, [col]: elegido, cantidad_o_cuadrilla: 1 });
    if (e) return setError(e.message);
    setElegido("");
    refrescar();
  }

  async function cambiarCant(id: string, v: string) {
    await dbBanco.from(origen.tablaDetalle).update({ cantidad_o_cuadrilla: Number(v || 0) }).eq("id", id);
    refrescar();
  }

  async function quitarFila(id: string) {
    await dbBanco.from(origen.tablaDetalle).delete().eq("id", id);
    refrescar();
  }

  async function copiarDelBanco() {
    if (!partidaBanco) return;
    if (propias.length && !window.confirm("Se reemplazarán los recursos actuales por la receta del Banco APU. ¿Continuar?")) return;
    setError("");
    if (origen.tipo === "cotizacion") {
      try {
        const r = await copiarRecetaACotizacion(item.id, partidaBanco.id, 1);
        setRend(String(r.rendimiento));
        setUnd(partidaBanco.unidad || "und");
        refrescar();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo copiar la receta.");
      }
      return;
    }
    const base = detalleBanco.filter((d) => d.partida_padre_id === partidaBanco.id && !d.subpartida_hijo_id);
    if (!base.length) return setError("La partida del Banco APU todavía no tiene receta (o solo tiene subpartidas).");
    await dbBanco.from(origen.tablaDetalle).delete().eq(origen.columna, item.id);
    const { error: e } = await dbBanco.from(origen.tablaDetalle).insert(
      base.map((b: { material_id: string | null; mano_obra_id: string | null; equipo_id: string | null; subcontrato_id: string | null; cantidad_o_cuadrilla: number }) => ({
        [origen.columna]: item.id,
        material_id: b.material_id,
        mano_obra_id: b.mano_obra_id,
        equipo_id: b.equipo_id,
        subcontrato_id: b.subcontrato_id,
        cantidad_o_cuadrilla: b.cantidad_o_cuadrilla,
      })),
    );
    if (e) return setError(e.message);
    setRend(String(partidaBanco.rendimiento_diario ?? 1));
    setUnd(partidaBanco.unidad || "und");
    refrescar();
  }

  async function guardar() {
    setError("");
    if (!(Number(rend) > 0)) return setError("El rendimiento debe ser mayor que cero.");
    const cambios: Record<string, number | string> = {
      rendimiento: Number(rend),
      jornada: Number(jornada) || 8,
      precio_unitario: calc.total,
      unidad: und,
    };
    if (origen.tipo === "obra")
      cambios["presupuesto_inicial"] = Math.round(Number(item.metrado ?? 0) * calc.total * 100) / 100;
    const { error: err } = await dbBanco.from(origen.tablaItem).update(cambios).eq("id", item.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["cotizacion_items"] });
    qc.invalidateQueries({ queryKey: ["partidas"] });
    for (const k of invalidar) qc.invalidateQueries({ queryKey: k });
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4">
      <div className="w-full max-w-4xl rounded-md border border-line bg-card shadow-lg">
        <div className="flex items-start justify-between border-b border-line px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Análisis de precios unitarios · Banco APU</p>
            <h3 className="text-sm font-semibold text-ink">{item.nombre}</h3>
          </div>
          <button type="button" onClick={onCerrar} className="rounded-md p-1 hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="grid gap-3 border-b border-line px-5 py-3 font-mono text-xs sm:grid-cols-4">
          <label>
            Rendimiento ({und}/día)
            <div className="mt-1 flex gap-1">
              <Input className="py-1 text-xs" type="number" step="0.01" value={rend} onChange={(e) => setRend(e.target.value)} />
              <select className="w-20 rounded-md border border-line bg-card px-1 py-1 text-xs" value={und} onChange={(e) => setUnd(e.target.value)}>
                {!unidades.some((u) => u.simbolo === und) && <option value={und}>{und}</option>}
                {unidades.filter((u) => u.activo).map((u) => (
                  <option key={u.id} value={u.simbolo}>{u.simbolo}</option>
                ))}
              </select>
            </div>
          </label>
          <label>Jornada (horas)<Input className="mt-1 py-1 text-xs" type="number" step="0.5" value={jornada} onChange={(e) => setJornada(e.target.value)} /></label>
          <div />
          <div className="text-right">
            <p className="text-muted-foreground">Precio unitario</p>
            <p className="text-lg font-semibold text-primary">{soles(calc.total)}</p>
            <p className="text-[10px] text-muted-foreground">por {und}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-line px-5 py-3">
          <label className="text-xs">
            Banco
            <Select value={banco} onChange={(e) => { setBanco(Number(e.target.value)); setElegido(""); }} className="mt-1 w-44 py-1 text-xs">
              {BANCOS_RECURSO.map(([, , t], i) => <option key={t} value={i}>{t}</option>)}
            </Select>
          </label>
          <label className="text-xs">
            {etiqueta}
            <Select value={elegido} onChange={(e) => setElegido(e.target.value)} className="mt-1 w-72 py-1 text-xs">
              <option value="">Selecciona…</option>
              {opciones.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.descripcion}</option>)}
            </Select>
          </label>
          <Boton onClick={agregar} disabled={!elegido}><Plus size={13} /> Agregar</Boton>
          {partidaBanco && (
            <Boton type="button" variante="linea" onClick={() => void copiarDelBanco()}>
              <Copy size={13} className="mr-1 inline" /> Copiar receta del banco
            </Boton>
          )}
        </div>

        <table className="w-full table-fixed font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="w-[14%] px-2 py-2 font-medium">Banco</th>
              <th className="w-[34%] px-2 py-2 font-medium">Recurso</th>
              <th className="w-[8%] px-2 py-2 font-medium">Und.</th>
              <th className="w-[13%] px-2 py-2 text-right font-medium">Cant./Cuadrilla</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">C. unitario</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Parcial</th>
              <th className="w-[7%] px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {calc.filas.map((f) => (
              <tr key={f.d.id} className="border-b border-line/40">
                <td className="px-5 py-1.5 text-muted-foreground">{f.banco}</td>
                <td className="truncate px-2 py-1.5 text-ink">{f.nombre}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{f.und}</td>
                <td className="px-2 py-1">
                  <Input className="py-0.5 text-right text-xs" type="number" step="0.0001" defaultValue={f.cantidad}
                    onBlur={(e) => Number(e.target.value) !== f.cantidad && cambiarCant(f.d.id, e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-right">{f.esPctMo ? `${f.cu.toFixed(2)}% MO` : f.cu.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right">{f.parcial.toFixed(2)}</td>
                <td className="px-5 py-1 text-right">
                  <button type="button" onClick={() => quitarFila(f.d.id)} title="Quitar" className="text-muted-foreground hover:text-bad"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {propias.length === 0 && <p className="px-5 py-4 font-mono text-xs text-muted-foreground">Agrega recursos de los bancos para componer el precio unitario.</p>}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Boton type="button" onClick={guardar}>Guardar y aplicar P.U.</Boton>
        </div>
        {error && <p className="px-5 pb-3 font-mono text-xs text-bad">{error}</p>}
        <p className="border-t border-line px-5 py-2 font-mono text-[10px] text-muted-foreground">
          Mano de obra y equipos H-M: parcial = cuadrilla × jornada × costo ÷ rendimiento. Equipos «%»: porcentaje sobre la mano de obra. Materiales y subcontratos: cantidad × costo unitario.
        </p>
      </div>
    </div>
  );
}
