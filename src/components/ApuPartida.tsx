import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { Boton, Input, Select } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import type { PartidaMaestra } from "@/lib/cotizaciones";
import { TIPOS_INSUMO, apuDb, calcularApu, useComponentesApu, useInsumos } from "@/lib/apu";

type P = PartidaMaestra & { rendimiento?: number; jornada?: number; pct_herramientas?: number };

export function ApuPartida({ partida, onCerrar }: { partida: P; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: insumos = [] } = useInsumos();
  const { data: comps = [] } = useComponentesApu(partida.id);
  const [rend, setRend] = useState(String(partida.rendimiento ?? 1));
  const [jornada, setJornada] = useState(String(partida.jornada ?? 8));
  const [pctH, setPctH] = useState(String(partida.pct_herramientas ?? 3));
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState("");
  const calc = calcularApu(comps, insumos, Number(rend), Number(jornada), Number(pctH));
  const refrescar = () => qc.invalidateQueries({ queryKey: ["apu_componentes", partida.id] });

  async function agregar() {
    if (!nuevo) return;
    const ins = insumos.find((i) => i.id === nuevo);
    const conCuadrilla = ins?.tipo === "MO" || (ins?.tipo === "EQ" && ins.unidad === "hm");
    const { error: err } = await apuDb.from("apu_componentes").insert({
      partida_maestra_id: partida.id,
      insumo_id: nuevo,
      cuadrilla: conCuadrilla ? 1 : 0,
      cantidad: conCuadrilla ? 0 : 1,
    });
    if (err) return setError(err.message);
    setNuevo("");
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

  async function guardar() {
    setError("");
    if (!(Number(rend) > 0)) return setError("El rendimiento debe ser mayor que cero.");
    const { error: err } = await apuDb
      .from("partidas_maestras")
      .update({
        rendimiento: Number(rend),
        jornada: Number(jornada) || 8,
        pct_herramientas: Number(pctH) || 0,
        precio_unitario: calc.pu,
      })
      .eq("id", partida.id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
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
          <label>Rendimiento ({partida.unidad}/día)<Input className="mt-1 py-1 text-xs" type="number" step="0.01" value={rend} onChange={(e) => setRend(e.target.value)} /></label>
          <label>Jornada (horas)<Input className="mt-1 py-1 text-xs" type="number" step="0.5" value={jornada} onChange={(e) => setJornada(e.target.value)} /></label>
          <label>Herramientas (% MO)<Input className="mt-1 py-1 text-xs" type="number" step="0.5" value={pctH} onChange={(e) => setPctH(e.target.value)} /></label>
          <div className="text-right">
            <p className="text-muted-foreground">Precio unitario</p>
            <p className="text-lg font-semibold text-primary">{soles(calc.pu)}</p>
            <p className="text-[10px] text-muted-foreground">por {partida.unidad}</p>
          </div>
        </div>

        <table className="w-full table-fixed font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="w-[36%] px-5 py-2 font-medium">Insumo</th>
              <th className="w-[7%] px-2 py-2 font-medium">Und.</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Cuadrilla</th>
              <th className="w-[13%] px-2 py-2 text-right font-medium">Cantidad</th>
              <th className="w-[12%] px-2 py-2 text-right font-medium">Precio</th>
              <th className="w-[13%] px-2 py-2 text-right font-medium">Parcial</th>
              <th className="w-[7%] px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {TIPOS_INSUMO.map(([tipo, titulo]) => {
              const filas = calc.filas.filter((f) => f.ins?.tipo === tipo);
              const conH = tipo === "EQ" && calc.herramientas > 0;
              if (!filas.length && !conH) return null;
              return [
                <tr key={tipo} className="bg-muted/40">
                  <td colSpan={5} className="px-5 py-1.5 font-semibold text-primary">{titulo}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{soles(calc.tot[tipo])}</td>
                  <td />
                </tr>,
                ...filas.map(({ c, ins, cantidad, parcial }) => {
                  const usaCuadrilla = tipo === "MO" || tipo === "EQ";
                  return (
                    <tr key={c.id} className="border-b border-line/40">
                      <td className="truncate px-5 py-1.5 text-ink">{ins?.nombre}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{ins?.unidad}</td>
                      <td className="px-2 py-1">
                        {usaCuadrilla && (
                          <Input className="py-0.5 text-right text-xs" type="number" step="0.01" defaultValue={c.cuadrilla} onBlur={(e) => cambiar(c.id, "cuadrilla", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {Number(c.cuadrilla) > 0 ? (
                          <p className="text-right">{cantidad.toFixed(4)}</p>
                        ) : (
                          <Input className="py-0.5 text-right text-xs" type="number" step="0.0001" defaultValue={c.cantidad} onBlur={(e) => cambiar(c.id, "cantidad", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">{Number(ins?.precio ?? 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right">{parcial.toFixed(2)}</td>
                      <td className="px-5 py-1 text-right">
                        <button type="button" onClick={() => quitar(c.id)} title="Quitar" className="text-muted-foreground hover:text-bad"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                }),
                conH ? (
                  <tr key="herr" className="border-b border-line/40">
                    <td className="px-5 py-1.5 text-ink">Herramientas manuales</td>
                    <td className="px-2 py-1.5 text-muted-foreground">%MO</td>
                    <td />
                    <td className="px-2 py-1.5 text-right">{Number(pctH).toFixed(2)}%</td>
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
          <Select className="min-w-0 flex-1 py-1.5 text-xs" value={nuevo} onChange={(e) => setNuevo(e.target.value)}>
            <option value="">Seleccionar insumo…</option>
            {TIPOS_INSUMO.map(([k, t]) => (
              <optgroup key={k} label={t}>
                {insumos.filter((i) => i.tipo === k && i.activo).map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre} ({i.unidad} · S/ {Number(i.precio).toFixed(2)})</option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Boton type="button" variante="linea" onClick={agregar}>Agregar</Boton>
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
