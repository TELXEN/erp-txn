import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Input, Panel, Select } from "@/components/ui-kit";
import { fecha, hoy } from "@/lib/format";
import { REGIMENES_EMPRESA, regimenVigente, useRegimenesEmpresa } from "@/lib/regimen-empresa";

/** Historial libre del régimen laboral de la empresa; cada régimen aplica solo a quienes ingresen desde su fecha de inicio. */
export function RegimenEmpresaPanel() {
  const qc = useQueryClient();
  const { data: historial = [] } = useRegimenesEmpresa();
  const [f, setF] = useState({ regimen: "MYPE Pequeña", fecha_inicio: hoy(), remype_numero: "", remype_certificado: "" });
  const [error, setError] = useState("");
  const mype = f.regimen.startsWith("MYPE");

  async function agregar() {
    setError("");
    if (!f.fecha_inicio) return setError("Indica la fecha de inicio.");
    const { error: err } = await supabase.from("regimenes_empresa").insert({
      regimen: f.regimen, fecha_inicio: f.fecha_inicio,
      remype_numero: mype ? f.remype_numero.trim() || null : null,
      remype_certificado: mype ? f.remype_certificado.trim() || null : null,
    });
    if (err) return setError(err.code === "23505" ? "Ya hay un cambio de régimen con esa fecha." : err.message);
    qc.invalidateQueries({ queryKey: ["regimenes_empresa"] });
  }
  async function quitar(id?: string) {
    if (!id || !window.confirm("¿Quitar este cambio de régimen del historial?")) return;
    const { error: err } = await supabase.from("regimenes_empresa").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["regimenes_empresa"] });
  }

  return (
    <Panel titulo="Régimen laboral de la empresa">
      <div className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          Vigente hoy: <b className="text-ink">{regimenVigente(historial, hoy())}</b>. Cada régimen aplica solo a los trabajadores que ingresen desde su fecha de inicio; quienes ya trabajaban conservan su régimen.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Régimen"><Select value={f.regimen} onChange={(e) => setF({ ...f, regimen: e.target.value })} className="py-1.5">{REGIMENES_EMPRESA.map((r) => <option key={r}>{r}</option>)}</Select></Campo>
          <Campo etiqueta="Desde"><Input type="date" value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value })} className="py-1.5" /></Campo>
          {mype && <Campo etiqueta="N° REMYPE"><Input value={f.remype_numero} onChange={(e) => setF({ ...f, remype_numero: e.target.value })} className="py-1.5" /></Campo>}
          {mype && <Campo etiqueta="Certificado"><Input value={f.remype_certificado} onChange={(e) => setF({ ...f, remype_certificado: e.target.value })} className="py-1.5" /></Campo>}
          <Boton type="button" onClick={agregar}>Registrar cambio</Boton>
        </div>
        {error && <p className="font-mono text-xs text-bad">{error}</p>}
        <table className="w-full text-xs">
          <thead><tr className="text-left text-muted-foreground"><th className="py-1">Desde</th><th>Régimen</th><th>REMYPE</th><th /></tr></thead>
          <tbody>
            {historial.length === 0 && <tr><td colSpan={4} className="py-1 text-muted-foreground">Sin cambios registrados: se considera Régimen General.</td></tr>}
            {historial.map((h) => (
              <tr key={h.id} className="border-t border-line">
                <td className="py-1">{fecha(h.fecha_inicio)}</td><td>{h.regimen}</td>
                <td>{[h.remype_numero, h.remype_certificado].filter(Boolean).join(" · ") || "—"}</td>
                <td className="text-right"><BotonIcono etiqueta="Quitar" tono="peligro" onClick={() => quitar(h.id)}><Trash2 size={13} /></BotonIcono></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
