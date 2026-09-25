import { useState } from "react";
import { Boton, Campo, Input } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import { num } from "@/lib/logistica";
import { apuDb } from "@/lib/apu";
import { liquidar } from "@/lib/importaciones";

type Imp = {
  id: string; moneda: "USD" | "PEN"; estado: string; tipo_cambio: number; fecha_liquidacion: string | null;
  flete: number; seguro: number; pct_percepcion: number; gasto_handling: number; gasto_almacenaje: number;
  gasto_honorarios: number; gasto_flete_local: number; gasto_otros: number;
};
type Item = { id: string; descripcion: string; unidad: string; cantidad: number; precio_fob: number; pct_advalorem: number };

const CAMPOS_LOCALES = [
  ["gasto_handling", "Handling / desaduanaje"],
  ["gasto_almacenaje", "Almacenaje aduanero"],
  ["gasto_honorarios", "Honorarios courier / agente"],
  ["gasto_flete_local", "Flete local a obra"],
  ["gasto_otros", "Otros gastos"],
] as const;

export function LiquidacionImportacion({ imp, items, onGuardado }: { imp: Imp; items: Item[]; onGuardado: () => void }) {
  const bloqueado = imp.estado === "Liquidado";
  const s = (v: unknown) => String(v ?? 0);
  const [p, setP] = useState({
    tipo_cambio: s(imp.tipo_cambio), fecha_liquidacion: imp.fecha_liquidacion ?? new Date().toISOString().slice(0, 10),
    flete: s(imp.flete), seguro: s(imp.seguro), pct_percepcion: s(imp.pct_percepcion),
    gasto_handling: s(imp.gasto_handling), gasto_almacenaje: s(imp.gasto_almacenaje),
    gasto_honorarios: s(imp.gasto_honorarios), gasto_flete_local: s(imp.gasto_flete_local), gasto_otros: s(imp.gasto_otros),
  });
  const [adv, setAdv] = useState<Record<string, string>>(Object.fromEntries(items.map((i) => [i.id, s(i.pct_advalorem)])));
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof p, v: string) => setP((x) => ({ ...x, [k]: v }));

  const locales = CAMPOS_LOCALES.reduce((t, [k]) => t + Number(p[k] || 0), 0);
  const r = liquidar(
    { moneda: imp.moneda, tipo_cambio: Number(p.tipo_cambio), flete: Number(p.flete), seguro: Number(p.seguro), pct_percepcion: Number(p.pct_percepcion), gastos_locales: locales },
    items.map((i) => ({ id: i.id, cantidad: i.cantidad, precio_fob: i.precio_fob, pct_advalorem: Number(adv[i.id] || 0) })),
  );
  const m = imp.moneda === "USD" ? "US$" : "S/";

  async function guardar(liquidarTambien: boolean) {
    setMsg("");
    if (imp.moneda === "USD" && !(Number(p.tipo_cambio) > 0)) return setMsg("Ingresa el tipo de cambio SUNAT.");
    const nums = Object.fromEntries(Object.entries(p).filter(([k]) => k !== "fecha_liquidacion").map(([k, v]) => [k, Number(v || 0)]));
    if (Object.values(nums).some((n) => n < 0)) return setMsg("Los montos no pueden ser negativos.");
    const { error } = await apuDb.from("importaciones").update({
      ...nums, fecha_liquidacion: p.fecha_liquidacion || null, ...(liquidarTambien ? { estado: "Liquidado" } : {}),
    }).eq("id", imp.id);
    if (error) return setMsg(error.message);
    for (const f of r.filas) {
      const { error: e } = await apuDb.from("importacion_items")
        .update({ pct_advalorem: Number(adv[f.id] || 0), costo_unitario_pen: Math.round(f.unitario * 10000) / 10000 })
        .eq("id", f.id);
      if (e) return setMsg(e.message);
    }
    setMsg(liquidarTambien ? "Importación liquidada." : "Liquidación guardada.");
    onGuardado();
  }

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <p className="label-mono">Liquidación aduanera y costo nacionalizado</p>
      <div className="grid gap-3 sm:grid-cols-5">
        {imp.moneda === "USD" && (
          <Campo etiqueta="Tipo de cambio SUNAT"><Input type="number" step="0.001" disabled={bloqueado} value={p.tipo_cambio} onChange={(e) => set("tipo_cambio", e.target.value)} /></Campo>
        )}
        <Campo etiqueta="Fecha de liquidación"><Input type="date" disabled={bloqueado} value={p.fecha_liquidacion} onChange={(e) => set("fecha_liquidacion", e.target.value)} /></Campo>
        <Campo etiqueta={`Flete internacional (${m})`}><Input type="number" step="any" disabled={bloqueado} value={p.flete} onChange={(e) => set("flete", e.target.value)} /></Campo>
        <Campo etiqueta={`Seguro (${m})`}><Input type="number" step="any" disabled={bloqueado} value={p.seguro} onChange={(e) => set("seguro", e.target.value)} /></Campo>
        <Campo etiqueta="% Percepción IGV"><Input type="number" step="any" disabled={bloqueado} value={p.pct_percepcion} onChange={(e) => set("pct_percepcion", e.target.value)} /></Campo>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {CAMPOS_LOCALES.map(([k, t]) => (
          <Campo key={k} etiqueta={`${t} (S/)`}><Input type="number" step="any" disabled={bloqueado} value={p[k]} onChange={(e) => set(k, e.target.value)} /></Campo>
        ))}
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="py-1 font-medium">Equipo</th><th className="px-2 text-right font-medium">FOB</th>
            <th className="px-2 text-right font-medium">% Ad-Val.</th><th className="px-2 text-right font-medium">CIF (S/)</th>
            <th className="px-2 text-right font-medium">Ad-Val. (S/)</th><th className="px-2 text-right font-medium">Gastos loc.</th>
            <th className="px-2 text-right font-medium">Costo total</th><th className="px-2 text-right font-medium">Costo unit. S/</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, k) => {
            const f = r.filas[k];
            if (!f) return null;
            return (
              <tr key={i.id} className="border-b border-line/30">
                <td className="py-1">{i.descripcion} <span className="text-muted-foreground">({num(i.cantidad)} {i.unidad})</span></td>
                <td className="px-2 text-right">{m} {num(f.fob)}</td>
                <td className="px-2 text-right">
                  <select disabled={bloqueado} className="rounded border border-line bg-background px-1 py-0.5" value={adv[i.id]} onChange={(e) => setAdv((a) => ({ ...a, [i.id]: e.target.value }))}>
                    {["0", "4", "6", "11"].map((o) => <option key={o} value={o}>{o}%</option>)}
                  </select>
                </td>
                <td className="px-2 text-right">{num(f.cifPen)}</td>
                <td className="px-2 text-right">{num(f.advalorem)}</td>
                <td className="px-2 text-right">{num(f.locales)}</td>
                <td className="px-2 text-right">{soles(f.costo)}</td>
                <td className="px-2 text-right font-semibold text-primary">{soles(f.unitario)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="panel px-4 py-3">
          <p className="label-mono mb-1">Costo nacionalizado (va a inventario / obra)</p>
          <Fila t="CIF en soles" v={r.cifPen} /><Fila t="Ad-Valorem" v={r.advalorem} /><Fila t="Gastos locales" v={r.locales} />
          <Fila t="Costo total" v={r.costo} fuerte />
        </div>
        <div className="panel px-4 py-3">
          <p className="label-mono mb-1">Tributos SUNAT (no son costo)</p>
          <Fila t="IGV 16%" v={r.igv} /><Fila t="IPM 2%" v={r.ipm} /><Fila t={`Percepción ${p.pct_percepcion}%`} v={r.percepcion} />
          <Fila t="Crédito fiscal (IGV + IPM + percepción)" v={r.igv + r.ipm + r.percepcion} fuerte />
          <Fila t="Total a pagar a SUNAT (incl. Ad-Valorem)" v={r.tributosSunat} />
        </div>
      </div>

      {msg && <p className="text-xs text-primary">{msg}</p>}
      {!bloqueado ? (
        <div className="flex gap-2">
          <Boton variante="linea" onClick={() => guardar(false)}>Guardar liquidación</Boton>
          <Boton onClick={() => { if (confirm("¿Marcar como Liquidado? Ya no se podrá editar la liquidación.")) guardar(true); }}>Guardar y liquidar</Boton>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Importación liquidada. Para corregir, cambia el estado a Nacionalizado.</p>
      )}
    </div>
  );
}

function Fila({ t, v, fuerte }: { t: string; v: number; fuerte?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${fuerte ? "border-t border-line font-semibold" : ""}`}>
      <span>{t}</span><span>{soles(v)}</span>
    </div>
  );
}
