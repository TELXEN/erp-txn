import { suspensionVigente } from "@/lib/suspension-cuarta";
import { useMemo, useState } from "react";
import { Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { calcularDetalleHonorario, resumenTareoHonorario, type FormularioHonorario } from "@/components/personal/DetallePagoHonorario";
import { MESES, soles } from "@/lib/format";
import type { Tareo } from "@/lib/datos";

type Prestador = { id: string; nombre: string; jornal_diario?: number; suspension_cuarta?: boolean; suspension_cuarta_fecha?: string | null; suspension_cuarta_anio?: number | null };
type Proyecto = { id: string; nombre: string; codigo?: string | null };

/** Genera borradores de recibo (uno por prestador y mes) desde el consolidado del tareo. */
export function GenerarBoletasHonorarios({ prestadores, proyectos, tareos, existentes, onCerrar, onListo }: {
  prestadores: Prestador[];
  proyectos: Proyecto[];
  tareos: Tareo[];
  existentes: { trabajador_id: string; mes: number; anio: number }[];
  onCerrar: () => void;
  onListo: (mensaje: string) => void;
}) {
  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const filas = useMemo(() => {
    const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    return prestadores.map((p) => {
      const jornal = Number(p.jornal_diario) || 0;
      const r = resumenTareoHonorario(tareos, p.id, "", mes, anio, jornal);
      const ids = [...new Set(tareos.filter((t) => t.trabajador_id === p.id && t.fecha.startsWith(prefijo)).map((t) => t.proyecto_id).filter(Boolean))] as string[];
      const form: FormularioHonorario = {
        trabajador_id: p.id, proyecto_id: ids.length === 1 ? (ids[0] ?? "") : "", numero_recibo: "",
        fecha_emision: `${prefijo}-${String(ultimoDia).padStart(2, "0")}`,
        concepto: "",
        mes, anio, dias_laborados: r.dias, dias_viaje: r.viaje, horas_extras: r.extras, otros_remuneraciones: r.feriados, induccion: r.induccion,
        costo_unitario: jornal, saldo_mes_anterior: 0, adelantos: 0, devolucion_gastos: 0, pagos_a_cuenta_planilla: 0,
        fondo_pensiones: 0, descuento_herramientas: 0, lugar_emision: "Huancayo", retencion: 0,
      };
      const tot = calcularDetalleHonorario(form, suspensionVigente(p, form.fecha_emision));
      const existe = existentes.some((e) => e.trabajador_id === p.id && Number(e.mes) === mes && Number(e.anio) === anio);
      return { p, r, form, tot, existe, conTareo: r.filas > 0 };
    });
  }, [prestadores, proyectos, tareos, existentes, mes, anio]);

  const aGenerar = filas.filter((f) => f.conTareo && !f.existe && f.tot.bruto > 0);

  async function generar() {
    setError("");
    if (aGenerar.length === 0) return setError("No hay boletas nuevas para generar en este período.");
    setGuardando(true);
    const { error: err } = await supabase.from("recibos_honorarios").insert(aGenerar.map(({ form, tot }) => ({
      trabajador_id: form.trabajador_id, proyecto_id: form.proyecto_id || null, numero_recibo: null,
      fecha_emision: form.fecha_emision, concepto: form.concepto, mes: form.mes, anio: form.anio,
      dias_laborados: form.dias_laborados, dias_viaje: form.dias_viaje, horas_extras: form.horas_extras,
      otros_remuneraciones: form.otros_remuneraciones, induccion: form.induccion, costo_unitario: form.costo_unitario, saldo_mes_anterior: 0, adelantos: 0,
      devolucion_gastos: 0, pagos_a_cuenta_planilla: 0, fondo_pensiones: 0, descuento_herramientas: 0,
      lugar_emision: form.lugar_emision, monto_bruto: tot.bruto, retencion: tot.retencion, monto_neto: tot.neto,
    })));
    setGuardando(false);
    if (err) return setError(err.code === "23505" ? "Algún prestador ya tiene boleta en este período." : err.message);
    const ya = filas.filter((f) => f.existe).length;
    const sin = filas.filter((f) => !f.conTareo).length;
    onListo(`${aGenerar.length} generadas, ${ya} ya existían, ${sin} sin tareo.`);
  }

  return (
    <VentanaFlotante titulo="Generar boletas de pago" subtitulo="Se crean desde el consolidado mensual del tareo, una por prestador. Luego completa el N° de recibo." abierta onCerrar={onCerrar} ancho="max-w-4xl">
      <div className="p-4">
        <div className="mb-3 grid max-w-sm grid-cols-2 gap-3">
          <Campo etiqueta="Mes"><Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select></Campo>
          <Campo etiqueta="Año"><Input type="number" min="2000" max="2200" value={anio} onChange={(e) => setAnio(Number(e.target.value) || ahora.getFullYear())} /></Campo>
        </div>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line bg-muted/40 text-left text-[10px] uppercase text-muted-foreground">
              <th className="px-3 py-2">Prestador</th><th className="px-3 py-2 text-right">Días</th><th className="px-3 py-2 text-right">Viaje</th>
              <th className="px-3 py-2 text-right">H. extras</th><th className="px-3 py-2 text-right">Feriados</th><th className="px-3 py-2 text-right">Inducción</th><th className="px-3 py-2 text-right">Costo unit.</th><th className="px-3 py-2 text-right">Neto</th><th className="px-3 py-2">Situación</th>
            </tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">No hay personal por honorarios.</td></tr>}
              {filas.map(({ p, r, form, tot, existe, conTareo }) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2 font-semibold">{p.nombre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.dias}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.viaje}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.extras}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.feriados}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.induccion}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{soles(form.costo_unitario)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{conTareo ? soles(tot.neto) : "—"}</td>
                  <td className="px-3 py-2 text-[11px]">{existe ? <span className="text-muted-foreground">Ya existe</span> : !conTareo ? <span className="text-muted-foreground">Sin tareo</span> : tot.bruto <= 0 ? <span className="text-bad">Sin jornal</span> : <span className="font-semibold text-primary">Se generará</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-3 text-xs text-bad">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Boton variante="linea" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={generar} disabled={guardando || aGenerar.length === 0}><Wand2 size={14} /> {guardando ? "Generando…" : `Generar ${aGenerar.length} boleta(s)`}</Boton>
        </div>
      </div>
    </VentanaFlotante>
  );
}
