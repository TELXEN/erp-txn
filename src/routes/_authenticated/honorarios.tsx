import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha, hoy, soles } from "@/lib/format";
import { useProyectos, useTrabajadores } from "@/lib/datos";
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

const TOPE_RETENCION = 1500;
const TASA_RETENCION = 0.08;

type Recibo = {
  id: string;
  trabajador_id: string;
  proyecto_id: string | null;
  numero_recibo: string;
  fecha_emision: string;
  concepto: string;
  monto_bruto: number;
  retencion: number;
  monto_neto: number;
  estado_pago: string;
  banco_id: string | null;
  fecha_pago: string | null;
  numero_operacion: string;
};

const calcularRetencion = (bruto: number, suspension: boolean) =>
  !suspension && bruto > TOPE_RETENCION ? Math.round(bruto * TASA_RETENCION * 100) / 100 : 0;

function Honorarios() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: proyectos = [] } = useProyectos();
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
  const [form, setForm] = useState({ trabajador_id: "", proyecto_id: "", numero_recibo: "", fecha_emision: hoy(), concepto: "", monto_bruto: "" });
  const [busqueda, setBusqueda] = useState("");
  const recibosFiltrados = recibos.filter((r) =>
    coincide(busqueda, nombreDe(r.trabajador_id), r.numero_recibo, r.concepto),
  );
  const [pago, setPago] = useState<{ id: string; banco_id: string; fecha_pago: string; numero_operacion: string } | null>(null);
  const [error, setError] = useState("");

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const sel = trabajadores.find((t) => t.id === form.trabajador_id);
  const bruto = Number(form.monto_bruto || 0);
  const ret = calcularRetencion(bruto, !!sel?.suspension_cuarta);
  const nombreDe = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";
  const obraDe = (id: string | null) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : "Oficina Central";
  };
  const refrescar = () => qc.invalidateQueries({ queryKey: ["recibos_honorarios"] });

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.trabajador_id) return setError("Selecciona al prestador.");
    if (!form.numero_recibo.trim()) return setError("Ingresa el número de recibo (ej. E001-25).");
    if (bruto <= 0) return setError("Ingresa un monto bruto válido.");
    const { error: err } = await supabase.from("recibos_honorarios").insert({
      trabajador_id: form.trabajador_id,
      proyecto_id: form.proyecto_id || null,
      numero_recibo: form.numero_recibo.trim().toUpperCase(),
      fecha_emision: form.fecha_emision,
      concepto: form.concepto.trim(),
      monto_bruto: bruto,
      retencion: ret,
      monto_neto: bruto - ret,
    });
    if (err) return setError(err.code === "23505" ? "Ese número de recibo ya está registrado para este prestador." : err.message);
    setForm({ ...form, numero_recibo: "", concepto: "", monto_bruto: "" });
    await refrescar();
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
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("recibos-honorarios", [
                {
                  nombre: "Recibos",
                  filas: recibos.map((r) => ({
                    Fecha: fecha(r.fecha_emision),
                    Prestador: nombreDe(r.trabajador_id),
                    "N° Recibo": r.numero_recibo,
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
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[["Total bruto", totBruto], ["Retenciones 4ta (por declarar)", totRet], ["Neto pendiente de pago", totPend]].map(([t, v]) => (
          <div key={t as string} className="panel p-4">
            <p className="label-mono">{t}</p>
            <p className="mt-1 text-lg font-semibold">{soles(v as number)}</p>
          </div>
        ))}
      </div>

      <Panel titulo="Nuevo recibo" className="mb-4">
        {prestadores.length === 0 ? (
          <Vacio texto="No hay personal con tipo de contratación 'Recibo por Honorarios'. Configúralo en Personal." />
        ) : (
          <form onSubmit={registrar} className="grid gap-1.5 p-3 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
            <Campo etiqueta="Prestador">
              <Select value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })} className="py-1.5">
                <option value="">Selecciona…</option>
                {prestadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="Obra / Centro de costo">
              <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} className="py-1.5">
                <option value="">Oficina Central</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}
              </Select>
            </Campo>
            <Campo etiqueta="N° Recibo">
              <Input value={form.numero_recibo} onChange={(e) => setForm({ ...form, numero_recibo: e.target.value })} placeholder="E001-25" maxLength={20} className="py-1.5" />
            </Campo>
            <Campo etiqueta="Fecha emisión">
              <Input type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} className="py-1.5" />
            </Campo>
            <Campo etiqueta="Concepto">
              <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} maxLength={200} className="py-1.5" />
            </Campo>
            <Campo etiqueta="Monto bruto (S/)">
              <Input type="number" step="0.01" min="0" value={form.monto_bruto} onChange={(e) => setForm({ ...form, monto_bruto: e.target.value })} className="py-1.5" />
            </Campo>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted-foreground">
                Retención: <b className="text-ink">{soles(ret)}</b> · Neto a pagar: <b className="text-ink">{soles(bruto - ret)}</b>
                {sel?.suspension_cuarta && " · Con suspensión de 4ta"}
              </p>
              <Boton type="submit" className="min-w-36">Registrar</Boton>
            </div>
          </form>
        )}
        {error && <p className="px-3 pb-3 font-mono text-xs text-bad">{error}</p>}
      </Panel>

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
                    <td className="px-3 py-2"><Resaltar texto={r.numero_recibo} termino={busqueda}/></td>
                    <td className="px-3 py-2 text-muted-foreground">{obraDe(r.proyecto_id)}</td>
                    <td className="px-3 py-2 text-right">{soles(Number(r.monto_bruto))}</td>
                    <td className="px-3 py-2 text-right">{soles(Number(r.retencion))}</td>
                    <td className="px-3 py-2 text-right font-semibold">{soles(Number(r.monto_neto))}</td>
                    <td className="px-3 py-2">
                      {pago?.id === r.id ? (
                        <div className="grid gap-1">
                          <Select value={pago.banco_id} onChange={(e) => setPago({ ...pago, banco_id: e.target.value })} className="py-1 text-xs">
                            <option value="">Banco…</option>
                            {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.numero_cuenta}</option>)}
                          </Select>
                          <Input type="date" value={pago.fecha_pago} onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })} className="py-1 text-xs" />
                          <Input placeholder="N° operación" value={pago.numero_operacion} onChange={(e) => setPago({ ...pago, numero_operacion: e.target.value })} className="py-1 text-xs" />
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
                            {r.estado_pago === "Pendiente" && (
                              <button type="button" title="Registrar pago" onClick={() => setPago({ id: r.id, banco_id: "", fecha_pago: hoy(), numero_operacion: "" })} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Check size={14} /></button>
                            )}
                            <button type="button" title="Eliminar" onClick={() => eliminar(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
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
    </>
  );
}
