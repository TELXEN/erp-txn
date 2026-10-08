import { useEffect, useMemo, useState } from "react";
import { Eye, Printer, Save, Wand2 } from "lucide-react";
import { Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { HojaDetalleHonorario, type DetalleHonorario } from "@/components/personal/HojaDetalleHonorario";
import { MESES, soles } from "@/lib/format";
import type { Tareo } from "@/lib/datos";

type Opcion = { id: string; nombre: string; codigo?: string | null };
type Trabajador = Opcion & { dni?: string; numero_cuenta?: string; banco?: string; suspension_cuarta?: boolean; jornal_diario?: number };

const HORAS_JORNADA = 8;

/** Resume el tareo del trabajador en el proyecto y período elegidos. */
export function resumenTareoHonorario(tareos: Tareo[], trabajadorId: string, proyectoId: string, mes: number, anio: number, jornal: number) {
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  const filas = tareos.filter((t) =>
    t.trabajador_id === trabajadorId &&
    (proyectoId ? t.proyecto_id === proyectoId : true) &&
    typeof t.fecha === "string" && t.fecha.startsWith(prefijo),
  );
  let dias = 0, viaje = 0, extras = 0;
  for (const t of filas) {
    const asistencia = Number(t.asistencia) || 0;
    if (t.tipo === "extras") extras += (Number(t.horas) || 0) * (jornal / HORAS_JORNADA);
    else if (t.tipo === "viaje") viaje += Number(t.costo_soles) || 0;
    else dias += asistencia;
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { filas: filas.length, dias: r2(dias), viaje: r2(viaje), extras: r2(extras) };
}

export type FormularioHonorario = DetalleHonorario & { trabajador_id: string; proyecto_id: string };

export function calcularDetalleHonorario(form: FormularioHonorario, suspension = false) {
  const bruto = form.dias_laborados * form.costo_unitario + form.dias_viaje + form.horas_extras + form.otros_remuneraciones;
  const retencion = !suspension && bruto > 1500 ? Math.round(bruto * 8) / 100 : 0;
  const otrosDescuentos = form.adelantos + form.devolucion_gastos + form.pagos_a_cuenta_planilla + form.fondo_pensiones + form.descuento_herramientas;
  const descuentos = otrosDescuentos + retencion;
  return { bruto, retencion, descuentos, neto: bruto - descuentos };
}

export function DetallePagoHonorario({
  abierta,
  inicial,
  empresa,
  trabajadores,
  proyectos,
  guardando,
  error,
  onCerrar,
  onGuardar,
}: {
  abierta: boolean;
  inicial: FormularioHonorario;
  empresa: { razon_social?: string; ruc?: string; rubro?: string; direccion?: string; logo_url?: string } | null;
  trabajadores: Trabajador[];
  proyectos: Opcion[];
  guardando: boolean;
  error: string;
  onCerrar: () => void;
  onGuardar: (form: FormularioHonorario) => Promise<void>;
}) {
  const [form, setForm] = useState(inicial);
  const [vista, setVista] = useState(false);
  const trabajador = trabajadores.find((item) => item.id === form.trabajador_id) ?? null;
  const proyecto = proyectos.find((item) => item.id === form.proyecto_id);
  const totales = useMemo(() => calcularDetalleHonorario(form, !!trabajador?.suspension_cuarta), [form, trabajador]);
  const actualizarNumero = (campo: keyof FormularioHonorario, valor: string) => setForm((actual) => ({ ...actual, [campo]: Math.max(0, Number(valor) || 0) }));

  return (
    <VentanaFlotante titulo="Detalle de pago por honorarios" subtitulo="Completa los importes y revisa la hoja A4 antes de guardar." abierta={abierta} onCerrar={onCerrar} ancho="max-w-[1500px]" ocultarBarra>
      <div className="grid min-h-[680px] lg:grid-cols-[440px_1fr]">
        <form onSubmit={(e) => { e.preventDefault(); void onGuardar(form); }} className={`${vista ? "hidden lg:block" : "block"} border-r border-line bg-muted/25 p-4`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Prestador"><Select required value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })}><option value="">Selecciona…</option>{trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select></Campo>
            <Campo etiqueta="Proyecto"><Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })}><option value="">Oficina Central</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} ` : ""}{p.nombre}</option>)}</Select></Campo>
            <Campo etiqueta="N° recibo"><Input required maxLength={20} value={form.numero_recibo} onChange={(e) => setForm({ ...form, numero_recibo: e.target.value.toUpperCase() })} placeholder="E001-25" /></Campo>
            <Campo etiqueta="Fecha de emisión"><Input required type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} /></Campo>
            <Campo etiqueta="Mes"><Select value={form.mes} onChange={(e) => setForm({ ...form, mes: Number(e.target.value) })}>{MESES.map((mes, i) => <option key={mes} value={i + 1}>{mes}</option>)}</Select></Campo>
            <Campo etiqueta="Año"><Input type="number" min="2000" max="2200" value={form.anio} onChange={(e) => actualizarNumero("anio", e.target.value)} /></Campo>
          </div>

          <fieldset className="mt-4 rounded-md border border-line bg-card p-3">
            <legend className="px-1 text-xs font-bold text-primary">Remuneraciones</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([[
                "dias_laborados", "Días laborados"], ["costo_unitario", "Costo unitario (S/)"], ["dias_viaje", "Días de viaje (S/)"], ["horas_extras", "Horas extras (S/)"], ["otros_remuneraciones", "Otros (S/)"], ["saldo_mes_anterior", "Saldo mes anterior (S/)"]
              ] as [keyof FormularioHonorario, string][]).map(([campo, etiqueta]) => <Campo key={campo} etiqueta={etiqueta}><Input type="number" min="0" step="0.01" value={form[campo] as number} onChange={(e) => actualizarNumero(campo, e.target.value)} /></Campo>)}
            </div>
          </fieldset>

          <fieldset className="mt-3 rounded-md border border-line bg-card p-3">
            <legend className="px-1 text-xs font-bold text-primary">Descuentos</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([[
                "adelantos", "Adelantos"], ["devolucion_gastos", "Devolución de gastos"], ["pagos_a_cuenta_planilla", "Pagos a cuenta"], ["fondo_pensiones", "Fondo de pensiones"], ["descuento_herramientas", "Pérdida de herramientas"]
              ] as [keyof FormularioHonorario, string][]).map(([campo, etiqueta]) => <Campo key={campo} etiqueta={etiqueta}><Input type="number" min="0" step="0.01" value={form[campo] as number} onChange={(e) => actualizarNumero(campo, e.target.value)} /></Campo>)}
            </div>
          </fieldset>

          <div className="mt-3 grid gap-3">
            <Campo etiqueta="Concepto del recibo"><textarea required maxLength={800} rows={4} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className="w-full resize-none rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></Campo>
            <Campo etiqueta="Lugar de emisión"><Input maxLength={80} value={form.lugar_emision} onChange={(e) => setForm({ ...form, lugar_emision: e.target.value })} /></Campo>
          </div>

          <div className="mt-4 rounded-md bg-primary/8 p-3 text-xs">
            <div className="flex justify-between"><span>Total remuneraciones</span><b>{soles(totales.bruto)}</b></div>
            <div className="mt-1 flex justify-between"><span>Descuentos (incluye retención {soles(totales.retencion)})</span><b>{soles(totales.descuentos)}</b></div>
            <div className="mt-2 flex justify-between border-t border-primary/20 pt-2 text-sm"><b>Neto a pagar</b><b>{soles(totales.neto)}</b></div>
          </div>
          {error && <p className="mt-3 text-xs text-bad">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Boton type="button" variante="linea" className="lg:hidden" onClick={() => setVista(true)}><Eye size={14} /> Vista previa</Boton>
            <Boton type="submit" disabled={guardando || totales.bruto <= 0 || totales.neto < 0}><Save size={14} /> {guardando ? "Guardando…" : "Guardar detalle"}</Boton>
          </div>
        </form>

        <div className={`${vista ? "block" : "hidden lg:block"} overflow-auto bg-muted/40 p-4 print:block print:overflow-visible print:bg-paper print:p-0`}>
          <div className="mb-3 flex justify-between print:hidden">
            <Boton type="button" variante="linea" className="lg:hidden" onClick={() => setVista(false)}>Volver a editar</Boton>
            <Boton type="button" variante="linea" onClick={() => window.print()}><Printer size={14} /> Imprimir / Guardar PDF</Boton>
          </div>
          <div className="origin-top scale-[0.82] lg:scale-[0.78] xl:scale-[0.9] print:scale-100">
            <HojaDetalleHonorario empresa={empresa} trabajador={trabajador} proyecto={proyecto ? `${proyecto.codigo ?? ""} ${proyecto.nombre}`.trim() : "Oficina Central"} detalle={{ ...form, retencion: totales.retencion }} totalRemuneraciones={totales.bruto} totalDescuentos={totales.descuentos} neto={totales.neto} />
          </div>
        </div>
      </div>
    </VentanaFlotante>
  );
}