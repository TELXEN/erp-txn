import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Trash2, Upload, Wand2 } from "lucide-react";
import { GenerarBoletasHonorarios } from "@/components/personal/GenerarBoletasHonorarios";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { DetallePagoHonorario, calcularDetalleHonorario, resumenTareoHonorario, type FormularioHonorario } from "@/components/personal/DetallePagoHonorario";
import { useEmpresa } from "@/lib/empresa";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, soles } from "@/lib/format";
import { useProyectos, useTareos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/honorarios")({
  head: () => ({
    meta: [
      { title: "Recibos por Honorarios — ERP TELXEN" },
      { name: "description", content: "Registro de recibos por honorarios con retención de 4ta categoría." },
      { property: "og:title", content: "Recibos por Honorarios — ERP TELXEN" },
      { property: "og:description", content: "Control de recibos por honorarios, retenciones y pagos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Honorarios,
});

type Recibo = {
  id: string;
  trabajador_id: string;
  proyecto_id: string | null;
  numero_recibo: string | null;
  fecha_emision: string;
  concepto: string;
  monto_bruto: number;
  retencion: number;
  monto_neto: number;
  estado_pago: string;
  banco_id: string | null;
  fecha_pago: string | null;
  numero_operacion: string;
  mes: number;
  anio: number;
  dias_laborados: number;
  dias_viaje: number;
  horas_extras: number;
  otros_remuneraciones: number;
  induccion: number;
  costo_unitario: number;
  saldo_mes_anterior: number;
  adelantos: number;
  devolucion_gastos: number;
  pagos_a_cuenta_planilla: number;
  fondo_pensiones: number;
  descuento_herramientas: number;
  lugar_emision: string;
};

function Honorarios() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: proyectos = [] } = useProyectos();
  const { data: tareos = [] } = useTareos();
  const { data: empresa = null } = useEmpresa();
  const { data: recibos = [] } = useQuery({
    queryKey: ["recibos_honorarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recibos_honorarios").select("*").order("fecha_emision", { ascending: false });
      if (error) throw error;
      return data as Recibo[];
    },
  });
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const prestadores = trabajadores.filter((t) => t.tipo_contratacion === "Honorarios");
  const [editor, setEditor] = useState<{ clave: string; form: FormularioHonorario } | null>(null);
  const nombreDe = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const recibosFiltrados = recibos.filter((r) =>
    coincide(busqueda, nombreDe(r.trabajador_id), r.numero_recibo ?? "", r.concepto),
  );
  const [pago, setPago] = useState<{ id: string; banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");
  const [generador, setGenerador] = useState(false);
  const [aviso, setAviso] = useState("");
  const sincronizando = useRef(false);

  // Actualiza las boletas pendientes (sin N° de recibo ni pago) cuando cambia el tareo.
  useEffect(() => {
    if (sincronizando.current) return;
    const pendientes = recibos.filter((r) => !r.numero_recibo && r.estado_pago !== "Pagado");
    if (pendientes.length === 0) return;
    type CamposBoleta = {
      dias_laborados?: number; dias_viaje?: number; horas_extras?: number; costo_unitario?: number;
      otros_remuneraciones?: number; induccion?: number;
      monto_bruto?: number; retencion?: number; monto_neto?: number;
    };
    const cambios: { id: string; campos: CamposBoleta }[] = [];
    for (const r of pendientes) {
      const trabajador = trabajadores.find((t) => t.id === r.trabajador_id);
      const jornal = Number(trabajador?.jornal_diario) || Number(r.costo_unitario) || 0;
      const resumen = resumenTareoHonorario(tareos, r.trabajador_id, r.proyecto_id ?? "", Number(r.mes), Number(r.anio), jornal);
      if (resumen.filas === 0) continue;
      const campos: CamposBoleta = {};
      if (resumen.dias !== Number(r.dias_laborados)) campos.dias_laborados = resumen.dias;
      if (resumen.viaje !== Number(r.dias_viaje)) campos.dias_viaje = resumen.viaje;
      if (resumen.extras !== Number(r.horas_extras)) campos.horas_extras = resumen.extras;
      if (resumen.feriados !== Number(r.otros_remuneraciones)) campos.otros_remuneraciones = resumen.feriados;
      if (resumen.induccion !== Number(r.induccion)) campos.induccion = resumen.induccion;
      if (jornal > 0 && jornal !== Number(r.costo_unitario)) campos.costo_unitario = jornal;
      if (Object.keys(campos).length === 0) continue;
      const dias = campos.dias_laborados ?? Number(r.dias_laborados);
      const viaje = campos.dias_viaje ?? Number(r.dias_viaje);
      const extras = campos.horas_extras ?? Number(r.horas_extras);
      const feriados = campos.otros_remuneraciones ?? Number(r.otros_remuneraciones);
      const induccion = campos.induccion ?? Number(r.induccion);
      const unitario = campos.costo_unitario ?? Number(r.costo_unitario);
      // Total = costo unitario × (laborados + viaje/2 + extras/10.5 + feriados×2 + inducción).
      const bruto = Math.round(unitario * (dias + viaje / 2 + extras / 10.5 + feriados * 2 + induccion) * 100) / 100;
      const descuentos = Number(r.adelantos) + Number(r.devolucion_gastos) + Number(r.pagos_a_cuenta_planilla) + Number(r.fondo_pensiones) + Number(r.descuento_herramientas);
      const retencion = !trabajador?.suspension_cuarta && bruto > 1500 ? Math.round(bruto * 0.08 * 100) / 100 : 0;
      campos.monto_bruto = bruto;
      campos.retencion = retencion;
      campos.monto_neto = Math.round((bruto - retencion - descuentos) * 100) / 100;
      cambios.push({ id: r.id, campos });
    }
    if (cambios.length === 0) return;
    sincronizando.current = true;
    void (async () => {
      for (const c of cambios) await supabase.from("recibos_honorarios").update(c.campos).eq("id", c.id);
      sincronizando.current = false;
      setAviso(`${cambios.length} boleta(s) actualizada(s) con el tareo más reciente.`);
      await qc.invalidateQueries({ queryKey: ["recibos_honorarios"] });
    })();
  }, [recibos, tareos, trabajadores, qc]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const obraDe = (id: string | null) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : "Oficina Central";
  };
  const refrescar = () => qc.invalidateQueries({ queryKey: ["recibos_honorarios"] });

  async function guardarDetalle(form: FormularioHonorario) {
    setError("");
    if (!form.trabajador_id) return setError("Selecciona al prestador.");
    const trabajador = trabajadores.find((item) => item.id === form.trabajador_id);
    const totales = calcularDetalleHonorario(form, !!trabajador?.suspension_cuarta);
    if (totales.bruto <= 0) return setError("Ingresa remuneraciones válidas.");
    if (totales.neto < 0) return setError("Los descuentos no pueden superar las remuneraciones.");
    setGuardando(true);
    const campos = {
      trabajador_id: form.trabajador_id,
      proyecto_id: form.proyecto_id || null,
      numero_recibo: form.numero_recibo.trim().toUpperCase() || null,
      fecha_emision: form.fecha_emision,
      concepto: form.concepto.trim(),
      mes: form.mes, anio: form.anio, dias_laborados: form.dias_laborados, dias_viaje: form.dias_viaje,
      horas_extras: form.horas_extras, otros_remuneraciones: form.otros_remuneraciones,
      induccion: form.induccion, costo_unitario: form.costo_unitario, saldo_mes_anterior: form.saldo_mes_anterior,
      adelantos: form.adelantos, devolucion_gastos: form.devolucion_gastos,
      pagos_a_cuenta_planilla: form.pagos_a_cuenta_planilla, fondo_pensiones: form.fondo_pensiones,
      descuento_herramientas: form.descuento_herramientas, lugar_emision: form.lugar_emision.trim() || "Huancayo",
      monto_bruto: totales.bruto, retencion: totales.retencion, monto_neto: totales.neto,
    };
    const consulta = editor?.clave.startsWith("nuevo-")
      ? supabase.from("recibos_honorarios").insert(campos)
      : supabase.from("recibos_honorarios").update(campos).eq("id", editor?.clave ?? "");
    const { error: err } = await consulta;
    setGuardando(false);
    if (err) return setError(err.code === "23505" ? "Ese número de recibo ya está registrado para este prestador." : err.message);
    await refrescar();
    setEditor(null);
  }

  async function confirmarPago() {
    if (!pago) return;
    setError("");
    if (!pago.banco_id || !pago.fecha_pago || !pago.numero_operacion.trim())
      return setError("Para pagar indica banco, fecha y número de operación.");
    const { error: err } = await supabase
      .from("recibos_honorarios")
      .update({ estado_pago: "Pagado", banco_id: pago.banco_id, fecha_pago: pago.fecha_pago, numero_operacion: pago.numero_operacion.trim() })
      .eq("id", pago.id);
    if (err) return setError(err.message);
    setPago(null);
    await refrescar();
  }

  async function eliminar(r: Recibo) {
    if (r.estado_pago === "Pagado") return setError("No se puede eliminar un recibo pagado.");
    if (!window.confirm("¿Eliminar este recibo?")) return;
    const { error: err } = await supabase.from("recibos_honorarios").delete().eq("id", r.id);
    if (err) return setError(err.message);
    await refrescar();
  }

  const totBruto = recibos.reduce((s, r) => s + Number(r.monto_bruto), 0);
  const totRet = recibos.reduce((s, r) => s + Number(r.retencion), 0);
  const totPend = recibos.filter((r) => r.estado_pago === "Pendiente").reduce((s, r) => s + Number(r.monto_neto), 0);

  return (
    <>
      <Encabezado
        titulo="Recibos por Honorarios"
        subtitulo="Prestadores de 4ta categoría · retención 8% sobre recibos mayores a S/ 1,500"
        acciones={
          <div className="flex gap-2">
            <Boton variante="linea" onClick={() => { setAviso(""); setGenerador(true); }}>
              <Wand2 size={14} /> Generar boletas de pago
            </Boton>
            <Boton variante="linea" onClick={() => exportarExcel("recibos-honorarios", [
                {
                  nombre: "Recibos",
                  filas: recibos.map((r) => ({
                    Fecha: fecha(r.fecha_emision),
                    Prestador: nombreDe(r.trabajador_id),
                    "N° Recibo": r.numero_recibo ?? "Pendiente de N°",
                    Obra: obraDe(r.proyecto_id),
                    Concepto: r.concepto,
                    "Bruto (S/)": Number(r.monto_bruto),
                    "Retención 4ta (S/)": Number(r.retencion),
                    "Neto (S/)": Number(r.monto_neto),
                    Estado: r.estado_pago,
                    "Fecha pago": fecha(r.fecha_pago),
                    "N° Operación": r.numero_operacion,
                  })),
                },
              ])}>
              <Upload size={13} /> Exportar a Excel
            </Boton>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Total bruto", v: totBruto, barra: "border-l-chip-1", fondo: "bg-chip-1/5", acento: "text-chip-1" },
          { t: "Retenciones 4ta (por declarar)", v: totRet, barra: "border-l-chip-margenes", fondo: "bg-chip-margenes/5", acento: "text-chip-margenes" },
          { t: "Neto pendiente de pago", v: totPend, barra: "border-l-chip-mat", fondo: "bg-chip-mat/5", acento: "text-chip-mat" },
        ].map((c) => (
          <div key={c.t} className={`panel border-l-[3px] p-4 ${c.barra} ${c.fondo}`}>
            <p className="label-mono">{c.t}</p>
            <p className={`mt-1 text-right text-lg font-semibold ${c.acento}`}>{soles(c.v)}</p>
          </div>
        ))}
      </div>

      {prestadores.length === 0 && <div className="mb-4 panel"><Vacio texto="No hay personal con tipo de contratación 'Recibo por Honorarios'. Configúralo en Personal." /></div>}
      {aviso && <p className="mb-3 rounded-md bg-primary/8 px-3 py-2 text-xs text-primary">{aviso}</p>}
      {error && !editor && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}

      <Panel titulo="Recibos registrados"
        extra={
          <div className="flex items-center gap-2">
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              total={recibosFiltrados.length}
              placeholder="Buscar por prestador, recibo o concepto..."
            />
            <span className="font-mono text-[11px] text-muted-foreground">{recibos.length} recibos</span>
          </div>
        }>
        {recibosFiltrados.length === 0 ? (
          <Vacio
            texto={
              busqueda
                ? `Sin coincidencias para «${busqueda}»`
                : "Aún no hay recibos registrados."
            }
          />
        ) : recibos.length === 0 ? (
          <Vacio texto="Aún no hay recibos registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-4 py-2">Fecha</th><th className="px-3 py-2">Prestador</th><th className="px-3 py-2">N° Recibo</th>
                  <th className="px-3 py-2">Obra</th><th className="px-3 py-2 text-right">Bruto</th><th className="px-3 py-2 text-right">Retención</th>
                  <th className="px-3 py-2 text-right">Neto</th><th className="px-3 py-2">Estado / Pago</th><th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recibosFiltrados.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="px-4 py-2">{fecha(r.fecha_emision)}</td>
                    <td className="px-3 py-2 font-semibold text-ink"><Resaltar texto={nombreDe(r.trabajador_id)} termino={busqueda}/><span className="block text-[10px] font-normal text-muted-foreground"><Resaltar texto={r.concepto} termino={busqueda}/></span></td>
                    <td className="px-3 py-2">{r.numero_recibo ? <Resaltar texto={r.numero_recibo} termino={busqueda}/> : <Etiqueta tono="warn">Pendiente de N°</Etiqueta>}</td>
                    <td className="px-3 py-2 text-muted-foreground">{obraDe(r.proyecto_id)}</td>
                    <td className="px-3 py-2 text-right">{soles(Number(r.monto_bruto))}</td>
                    <td className="px-3 py-2 text-right">{soles(Number(r.retencion))}</td>
                    <td className="px-3 py-2 text-right font-semibold">{soles(Number(r.monto_neto))}</td>
                    <td className="px-3 py-2">
                      {pago?.id === r.id ? (
                        <div className="grid gap-1">
                          <Select value={pago?.banco_id ?? ""} onChange={(e) => { const v = e.target.value; setPago((p) => (p ? { ...p, banco_id: v } : p)); }} className="py-1 text-xs">
                            <option value="">Banco…</option>
                            {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero_cuenta}</option>)}
                          </Select>
                          <Input type="date" value={pago?.fecha_pago ?? ""} onChange={(e) => { const v = e.target.value; setPago((p) => (p ? { ...p, fecha_pago: v } : p)); }} className="py-1 text-xs" />
                          <Input placeholder="N° operación" value={pago?.numero_operacion ?? ""} onChange={(e) => { const v = e.target.value; setPago((p) => (p ? { ...p, numero_operacion: v } : p)); }} className="py-1 text-xs" />
                        </div>
                      ) : (
                        <>
                          <Etiqueta tono={r.estado_pago === "Pagado" ? "good" : "bad"}>{r.estado_pago}</Etiqueta>
                          {r.estado_pago === "Pagado" && <span className="mt-0.5 block text-[10px] text-muted-foreground">{fecha(r.fecha_pago)} · Op. {r.numero_operacion}</span>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        {pago?.id === r.id ? (
                          <>
                            <Boton onClick={confirmarPago} className="py-1">Confirmar</Boton>
                            <Boton variante="linea" onClick={() => setPago(null)} className="py-1">Cancelar</Boton>
                          </>
                        ) : (
                          <>
                            <button type="button" title="Editar o imprimir detalle" onClick={() => {
                              setError("");
                              setEditor({ clave: r.id, form: {
                                trabajador_id: r.trabajador_id, proyecto_id: r.proyecto_id ?? "", numero_recibo: r.numero_recibo ?? "",
                                fecha_emision: r.fecha_emision, concepto: r.concepto, mes: Number(r.mes), anio: Number(r.anio),
                                dias_laborados: Number(r.dias_laborados), dias_viaje: Number(r.dias_viaje), horas_extras: Number(r.horas_extras),
                                otros_remuneraciones: Number(r.otros_remuneraciones), induccion: Number(r.induccion ?? 0), costo_unitario: Number(r.costo_unitario), saldo_mes_anterior: Number(r.saldo_mes_anterior),
                                adelantos: Number(r.adelantos), devolucion_gastos: Number(r.devolucion_gastos), pagos_a_cuenta_planilla: Number(r.pagos_a_cuenta_planilla),
                                fondo_pensiones: Number(r.fondo_pensiones), descuento_herramientas: Number(r.descuento_herramientas), lugar_emision: r.lugar_emision, retencion: Number(r.retencion),
                              } });
                            }} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><FileText size={15} /></button>
                            {r.estado_pago === "Pendiente" && r.numero_recibo && (
                              <button type="button" title="Registrar pago" onClick={() => setPago({ id: r.id, banco_id: "", fecha_pago: hoy(), numero_operacion: "" })} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Check size={14} /></button>
                            )}
                            <button type="button" title="Eliminar" onClick={() => eliminar(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {generador && (
        <GenerarBoletasHonorarios
          prestadores={prestadores}
          proyectos={proyectos}
          tareos={tareos}
          existentes={recibos}
          onCerrar={() => setGenerador(false)}
          onListo={async (m) => { setGenerador(false); setAviso(`Boletas de pago: ${m} Completa el N° de recibo de cada una.`); await refrescar(); }}
        />
      )}
      {editor && (
        <DetallePagoHonorario
          key={editor.clave}
          abierta
          inicial={editor.form}
          empresa={empresa}
          trabajadores={prestadores}
          proyectos={proyectos}
          tareos={tareos}
          guardando={guardando}
          error={error}
          onCerrar={() => { setEditor(null); setError(""); }}
          onGuardar={guardarDetalle}
        />
      )}
    </>
  );
}
