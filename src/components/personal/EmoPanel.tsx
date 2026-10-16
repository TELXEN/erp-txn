import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Pencil, Plus, Stethoscope, Trash2, Upload, Wallet, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import type { Trabajador } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import {
  diasParaVencer, type Emo, estadoEmo, ESTADO_EMO_INFO, EXAMENES_EMO, RESULTADOS_EMO,
  sumarAnios, TIPOS_EMO, ultimoEmoPorTrabajador, useEmos,
} from "@/lib/emo";

type FormEmo = {
  trabajador_id: string; tipo_emo: string; examenes: string[]; resultado: string; restricciones: string;
  fecha_emo: string; fecha_vencimiento: string; clinica: string; sede_clinica: string;
  costo: string; estado_pago: "Pendiente" | "Pagado"; fecha_pago: string; observaciones: string;
};

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const VACIO = (): FormEmo => ({
  trabajador_id: "", tipo_emo: "Periódico", examenes: ["Examen clínico"], resultado: "Apto", restricciones: "",
  fecha_emo: hoy(), fecha_vencimiento: sumarAnios(hoy(), 1), clinica: "", sede_clinica: "",
  costo: "", estado_pago: "Pendiente", fecha_pago: "", observaciones: "",
});

const fmt = (f?: string | null) => (f ? f.split("-").reverse().join("/") : "—");

function Etq({ t, req, children }: { t: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink">{t}{req && <span className="ml-0.5 text-bad">*</span>}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function EmoPanel({ trabajadores }: { trabajadores: Trabajador[] }) {
  const qc = useQueryClient();
  const { data: emos, isLoading: cargando } = useEmos();
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormEmo>(VACIO());
  const [error, setError] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fClinica, setFClinica] = useState("");
  const [fTexto, setFTexto] = useState("");

  async function cargar() {
    await qc.invalidateQueries({ queryKey: ["emos_trabajador"] });
  }

  const lista = emos ?? [];
  const nombre = useMemo(() => new Map(trabajadores.map((t) => [t.id, t])), [trabajadores]);
  const clinicas = useMemo(() => [...new Set(lista.map((e) => e.clinica))].sort(), [lista]);
  const sedes = useMemo(() => [...new Set(lista.filter((e) => !form.clinica || e.clinica === form.clinica).map((e) => e.sede_clinica ?? "").filter(Boolean))].sort(), [lista, form.clinica]);

  const ultimos = ultimoEmoPorTrabajador(lista);
  const resumen = { vigente: 0, por_vencer: 0, vencido: 0 };
  ultimos.forEach((e) => { const s = estadoEmo(e.fecha_vencimiento); if (s !== "sin_emo") resumen[s]++; });
  const pendientes = lista.filter((e) => e.estado_pago === "Pendiente");
  const montoPend = pendientes.reduce((s, e) => s + Number(e.costo), 0);

  const filtrados = lista.filter((e) => {
    const t = nombre.get(e.trabajador_id);
    if (fEstado === "pendiente") { if (e.estado_pago !== "Pendiente") return false; }
    else if (fEstado && estadoEmo(e.fecha_vencimiento) !== fEstado) return false;
    if (fClinica && e.clinica !== fClinica) return false;
    if (fTexto) {
      const q = fTexto.toLowerCase();
      if (!`${t?.nombre ?? ""} ${t?.dni ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const set = <K extends keyof FormEmo>(k: K, v: FormEmo[K]) => setForm((f) => ({ ...f, [k]: v }));

  const faltante = !form.trabajador_id ? "Selecciona el trabajador"
    : !form.fecha_emo ? "Indica la fecha del EMO"
    : !form.fecha_vencimiento || form.fecha_vencimiento < form.fecha_emo ? "El vencimiento debe ser posterior a la fecha del EMO"
    : form.examenes.length === 0 ? "Marca al menos un examen"
    : !form.clinica.trim() ? "Indica la clínica"
    : form.estado_pago === "Pagado" && !form.fecha_pago ? "Indica la fecha de pago"
    : Number(form.costo || 0) < 0 ? "El costo no puede ser negativo" : "";

  function nuevo() { setForm(VACIO()); setEditId(null); setAbierto(true); setError(""); }
  function editar(e: Emo) {
    setForm({
      trabajador_id: e.trabajador_id, tipo_emo: e.tipo_emo, examenes: e.examenes ?? [], resultado: e.resultado,
      restricciones: e.restricciones ?? "", fecha_emo: e.fecha_emo, fecha_vencimiento: e.fecha_vencimiento,
      clinica: e.clinica, sede_clinica: e.sede_clinica ?? "", costo: String(e.costo ?? ""), estado_pago: e.estado_pago,
      fecha_pago: e.fecha_pago ?? "", observaciones: e.observaciones ?? "",
    });
    setEditId(e.id); setAbierto(true); setError("");
  }

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (faltante) return setError(faltante);
    const datos = {
      trabajador_id: form.trabajador_id, tipo_emo: form.tipo_emo, examenes: form.examenes, resultado: form.resultado,
      restricciones: form.resultado === "Apto con restricciones" ? form.restricciones.trim().slice(0, 500) || null : null,
      fecha_emo: form.fecha_emo, fecha_vencimiento: form.fecha_vencimiento,
      clinica: form.clinica.trim().slice(0, 120), sede_clinica: form.sede_clinica.trim().slice(0, 120) || null,
      costo: Number(form.costo || 0), estado_pago: form.estado_pago,
      fecha_pago: form.estado_pago === "Pagado" ? form.fecha_pago : null,
      observaciones: form.observaciones.trim().slice(0, 1000) || null,
    };
    const { error: e } = editId
      ? await supabase.from("emos_trabajador").update(datos).eq("id", editId)
      : await supabase.from("emos_trabajador").insert(datos);
    if (e) return setError(e.message);
    setAbierto(false); setEditId(null); setForm(VACIO());
    await cargar();
  }

  async function marcarPagado(e: Emo) {
    const f = window.prompt("Fecha de pago (AAAA-MM-DD)", hoy());
    if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return;
    const { error: er } = await supabase.from("emos_trabajador").update({ estado_pago: "Pagado", fecha_pago: f }).eq("id", e.id);
    if (er) return setError(er.message);
    await cargar();
  }

  async function eliminar(e: Emo) {
    if (!window.confirm("¿Eliminar este registro de EMO?")) return;
    const { error: er } = await supabase.from("emos_trabajador").delete().eq("id", e.id);
    if (er) return setError(er.message);
    await cargar();
  }

  function excel() {
    exportarExcel("emo", [{
      nombre: "EMO",
      filas: lista.map((e) => {
        const t = nombre.get(e.trabajador_id);
        return {
          DNI: t?.dni ?? "", Trabajador: t?.nombre ?? "", "Tipo EMO": e.tipo_emo, Exámenes: (e.examenes ?? []).join(", "),
          Resultado: e.resultado, Restricciones: e.restricciones ?? "", "Fecha EMO": fmt(e.fecha_emo),
          Vencimiento: fmt(e.fecha_vencimiento), Estado: ESTADO_EMO_INFO[estadoEmo(e.fecha_vencimiento)].texto,
          Clínica: e.clinica, Sede: e.sede_clinica ?? "", "Costo (S/)": Number(e.costo), Pago: e.estado_pago,
          "Fecha pago": fmt(e.fecha_pago), Observaciones: e.observaciones ?? "",
        };
      }),
    }]);
  }

  const tarjetas = [
    { k: "vigente", t: "Vigentes", v: String(resumen.vigente), icono: CheckCircle2, c: "text-good" },
    { k: "por_vencer", t: "Por vencer (≤30 días)", v: String(resumen.por_vencer), icono: CalendarClock, c: "text-warn" },
    { k: "vencido", t: "Vencidos", v: String(resumen.vencido), icono: AlertTriangle, c: "text-bad" },
    { k: "pendiente", t: `Pagos pendientes (${pendientes.length})`, v: soles(montoPend), icono: Wallet, c: "text-ink" },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ k, t, v, icono: I, c }) => (
          <button key={k} type="button" onClick={() => setFEstado(fEstado === k ? "" : k)}
            className={`flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition hover:shadow-sm ${fEstado === k ? "border-primary ring-1 ring-primary" : "border-line"}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${c}`}><I size={18} /></span>
            <span>
              <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">{t}</span>
              <span className={`block text-xl font-bold tabular-nums ${c}`}>{v}</span>
            </span>
          </button>
        ))}
      </div>

      {abierto && (
        <Panel titulo={editId ? "Editar EMO" : "Registrar EMO"} className="mb-4"
          extra={<button type="button" onClick={() => setAbierto(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X size={15} /></button>}>
          <form onSubmit={guardar} className="space-y-4 p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg border border-line p-3">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>Trabajador y examen</h3>
                <div className="grid gap-3">
                  <Etq t="Trabajador" req>
                    <Select value={form.trabajador_id} onChange={(e) => set("trabajador_id", e.target.value)} className="py-1.5">
                      <option value="">Selecciona…</option>
                      {[...trabajadores].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.dni}</option>)}
                    </Select>
                  </Etq>
                  <div className="grid grid-cols-2 gap-3">
                    <Etq t="Tipo de EMO" req>
                      <Select value={form.tipo_emo} onChange={(e) => set("tipo_emo", e.target.value)} className="py-1.5">{TIPOS_EMO.map((x) => <option key={x}>{x}</option>)}</Select>
                    </Etq>
                    <Etq t="Resultado" req>
                      <Select value={form.resultado} onChange={(e) => set("resultado", e.target.value)} className="py-1.5">{RESULTADOS_EMO.map((x) => <option key={x}>{x}</option>)}</Select>
                    </Etq>
                  </div>
                  {form.resultado === "Apto con restricciones" && (
                    <Etq t="Restricciones"><Input value={form.restricciones} maxLength={500} onChange={(e) => set("restricciones", e.target.value)} className="py-1.5" placeholder="Ej. no trabajos en altura" /></Etq>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-line p-3">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">2</span>Exámenes realizados</h3>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMENES_EMO.map((x) => {
                    const on = form.examenes.includes(x);
                    return (
                      <button key={x} type="button" onClick={() => set("examenes", on ? form.examenes.filter((y) => y !== x) : [...form.examenes, x])}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-line text-ink hover:border-primary/60"}`}>
                        {x}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Etq t="Fecha del EMO" req>
                    <Input type="date" value={form.fecha_emo} onChange={(e) => setForm((f) => ({ ...f, fecha_emo: e.target.value, fecha_vencimiento: editId ? f.fecha_vencimiento : sumarAnios(e.target.value, 1) }))} className="py-1.5" />
                  </Etq>
                  <Etq t="Vencimiento" req>
                    <Input type="date" value={form.fecha_vencimiento} min={form.fecha_emo} onChange={(e) => set("fecha_vencimiento", e.target.value)} className="py-1.5" />
                  </Etq>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2].map((n) => <button key={n} type="button" onClick={() => set("fecha_vencimiento", sumarAnios(form.fecha_emo, n))} className="rounded-md border border-line px-2 py-0.5 text-[11px] hover:border-primary hover:text-primary">+{n} año{n > 1 ? "s" : ""}</button>)}
                  {form.fecha_vencimiento && (() => { const s = estadoEmo(form.fecha_vencimiento); return <span className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] ${ESTADO_EMO_INFO[s].clase}`}>{ESTADO_EMO_INFO[s].texto} · {diasParaVencer(form.fecha_vencimiento)} días</span>; })()}
                </div>
              </section>

              <section className="rounded-lg border border-line p-3">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">3</span>Clínica y pago</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Etq t="Clínica" req>
                    <Input list="emo-clinicas" value={form.clinica} maxLength={120} onChange={(e) => set("clinica", e.target.value)} className="py-1.5" />
                    <datalist id="emo-clinicas">{clinicas.map((c) => <option key={c} value={c} />)}</datalist>
                  </Etq>
                  <Etq t="Sede">
                    <Input list="emo-sedes" value={form.sede_clinica} maxLength={120} onChange={(e) => set("sede_clinica", e.target.value)} className="py-1.5" />
                    <datalist id="emo-sedes">{sedes.map((c) => <option key={c} value={c} />)}</datalist>
                  </Etq>
                  <Etq t="Costo (S/)">
                    <Input type="number" min="0" step="0.01" value={form.costo} onChange={(e) => set("costo", e.target.value)} className="py-1.5 text-right" />
                  </Etq>
                  <Etq t="Pago">
                    <div className="flex rounded-md border border-line p-0.5">
                      {(["Pendiente", "Pagado"] as const).map((p) => (
                        <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, estado_pago: p, fecha_pago: p === "Pagado" ? f.fecha_pago || hoy() : "" }))}
                          className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold ${form.estado_pago === p ? (p === "Pagado" ? "bg-good text-primary-foreground" : "bg-warn text-primary-foreground") : "text-muted-foreground"}`}>{p}</button>
                      ))}
                    </div>
                  </Etq>
                  {form.estado_pago === "Pagado" && (
                    <Etq t="Fecha de pago" req><Input type="date" value={form.fecha_pago} onChange={(e) => set("fecha_pago", e.target.value)} className="py-1.5" /></Etq>
                  )}
                  <div className="col-span-2">
                    <Etq t="Observaciones"><Input value={form.observaciones} maxLength={1000} onChange={(e) => set("observaciones", e.target.value)} className="py-1.5" /></Etq>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex items-center justify-end gap-3">
              <p className={`mr-auto text-xs ${error ? "text-bad" : "text-muted-foreground"}`}>{error || faltante}</p>
              <Boton type="button" variante="linea" onClick={() => setAbierto(false)}>Cancelar</Boton>
              <Boton type="submit" variante="accion" disabled={!!faltante} className="min-w-36">{editId ? "Guardar cambios" : "Registrar EMO"}</Boton>
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Exámenes médicos ocupacionales"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Input value={fTexto} onChange={(e) => setFTexto(e.target.value)} placeholder="Trabajador o DNI…" className="w-44 py-1 text-xs" />
            <Select value={fClinica} onChange={(e) => setFClinica(e.target.value)} className="w-40 py-1 text-xs">
              <option value="">Todas las clínicas</option>{clinicas.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Boton variante="linea" onClick={excel}><Upload size={13} /> Excel</Boton>
            <Boton variante="accion" onClick={nuevo}><Plus size={13} /> Nuevo EMO</Boton>
          </div>
        }>
        {error && !abierto && <p className="border-b border-line px-5 py-2 text-xs text-bad">{error}</p>}
        {filtrados.length === 0 ? (
          <Vacio texto={cargando ? "Cargando…" : lista.length ? "Sin coincidencias con los filtros." : "Aún no hay EMO registrados."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs">
              <thead>
                <tr className="border-b border-line bg-muted/50 text-left text-[10px] uppercase text-ink">
                  <th className="px-4 py-2">Trabajador</th><th className="px-3 py-2">Tipo / resultado</th><th className="px-3 py-2">Exámenes</th>
                  <th className="px-3 py-2">Fecha EMO</th><th className="px-3 py-2">Vencimiento</th><th className="px-3 py-2">Clínica</th>
                  <th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2">Pago</th><th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e) => {
                  const t = nombre.get(e.trabajador_id);
                  const s = estadoEmo(e.fecha_vencimiento);
                  const d = diasParaVencer(e.fecha_vencimiento);
                  return (
                    <tr key={e.id} className="border-b border-line/60 align-top last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><span className="block font-semibold text-ink">{t?.nombre ?? "—"}</span><span className="font-mono text-[10px] text-muted-foreground">{t?.dni}</span></td>
                      <td className="px-3 py-3"><span className="block text-ink">{e.tipo_emo}</span><span className={`text-[10px] ${e.resultado === "No apto" ? "text-bad" : e.resultado === "Apto" ? "text-good" : "text-warn"}`}>{e.resultado}</span>{e.restricciones && <span className="block text-[10px] text-muted-foreground">{e.restricciones}</span>}</td>
                      <td className="max-w-[220px] px-3 py-3 text-[11px] text-muted-foreground">{(e.examenes ?? []).join(", ")}</td>
                      <td className="px-3 py-3 font-mono">{fmt(e.fecha_emo)}</td>
                      <td className="px-3 py-3"><span className="block font-mono">{fmt(e.fecha_vencimiento)}</span><span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${ESTADO_EMO_INFO[s].clase}`}><span className={`h-1.5 w-1.5 rounded-full ${ESTADO_EMO_INFO[s].punto}`} />{d < 0 ? `Vencido hace ${-d} d` : `${d} días`}</span></td>
                      <td className="px-3 py-3"><span className="block text-ink">{e.clinica}</span><span className="text-[10px] text-muted-foreground">{e.sede_clinica}</span></td>
                      <td className="px-3 py-3 text-right tabular-nums">{soles(Number(e.costo))}</td>
                      <td className="px-3 py-3">{e.estado_pago === "Pagado"
                        ? <span className="text-good"><span className="block font-semibold">Pagado</span><span className="font-mono text-[10px]">{fmt(e.fecha_pago)}</span></span>
                        : <button type="button" onClick={() => marcarPagado(e)} className="rounded-full border border-warn/50 px-2 py-0.5 text-[10px] font-semibold text-warn hover:bg-warn/10" title="Marcar como pagado">Pendiente · pagar</button>}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => editar(e)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary" title="Editar"><Pencil size={14} /></button>
                          <button type="button" onClick={() => eliminar(e)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad" title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Stethoscope size={12} /> Se alerta cuando faltan 30 días o menos para el vencimiento del último EMO de cada trabajador.</p>
    </>
  );
}
