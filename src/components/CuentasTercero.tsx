import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCuentasTerceros } from "@/lib/reporte-pagos";

const tabla = () => supabase.from("terceros_cuentas_bancarias" as never);
const celda = "h-7 w-full rounded border border-line bg-background px-1.5 text-xs outline-none focus:border-primary";

/** Cuentas bancarias de un cliente/proveedor, para el reporte de pagos de Tesorería. */
export function CuentasTercero({ terceroId }: { terceroId: string }) {
  const qc = useQueryClient();
  const { data: todas = [] } = useCuentasTerceros();
  const cuentas = todas.filter((c) => c.tercero_id === terceroId);
  const [nueva, setNueva] = useState({ banco: "", moneda: "PEN", numero_cuenta: "", cci: "", es_principal: false, es_detraccion: false });
  const [error, setError] = useState("");
  const refrescar = () => qc.invalidateQueries({ queryKey: ["terceros_cuentas_bancarias"] });

  async function agregar() {
    setError("");
    if (!nueva.banco.trim() || (!nueva.numero_cuenta.trim() && !nueva.cci.trim())) return setError("Escribe el banco y el número de cuenta o CCI.");
    const { error: e } = await tabla().insert({ ...nueva, tercero_id: terceroId, banco: nueva.banco.trim().toUpperCase() } as never);
    if (e) return setError(e.message);
    setNueva({ banco: "", moneda: "PEN", numero_cuenta: "", cci: "", es_principal: false, es_detraccion: false });
    refrescar();
  }
  async function cambiar(id: string, campos: Record<string, unknown>) {
    const { error: e } = await tabla().update(campos as never).eq("id", id);
    if (e) setError(e.message);
    refrescar();
  }

  return (
    <div className="rounded-md border border-line sm:col-span-2">
      <p className="border-b border-line bg-muted/40 px-3 py-1.5 text-xs font-semibold text-ink">Cuentas bancarias</p>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase text-muted-foreground">
          <tr><th className="px-2 py-1 text-left">Banco</th><th className="px-2 py-1">Moneda</th><th className="px-2 py-1 text-left">N° cuenta</th><th className="px-2 py-1 text-left">CCI</th><th className="px-2 py-1">Principal</th><th className="px-2 py-1">Detracción</th><th /></tr>
        </thead>
        <tbody>
          {cuentas.map((c) => (
            <tr key={c.id} className="border-t border-line/60">
              <td className="px-2 py-1">{c.banco}</td>
              <td className="px-2 py-1 text-center">{c.moneda === "USD" ? "$" : "S/"}</td>
              <td className="px-2 py-1 font-mono">{c.numero_cuenta}</td>
              <td className="px-2 py-1 font-mono">{c.cci}</td>
              <td className="px-2 py-1 text-center"><input type="checkbox" checked={c.es_principal} onChange={(e) => void cambiar(c.id, { es_principal: e.target.checked })} /></td>
              <td className="px-2 py-1 text-center"><input type="checkbox" checked={c.es_detraccion} onChange={(e) => void cambiar(c.id, { es_detraccion: e.target.checked })} /></td>
              <td className="px-2 py-1 text-right">
                <button type="button" title="Quitar cuenta" className="text-bad" onClick={() => { if (confirm("¿Quitar esta cuenta?")) void cambiar(c.id, { activo: false }); }}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-line bg-primary/5">
            <td className="px-2 py-1"><input className={celda} placeholder="BCP" value={nueva.banco} onChange={(e) => setNueva({ ...nueva, banco: e.target.value })} /></td>
            <td className="px-2 py-1">
              <select className={celda} value={nueva.moneda} onChange={(e) => setNueva({ ...nueva, moneda: e.target.value })}><option value="PEN">S/</option><option value="USD">$</option></select>
            </td>
            <td className="px-2 py-1"><input className={`${celda} font-mono`} value={nueva.numero_cuenta} onChange={(e) => setNueva({ ...nueva, numero_cuenta: e.target.value })} /></td>
            <td className="px-2 py-1"><input className={`${celda} font-mono`} value={nueva.cci} onChange={(e) => setNueva({ ...nueva, cci: e.target.value })} /></td>
            <td className="px-2 py-1 text-center"><input type="checkbox" checked={nueva.es_principal} onChange={(e) => setNueva({ ...nueva, es_principal: e.target.checked })} /></td>
            <td className="px-2 py-1 text-center"><input type="checkbox" checked={nueva.es_detraccion} onChange={(e) => setNueva({ ...nueva, es_detraccion: e.target.checked })} /></td>
            <td className="px-2 py-1 text-right"><button type="button" title="Añadir cuenta" className="text-primary" onClick={() => void agregar()}><Plus size={14} /></button></td>
          </tr>
        </tbody>
      </table>
      {error && <p className="px-3 py-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
