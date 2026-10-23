import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, Input, MenuFiltros, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { consultarDocumentoSunat } from "@/lib/decolecta.functions";
import { useRecordado } from "@/lib/recordado";
import { ENTIDADES_AUTORIZACION, nombreConductor, useTransportistas, vencido, type TransportistaCompleto } from "@/lib/transportistas";

type Veh = { id?: string; placa: string; placa_secundaria: string; marca: string; tarjeta_circulacion: string };
type Con = { id?: string; nombres: string; apellidos: string; tipo_documento: string; numero_documento: string; licencia: string; categoria_licencia: string; licencia_vencimiento: string; celular: string };
const vehVacio = (): Veh => ({ placa: "", placa_secundaria: "", marca: "", tarjeta_circulacion: "" });
const conVacio = (): Con => ({ nombres: "", apellidos: "", tipo_documento: "DNI", numero_documento: "", licencia: "", categoria_licencia: "", licencia_vencimiento: "", celular: "" });
const formVacio = () => ({ ruc: "", razon_social: "", direccion: "", telefono: "", email: "", estado_sunat: "", condicion_sunat: "", registro_mtc: "", certificado_habilitacion: "", certificado_vencimiento: "", entidad_autorizacion: "MTC", numero_autorizacion: "", activo: true });
type Form = ReturnType<typeof formVacio>;

export function TransportistasPanel() {
  const qc = useQueryClient();
  const { data: lista = [] } = useTransportistas();
  const [busqueda, setBusqueda] = useRecordado("transportistas:busqueda", "");
  const [sel, setSel] = useState("");
  const [editar, setEditar] = useState<TransportistaCompleto | null | undefined>(undefined);
  const filtrados = lista.filter((t) => coincide(busqueda, t.ruc, t.razon_social, t.registro_mtc, ...t.vehiculos.map((v) => v.placa), ...t.conductores.map(nombreConductor)));

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este transportista con sus vehículos y conductores? Las guías emitidas no cambian.")) return;
    const { error } = await supabase.from("transportistas").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    setSel(""); void qc.invalidateQueries({ queryKey: ["transportistas"] });
  }

  return <>
    <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1" titulo="Transportistas">
        {filtrados.length === 0 ? <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay transportistas registrados."} accion={!busqueda && <Boton onClick={() => setEditar(null)}><Plus size={14} />Registrar transportista</Boton>} /> :
          <table className="w-full table-fixed font-mono text-xs">
            <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="w-[11%] px-4 py-2 font-medium">RUC</th><th className="w-[24%] px-3 py-2 font-medium">Razón social</th><th className="w-[12%] px-3 py-2 font-medium">Registro MTC</th><th className="w-[15%] px-3 py-2 font-medium">Certificado</th><th className="w-[12%] px-3 py-2 font-medium">Autorización</th><th className="w-[12%] px-3 py-2 font-medium">Vehículos</th><th className="w-[14%] px-3 py-2 font-medium">Conductores</th>
            </tr></thead>
            <tbody>{filtrados.map((t) => {
              const licVencida = t.conductores.some((c) => vencido(c.licencia_vencimiento));
              return <tr key={t.id} onClick={() => setSel(t.id)} onDoubleClick={() => setEditar(t)} className={`cursor-pointer border-b border-line/60 hover:bg-muted/40 ${sel === t.id ? "bg-primary/10" : ""} ${t.activo ? "" : "opacity-60"}`}>
                <td className="px-4 py-2"><Resaltar texto={t.ruc} termino={busqueda} /></td>
                <td className="truncate px-3 py-2 text-ink"><Resaltar texto={t.razon_social} termino={busqueda} />{!t.activo && <span className="ml-1"><Etiqueta tono="neutro">Inactivo</Etiqueta></span>}</td>
                <td className="px-3 py-2">{t.registro_mtc || "—"}</td>
                <td className="px-3 py-2">{t.certificado_habilitacion || "—"}{vencido(t.certificado_vencimiento) && <span className="ml-1"><Etiqueta tono="bad">Vencido</Etiqueta></span>}</td>
                <td className="truncate px-3 py-2">{t.entidad_autorizacion || "—"}</td>
                <td className="truncate px-3 py-2">{t.vehiculos.map((v) => v.placa).join(", ") || "—"}</td>
                <td className="truncate px-3 py-2">{t.conductores.length}{licVencida && <span className="ml-1"><Etiqueta tono="bad">Licencia vencida</Etiqueta></span>}</td>
              </tr>;
            })}</tbody>
          </table>}
      </Panel>
      <BarraIconosHoja objeto="transportista" haySeleccion={filtrados.some((t) => t.id === sel)}
        filtros={<MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={filtrados.length} placeholder="Buscar RUC, nombre, placa o conductor..." /></MenuFiltros>}
        onAgregar={() => setEditar(null)}
        onEditar={() => { const t = lista.find((x) => x.id === sel); if (t) setEditar(t); }}
        onEliminar={() => { if (sel) void eliminar(sel); }} />
    </div>
    {editar !== undefined && <VentanaTransportista inicial={editar} onCerrar={() => setEditar(undefined)} />}
  </>;
}

/** Ventana de registro/edición. `onGuardado` devuelve el id para que la guía lo seleccione. */
export function VentanaTransportista({ inicial, onCerrar, onGuardado }: { inicial: TransportistaCompleto | null; onCerrar: () => void; onGuardado?: (id: string) => void }) {
  const qc = useQueryClient();
  const buscarDoc = useServerFn(consultarDocumentoSunat);
  const [form, setForm] = useState<Form>(formVacio);
  const [vehs, setVehs] = useState<Veh[]>([vehVacio()]);
  const [cons, setCons] = useState<Con[]>([conVacio()]);
  const [aviso, setAviso] = useState(""); const [error, setError] = useState(""); const [guardando, setGuardando] = useState(false); const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!inicial) return;
    setForm({ ruc: inicial.ruc, razon_social: inicial.razon_social, direccion: inicial.direccion, telefono: inicial.telefono, email: inicial.email, estado_sunat: inicial.estado_sunat, condicion_sunat: inicial.condicion_sunat, registro_mtc: inicial.registro_mtc, certificado_habilitacion: inicial.certificado_habilitacion, certificado_vencimiento: inicial.certificado_vencimiento ?? "", entidad_autorizacion: inicial.entidad_autorizacion, numero_autorizacion: inicial.numero_autorizacion, activo: inicial.activo });
    setVehs(inicial.vehiculos.length ? inicial.vehiculos.map((v) => ({ id: v.id, placa: v.placa, placa_secundaria: v.placa_secundaria, marca: v.marca, tarjeta_circulacion: v.tarjeta_circulacion })) : [vehVacio()]);
    setCons(inicial.conductores.length ? inicial.conductores.map((c) => ({ id: c.id, nombres: c.nombres, apellidos: c.apellidos, tipo_documento: c.tipo_documento, numero_documento: c.numero_documento, licencia: c.licencia, categoria_licencia: c.categoria_licencia, licencia_vencimiento: c.licencia_vencimiento ?? "", celular: c.celular })) : [conVacio()]);
  }, [inicial]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function consultarRuc() {
    const ruc = form.ruc.replace(/\D/g, "");
    if (ruc.length !== 11) { setAviso("El RUC debe tener 11 dígitos."); return; }
    setBuscando(true); setAviso("");
    try {
      const r = await buscarDoc({ data: { numero: ruc } });
      if (r.encontrado) setForm((f) => ({ ...f, ruc, razon_social: r.razonSocial, direccion: r.direccion || f.direccion, estado_sunat: r.estado, condicion_sunat: r.condicion }));
      const noApto = r.encontrado && (r.estado !== "ACTIVO" || r.condicion !== "HABIDO");
      setAviso(r.mensaje || (noApto ? `Atención: el RUC figura ${r.estado} · ${r.condicion} en SUNAT.` : r.encontrado ? "Datos obtenidos de SUNAT (Decolecta)." : ""));
    } catch { setAviso("No se pudo completar la consulta."); } finally { setBuscando(false); }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const ruc = form.ruc.replace(/\D/g, "");
    if (ruc.length !== 11) return setError("El RUC debe tener 11 dígitos.");
    if (!form.razon_social.trim()) return setError("Ingresa la razón social (consulta el RUC).");
    const vs = vehs.filter((v) => v.placa.trim()); const cs = cons.filter((c) => c.nombres.trim() || c.numero_documento.trim() || c.licencia.trim());
    if (cs.some((c) => !c.nombres.trim() || !c.numero_documento.trim() || !c.licencia.trim())) return setError("Cada conductor necesita nombres, documento y licencia.");
    if (cs.some((c) => c.tipo_documento === "DNI" && !/^\d{8}$/.test(c.numero_documento.trim()))) return setError("El DNI del conductor debe tener 8 dígitos.");
    setGuardando(true);
    try {
      const campos = { ...form, ruc, razon_social: form.razon_social.trim(), certificado_vencimiento: form.certificado_vencimiento || null };
      const res = inicial ? await supabase.from("transportistas").update(campos).eq("id", inicial.id).select("id").single() : await supabase.from("transportistas").insert(campos).select("id").single();
      if (res.error) throw new Error(res.error.code === "23505" ? "Ya existe un transportista con ese RUC." : res.error.message);
      const id = res.data.id;
      // Reemplaza vehículos y conductores: las guías guardan copia, no dependen de estos ids.
      const d1 = await supabase.from("transportista_vehiculos").delete().eq("transportista_id", id); if (d1.error) throw d1.error;
      const d2 = await supabase.from("transportista_conductores").delete().eq("transportista_id", id); if (d2.error) throw d2.error;
      if (vs.length) { const r = await supabase.from("transportista_vehiculos").insert(vs.map((v) => ({ transportista_id: id, placa: v.placa.trim().toUpperCase(), placa_secundaria: v.placa_secundaria.trim().toUpperCase(), marca: v.marca.trim(), tarjeta_circulacion: v.tarjeta_circulacion.trim() }))); if (r.error) throw r.error; }
      if (cs.length) { const r = await supabase.from("transportista_conductores").insert(cs.map((c) => ({ transportista_id: id, nombres: c.nombres.trim(), apellidos: c.apellidos.trim(), tipo_documento: c.tipo_documento, numero_documento: c.numero_documento.trim(), licencia: c.licencia.trim().toUpperCase(), categoria_licencia: c.categoria_licencia.trim().toUpperCase(), licencia_vencimiento: c.licencia_vencimiento || null, celular: c.celular.trim() }))); if (r.error) throw r.error; }
      await qc.invalidateQueries({ queryKey: ["transportistas"] });
      toast.success(inicial ? "Transportista actualizado" : "Transportista registrado");
      onGuardado?.(id); onCerrar();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); } finally { setGuardando(false); }
  }

  return <VentanaFlotante titulo={inicial ? "Editar transportista" : "Registrar transportista"} subtitulo="Empresa de transporte público para guías de remisión" abierta onCerrar={onCerrar} ancho="max-w-4xl">
    <form onSubmit={guardar} className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Campo etiqueta="RUC"><div className="flex gap-1"><Input value={form.ruc} autoFocus maxLength={11} onChange={(e) => set("ruc", e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void consultarRuc(); } }} /><BotonIcono etiqueta="Consultar RUC en SUNAT" onClick={() => void consultarRuc()} disabled={buscando}><Search size={13} /></BotonIcono></div></Campo>
        <div className="sm:col-span-3"><Campo etiqueta="Razón social"><Input value={form.razon_social} onChange={(e) => set("razon_social", e.target.value)} maxLength={160} /></Campo></div>
        <div className="sm:col-span-2"><Campo etiqueta="Dirección"><Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} /></Campo></div>
        <Campo etiqueta="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} maxLength={30} /></Campo>
        <Campo etiqueta="Correo"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Campo>
      </div>
      {(aviso || form.estado_sunat) && <p className={`text-xs ${form.estado_sunat && (form.estado_sunat !== "ACTIVO" || form.condicion_sunat !== "HABIDO") ? "text-bad" : "text-muted-foreground"}`}>{aviso || `SUNAT: ${form.estado_sunat} · ${form.condicion_sunat}`}</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Campo etiqueta="N° registro MTC"><Input value={form.registro_mtc} onChange={(e) => set("registro_mtc", e.target.value.toUpperCase())} /></Campo>
        <Campo etiqueta="Certificado habilitación vehicular"><Input value={form.certificado_habilitacion} onChange={(e) => set("certificado_habilitacion", e.target.value.toUpperCase())} /></Campo>
        <Campo etiqueta="Vence certificado"><Input type="date" value={form.certificado_vencimiento} onChange={(e) => set("certificado_vencimiento", e.target.value)} /></Campo>
        <Campo etiqueta="Estado"><Select value={form.activo ? "1" : "0"} onChange={(e) => set("activo", e.target.value === "1")}><option value="1">Activo</option><option value="0">Inactivo</option></Select></Campo>
        <div className="sm:col-span-2"><Campo etiqueta="Entidad emisora de la autorización"><Select value={form.entidad_autorizacion} onChange={(e) => set("entidad_autorizacion", e.target.value)}>{ENTIDADES_AUTORIZACION.map((x) => <option key={x}>{x}</option>)}</Select></Campo></div>
        <div className="sm:col-span-2"><Campo etiqueta="N° autorización especial"><Input value={form.numero_autorizacion} onChange={(e) => set("numero_autorizacion", e.target.value.toUpperCase())} /></Campo></div>
      </div>

      <Seccion titulo="Vehículos" onAgregar={() => setVehs([...vehs, vehVacio()])}>
        {vehs.map((v, i) => <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2">
          <Input placeholder="Placa principal" value={v.placa} onChange={(e) => setVehs(vehs.map((x, n) => n === i ? { ...x, placa: e.target.value.toUpperCase() } : x))} />
          <Input placeholder="Placa secundaria" value={v.placa_secundaria} onChange={(e) => setVehs(vehs.map((x, n) => n === i ? { ...x, placa_secundaria: e.target.value.toUpperCase() } : x))} />
          <Input placeholder="Marca" value={v.marca} onChange={(e) => setVehs(vehs.map((x, n) => n === i ? { ...x, marca: e.target.value } : x))} />
          <Input placeholder="TUCE / tarjeta circulación" value={v.tarjeta_circulacion} onChange={(e) => setVehs(vehs.map((x, n) => n === i ? { ...x, tarjeta_circulacion: e.target.value } : x))} />
          <BotonIcono etiqueta="Quitar vehículo" tono="peligro" onClick={() => setVehs(vehs.filter((_, n) => n !== i))}><Trash2 size={13} /></BotonIcono>
        </div>)}
      </Seccion>

      <Seccion titulo="Conductores" onAgregar={() => setCons([...cons, conVacio()])}>
        {cons.map((c, i) => { const up = (k: keyof Con, val: string) => setCons(cons.map((x, n) => n === i ? { ...x, [k]: val } : x)); return <div key={i} className="grid grid-cols-[1.2fr_1.2fr_.6fr_.9fr_.9fr_.5fr_.9fr_.8fr_auto] gap-2">
          <Input placeholder="Nombres" value={c.nombres} onChange={(e) => up("nombres", e.target.value)} />
          <Input placeholder="Apellidos" value={c.apellidos} onChange={(e) => up("apellidos", e.target.value)} />
          <Select value={c.tipo_documento} onChange={(e) => up("tipo_documento", e.target.value)}><option>DNI</option><option>CE</option></Select>
          <Input placeholder="N° documento" value={c.numero_documento} onChange={(e) => up("numero_documento", e.target.value)} />
          <Input placeholder="N° licencia" value={c.licencia} onChange={(e) => up("licencia", e.target.value.toUpperCase())} />
          <Input placeholder="Cat." title="Categoría de licencia (A-IIb, A-IIIc…)" value={c.categoria_licencia} onChange={(e) => up("categoria_licencia", e.target.value.toUpperCase())} />
          <Input type="date" title="Vencimiento de licencia" value={c.licencia_vencimiento} onChange={(e) => up("licencia_vencimiento", e.target.value)} className={vencido(c.licencia_vencimiento) ? "border-bad text-bad" : ""} />
          <Input placeholder="Celular" value={c.celular} onChange={(e) => up("celular", e.target.value)} />
          <BotonIcono etiqueta="Quitar conductor" tono="peligro" onClick={() => setCons(cons.filter((_, n) => n !== i))}><Trash2 size={13} /></BotonIcono>
        </div>; })}
      </Seccion>

      {error && <p className="font-mono text-xs text-bad">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Boton type="button" variante="linea" onClick={onCerrar}>Cancelar</Boton>
        <Boton type="submit" variante="accion" disabled={guardando}><Check size={14} />{guardando ? "Guardando…" : "Guardar"}</Boton>
      </div>
    </form>
  </VentanaFlotante>;
}

function Seccion({ titulo, onAgregar, children }: { titulo: string; onAgregar: () => void; children: React.ReactNode }) {
  return <div className="space-y-2 rounded-md border border-line p-3">
    <div className="flex items-center justify-between"><span className="label-mono">{titulo}</span><Boton type="button" variante="linea" onClick={onAgregar}><Plus size={13} />Agregar</Boton></div>
    {children}
  </div>;
}
