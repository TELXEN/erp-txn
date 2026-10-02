import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, X } from "lucide-react";
import { Boton, Input } from "@/components/ui-kit";
import { BuscadorInsumo } from "@/components/BuscadorInsumo";
import { soles } from "@/lib/format";
import type { PartidaMaestra } from "@/lib/cotizaciones";
import { ORIGEN_APU, TIPOS_INSUMO, apuDb, calcularApu, precioVenta, useComponentesApu, useInsumos, useMargenesInsumo, type OrigenApu } from "@/lib/apu";
import { usePartidasMaestras } from "@/lib/cotizaciones";
import { useUnidadesMedida } from "@/lib/unidades";

type P = Pick<PartidaMaestra, "id" | "nombre" | "unidad"> & {
  rendimiento?: number;
  jornada?: number;
  pct_herramientas?: number;
  metrado?: number;
};

export function ApuPartida({
  partida,
  onCerrar,
  origen = "maestra",
  invalidar = [],
}: {
  partida: P;
  onCerrar: () => void;
  origen?: OrigenApu;
  /** Claves de consulta a refrescar tras aplicar el P.U. */
  invalidar?: unknown[][];
}) {
  const qc = useQueryClient();
  const { columna, tabla } = ORIGEN_APU[origen];
  const { data: insumos = [] } = useInsumos();
  const { data: maestras = [] } = usePartidasMaestras();
  const { data: comps = [] } = useComponentesApu(partida.id, origen);
  const maestraIgual =
    origen !== "maestra"
      ? maestras.find((m) => m.nombre.trim().toLowerCase() === partida.nombre.trim().toLowerCase())
      : undefined;
  const [rend, setRend] = useState(String(partida.rendimiento ?? 1));
  const [jornada, setJornada] = useState(String(partida.jornada ?? 8));
  const [und, setUnd] = useState(partida.unidad || "und");
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: margenes } = useMargenesInsumo();
  // Insumo «Herramientas manuales» del maestro (código 40000001): su C. Unitario es el % de MO de respaldo.
  const insumoHT = insumos.find((i) => i.tipo === "HT" && i.codigo === "40000001");
  const pctH = insumoHT && Number(insumoHT.precio) > 0 ? Number(insumoHT.precio) : Number(margenes?.HT ?? 0);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState("");
  const calc = calcularApu(comps, insumos, Number(rend), Number(jornada), Number(pctH));
  const refrescar = () => qc.invalidateQueries({ queryKey: ["apu_componentes", partida.id] });

  async function agregar(id: string) {
    if (!id) return;
    setError("");
    let ins: { tipo: string; unidad: string } | undefined = insumos.find((i) => i.id === id);
    if (!ins) ins = (await apuDb.from("insumos").select("tipo, unidad").eq("id", id).single()).data ?? undefined;
    const conCuadrilla = ins?.tipo === "MO" || (ins?.tipo === "EQ" && ins.unidad === "hm");
    const { error: err } = await apuDb.from("apu_componentes").insert({
      [columna]: partida.id,
      insumo_id: id,
      cuadrilla: conCuadrilla ? 1 : 0,
      cantidad: conCuadrilla ? 0 : 1,
    });
    if (err) return setError(err.message);
    refrescar();
  }

  async function cambiar(id: string, campo: "cuadrilla" | "cantidad", valor: string) {
    await apuDb.from("apu_componentes").update({ [campo]: Number(valor || 0) }).eq("id", id);
    refrescar();
  }

  async function quitar(id: string) {
    await apuDb.from("apu_componentes").delete().eq("id", id);
    refrescar();
  }

  async function copiarDelBanco() {
    if (!maestraIgual) return;
    if (comps.length && !window.confirm("Se reemplazarán los insumos actuales por los del banco de partidas. ¿Continuar?")) return;
    setError("");
    const { data: base, error: e1 } = await apuDb
      .from("apu_componentes")
      .select("insumo_id, cuadrilla, cantidad")
      .eq("partida_maestra_id", maestraIgual.id);
    if (e1) return setError(e1.message);
    if (!base?.length) return setError("La partida del banco todavía no tiene análisis de precios.");
    await apuDb.from("apu_componentes").delete().eq(columna, partida.id);
    const { error: e2 } = await apuDb
      .from("apu_componentes")
      .insert(base.map((b: { insumo_id: string; cuadrilla: number; cantidad: number }) => ({ ...b, [columna]: partida.id })));
    if (e2) return setError(e2.message);
    const m = maestraIgual as P;
    setRend(String(m.rendimiento ?? 1));
    setJornada(String(m.jornada ?? 8));
    setUnd(m.unidad || "und");
    refrescar();
  }

  async function guardar() {
    setError("");
    if (!(Number(rend) > 0)) return setError("El rendimiento debe ser mayor que cero.");
    const cambios: Record<string, number | string> = {
      rendimiento: Number(rend),
      jornada: Number(jornada) || 8,
      precio_unitario: calc.pu,
      unidad: und,
    };
    if (origen === "obra")
      cambios['presupuesto_inicial'] = Math.round(Number(partida.metrado ?? 0) * calc.pu * 100) / 100;
    const { error: err } = await apuDb.from(tabla).update(cambios).eq("id", partida.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
    for (const k of invalidar) qc.invalidateQueries({ queryKey: k });
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4">
      <div className="w-full max-w-4xl rounded-md border border-line bg-card shadow-lg">
        <div className="flex items-start justify-between border-b border-line px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Análisis de precios unitarios</p>
            <h3 className="text-sm font-semibold text-ink">{partida.nombre}</h3>
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
          <label>Herramientas manuales<p className="mt-1 py-1 text-right font-mono text-xs text-ink">{pctH.toFixed(2)}%</p>
            <p className="text-[9px] text-muted-foreground">se edita en Márgenes APU</p>
          </label>
          <div className="text-right">
            <p className="text-muted-foreground">Precio unitario</p>
            <p className="text-lg font-semibold text-primary">{soles(calc.pu)}</p>
            <p className="text-[10px] text-muted-foreground">por {und}</p>
          </div>
        </div>

        <table className="w-full table-fixed font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="w-[9%] px-2 py-2 font-medium">Código</th>
              <th className="w-[28%] px-2 py-2 font-medium">Insumo</th>
              <th className="w-[7%] px-2 py-2 font-medium">Und.</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Cuadrilla</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Cantidad</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Precio</th>
              <th className="w-[13%] px-2 py-2 text-right font-medium">Parcial</th>
              <th className="w-[7%] px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {TIPOS_INSUMO.map(([tipo, titulo]) => {
              const filas = calc.filas.filter((f) => f.ins?.tipo === tipo);
              const conH = tipo === "HT" && calc.herramientas > 0;
              if (!filas.length && !conH) return null;
              return [
                <tr key={tipo} className="bg-muted/40">
                  <td colSpan={6} className="px-5 py-1.5 font-semibold text-primary">{titulo}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{soles(calc.tot[tipo] ?? 0)}</td>
                  <td />
                </tr>,
                ...filas.map(({ c, ins, cantidad, parcial }) => {
                  const usaCuadrilla = tipo === "MO" || tipo === "EQ";
                  return (
                    <tr key={c.id} className="border-b border-line/40">
                      <td className="px-5 py-1.5 text-muted-foreground">{ins?.codigo || "–"}</td>
                      <td className="truncate px-2 py-1.5 text-ink">{ins?.nombre}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{ins?.unidad}</td>
                      <td className="px-2 py-1">
                        {usaCuadrilla && (
                          <Input className="py-0.5 text-right text-xs" type="number" step="0.01" defaultValue={c.cuadrilla} onBlur={(e) => cambiar(c.id, "cuadrilla", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {tipo === "HT" ? (
                          <p className="text-right">{cantidad.toFixed(2)}%</p>
                        ) : Number(c.cuadrilla) > 0 ? (
                          <p className="text-right">{cantidad.toFixed(4)}</p>
                        ) : (
                          <Input className="py-0.5 text-right text-xs" type="number" step="0.0001" defaultValue={c.cantidad} onBlur={(e) => cambiar(c.id, "cantidad", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">{tipo === "HT" ? `${cantidad.toFixed(2)}%` : (ins ? precioVenta(ins) : 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right">{parcial.toFixed(2)}</td>
                      <td className="px-5 py-1 text-right">
                        <button type="button" onClick={() => quitar(c.id)} title="Quitar" className="text-muted-foreground hover:text-bad"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                }),
                conH ? (
                  <tr key="herr" className="border-b border-line/40">
                    <td className="px-5 py-1.5 text-muted-foreground">{insumoHT?.codigo || "40000001"}</td>
                    <td className="px-2 py-1.5 text-ink">{insumoHT?.nombre || "Herramientas manuales"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{insumoHT?.unidad || "%MO"}</td>
                    <td />
                    <td className="px-2 py-1.5 text-right">{pctH.toFixed(2)}%</td>
                    <td />
                    <td className="px-2 py-1.5 text-right">{calc.herramientas.toFixed(2)}</td>
                    <td />
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
        {comps.length === 0 && <p className="px-5 py-4 font-mono text-xs text-muted-foreground">Agrega insumos para componer el precio unitario.</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <BuscadorInsumo
            insumos={insumos}
            onElegir={agregar}
            onCreado={() => qc.invalidateQueries({ queryKey: ["insumos"] })}
          />
          {maestraIgual && (
            <Boton type="button" variante="linea" onClick={() => void copiarDelBanco()}>
              <Copy size={13} className="mr-1 inline" /> Copiar del banco
            </Boton>
          )}
          <Boton type="button" onClick={guardar}>Guardar y aplicar P.U.</Boton>
        </div>
        {error && <p className="px-5 pb-3 font-mono text-xs text-bad">{error}</p>}
        <p className="border-t border-line px-5 py-2 font-mono text-[10px] text-muted-foreground">
          Mano de obra y equipos: cantidad = cuadrilla × jornada ÷ rendimiento. Materiales y subcontratos: cantidad por unidad de partida.
        </p>
      </div>
    </div>
  );
}
