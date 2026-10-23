import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { hoy, soles } from "@/lib/format";
import { useTipoCambioHoy } from "@/lib/tipo-cambio";
import { useServerFn } from "@tanstack/react-start";
import { consultarDocumentoSunat } from "@/lib/decolecta.functions";

/** Registro de una venta ya facturada por un tercero (PSE / portal SUNAT): no emite, solo registra en Ventas. */
type Form = { tipo: "Factura" | "Boleta"; numero: string; fecha: string; cliente_id: string; proyecto_id: string; concepto: string; moneda: "PEN" | "USD"; tc: string; valor: string; igv: string; condicion: "Contado" | "Crédito"; dias: string; regimen: "ninguno" | "detraccion" | "retencion"; pct: string };
const vacio = (tc = "1"): Form => ({ tipo: "Factura", numero: "", fecha: hoy(), cliente_id: "", proyecto_id: "", concepto: "", moneda: "PEN", tc, valor: "", igv: "", condicion: "Contado", dias: "30", regimen: "ninguno", pct: "12" });
const r2 = (n: number) => Number(n.toFixed(2));

export type VentaInicial = Partial<Form> & { ruc?: string; razon?: string };

/** Venta existente a editar (fila de ventas). */
export type VentaEditable = { id: string; numero_factura: string; fecha_emision: string; cliente_id: string | null; proyecto_id: string | null; concepto: string | null; moneda: string | null; tipo_cambio: number | null; monto: number | null; igv: number | null; condicion_pago: string | null; dias_credito: number | null; tipo_tributario: string | null; pct_detraccion: number | null; estado: string | null; fecha_pago: string | null; banco_id: string | null };
export const ventaCobrada = (v: Pick<VentaEditable, "estado" | "fecha_pago" | "banco_id">) => v.estado === "Pagado" || !!v.fecha_pago || !!v.banco_id;

export function RegistrarVentaExterna({ abierta, onCerrar, inicial, onGuardado, editar }: { abierta: boolean; onCerrar: () => void; inicial?: VentaInicial | null; onGuardado?: () => void; editar?: VentaEditable | null }) {
  const rucFijo = editar ? "" : inicial?.ruc ?? "";
  const cobrada = !!editar && ventaCobrada(editar);
  const buscarDoc = useServerFn(consultarDocumentoSunat);
  const [creandoCli, setCreandoCli] = useState(false);
  const qc = useQueryClient();
  const { data: tcHoy } = useTipoCambioHoy();
  const [f, setF] = useState<Form>(vacio());
  const [igvManual, setIgvManual] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { data: clientes = [] } = useQuery({ queryKey: ["terceros", "clientes-venta-ext"], queryFn: async () => { const { data, error } = await supabase.from("terceros").select("id,razon_social,numero_documento,es_agente_retencion").eq("es_cliente", true).eq("activo", true).order("razon_social"); if (error) throw error; return data ?? []; } });
  const { data: proyectos = [] } = useQuery({ queryKey: ["proyectos"], queryFn: async () => { const { data, error } = await supabase.from("proyectos").select("id,nombre,codigo").order("nombre"); if (error) throw error; return data ?? []; } });

  useEffect(() => {
    if (!abierta) return;
    const base = vacio(tcHoy?.venta ? String(tcHoy.venta) : "3.75");
    if (editar) {
      const reg = (editar.tipo_tributario ?? "ninguno") as Form["regimen"];
      setF({ ...base, tipo: editar.numero_factura.startsWith("B") ? "Boleta" : "Factura", numero: editar.numero_factura, fecha: editar.fecha_emision, cliente_id: editar.cliente_id ?? "", proyecto_id: editar.proyecto_id ?? "", concepto: editar.concepto ?? "", moneda: editar.moneda === "USD" ? "USD" : "PEN", tc: String(editar.tipo_cambio ?? 1), valor: String(editar.monto ?? 0), igv: String(editar.igv ?? 0), condicion: editar.condicion_pago === "Crédito" ? "Crédito" : "Contado", dias: String(editar.dias_credito ?? 30), regimen: ["detraccion", "retencion"].includes(reg) ? reg : "ninguno", pct: String(editar.pct_detraccion || 12) });
      setIgvManual(true); return;
    }
    if (inicial) {
      const { ruc, razon, ...resto } = inicial;
      const cli = ruc ? clientes.find((c) => c.numero_documento === ruc) : undefined;
      setF({ ...base, ...resto, cliente_id: cli?.id ?? "", regimen: cli?.es_agente_retencion ? "retencion" : base.regimen });
      setIgvManual(resto.igv != null);
    } else setF(base);
    if (!inicial) setIgvManual(false);
  }, [abierta, inicial, editar, clientes.length]);
  const cliFijo = rucFijo ? clientes.find((c) => c.numero_documento === rucFijo) : undefined;
  useEffect(() => { if (abierta && cliFijo && f.cliente_id !== cliFijo.id) setF((p) => ({ ...p, cliente_id: cliFijo.id, regimen: cliFijo.es_agente_retencion && p.regimen === "ninguno" ? "retencion" : p.regimen })); }, [abierta, cliFijo?.id]);

  /** Alta del cliente de la factura con datos de Decolecta, sin salir de la ventana. */
  async function registrarCliente() {
    setCreandoCli(true);
    try {
      const r = await buscarDoc({ data: { numero: rucFijo } });
      const razon = r.encontrado ? r.razonSocial : (inicial?.razon ?? "").trim();
      if (!razon) { toast.error(r.mensaje || "No se obtuvo la razón social"); return; }
      const { data: ex } = await supabase.from("terceros").select("id").eq("numero_documento", rucFijo).limit(1);
      if (ex?.length) await supabase.from("terceros").update({ es_cliente: true, activo: true } as never).eq("id", ex[0]!.id);
      else { const { error } = await supabase.from("terceros").insert({ tipo_documento: rucFijo.length === 11 ? "RUC" : "DNI", numero_documento: rucFijo, razon_social: razon, direccion: r.direccion ?? "", es_cliente: true, es_proveedor: false } as never); if (error) { toast.error(error.message); return; } }
      toast.success(`Cliente ${razon} registrado`);
      await qc.invalidateQueries({ queryKey: ["terceros"] });
    } catch { toast.error("No se pudo registrar el cliente"); } finally { setCreandoCli(false); }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const valor = Number(f.valor || 0);
  const igv = igvManual ? Number(f.igv || 0) : r2(valor * 0.18);
  const total = r2(valor + igv);
  const tc = f.moneda === "USD" ? Number(f.tc || 0) : 1;
  const totalPen = r2(total * tc);
  const aplica = f.regimen !== "ninguno" && totalPen > 700;
  const pct = f.regimen === "retencion" ? 3 : Number(f.pct || 0);
  const retenidoPen = aplica ? (f.regimen === "detraccion" ? Math.round((total * pct) / 100 * tc) : r2((totalPen * pct) / 100)) : 0;
  const neto = r2(total - retenidoPen / (tc || 1));

  function elegirCliente(id: string) {
    const c = clientes.find((x) => x.id === id);
    setF((p) => ({ ...p, cliente_id: id, regimen: c?.es_agente_retencion && p.regimen === "ninguno" ? "retencion" : p.regimen }));
  }

  async function guardar(seguir: boolean) {
    const numero = f.numero.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-\d{1,8}$/.test(numero)) { toast.error("Número inválido. Usa serie-correlativo, p. ej. F001-123"); return; }
    if (!f.cliente_id) { toast.error(rucFijo ? `Registra primero el cliente con RUC ${rucFijo}` : "Elige el cliente"); return; }
    if (rucFijo && clientes.find((c) => c.id === f.cliente_id)?.numero_documento !== rucFijo) { toast.error(`El cliente debe tener el RUC de la factura (${rucFijo})`); return; }
    if (valor <= 0) { toast.error("Ingresa el valor de venta"); return; }
    if (f.moneda === "USD" && tc <= 0) { toast.error("Ingresa el tipo de cambio"); return; }
    setGuardando(true);
    let qd = supabase.from("ventas").select("id").eq("numero_factura", numero).eq("cliente_id", f.cliente_id);
    if (editar) qd = qd.neq("id", editar.id);
    const { data: dup } = await qd.limit(1);
    if (dup?.length) { setGuardando(false); toast.error(`${numero} ya está registrada para este cliente`); return; }
    const dias = f.condicion === "Crédito" ? Math.max(0, Number(f.dias || 0)) : 0;
    const venc = new Date(`${f.fecha}T12:00:00`); venc.setDate(venc.getDate() + dias);
    const esDet = aplica && f.regimen === "detraccion"; const esRet = aplica && f.regimen === "retencion";
    const fila = {
      numero_factura: numero, fecha_emision: f.fecha, cliente_id: f.cliente_id, proyecto_id: f.proyecto_id || null,
      concepto: f.concepto.trim() || `${f.tipo} ${numero}`, moneda: f.moneda, tipo_cambio: tc, monto: valor, monto_soles: r2(valor * tc), igv, total,
      condicion_pago: f.condicion, dias_credito: dias, fecha_vencimiento: venc.toISOString().slice(0, 10), estado: "Pendiente de Pago", fecha_pago: null,
      tipo_tributario: aplica ? f.regimen : "ninguno", pct_detraccion: esDet ? pct : 0, monto_detraccion: esDet ? r2(retenidoPen / tc) : 0,
      detraccion_estado: esDet ? "Pendiente" : "No aplica", detraccion_constancia: "", monto_retencion: esRet ? retenidoPen : 0,
      rubro: f.proyecto_id ? "Proyectos / Obras" : "Servicios",
    };
    if (editar) {
      const { estado: _e, fecha_pago: _fp, detraccion_constancia: _dc, ...cambios } = fila;
      const datos = cobrada ? { fecha_emision: fila.fecha_emision, proyecto_id: fila.proyecto_id, concepto: fila.concepto, rubro: fila.rubro, numero_factura: fila.numero_factura } : cambios;
      const { error } = await supabase.from("ventas").update(datos as never).eq("id", editar.id);
      setGuardando(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Venta ${numero} actualizada`);
      qc.invalidateQueries({ queryKey: ["ventas"] }); onGuardado?.(); onCerrar(); return;
    }
    const { error } = await supabase.from("ventas").insert(fila as never);
    setGuardando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Venta ${numero} registrada`);
    qc.invalidateQueries({ queryKey: ["ventas"] });
    onGuardado?.();
    if (seguir && !inicial) { setF((p) => ({ ...vacio(p.tc), fecha: p.fecha, cliente_id: p.cliente_id, proyecto_id: p.proyecto_id, regimen: p.regimen, tipo: p.tipo })); setIgvManual(false); } else onCerrar();
  }

  const fmt = (n: number) => (f.moneda === "USD" ? `US$ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : soles(n));
  return (
    <VentanaFlotante titulo={editar ? "Editar venta" : "Registrar venta"} subtitulo="Comprobante ya emitido por tu facturador externo; queda en Ventas y en Cuentas por cobrar." abierta={abierta} onCerrar={onCerrar} ancho="max-w-3xl">
      <form className="grid gap-3 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void guardar(false); }}>
        {cobrada && <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs sm:col-span-3">Venta ya cobrada: solo puedes corregir número, fecha, obra y concepto. Para cambiar cliente o importes, primero anula el cobro en Tesorería.</p>}
        <Campo etiqueta="Tipo"><Select value={f.tipo} onChange={(e) => set("tipo", e.target.value as Form["tipo"])}><option>Factura</option><option>Boleta</option></Select></Campo>
        <Campo etiqueta="N° comprobante"><Input autoFocus placeholder="F001-123" value={f.numero} onChange={(e) => set("numero", e.target.value)} /></Campo>
        <Campo etiqueta="Fecha de emisión"><Input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></Campo>
        <div className="sm:col-span-2"><Campo etiqueta={rucFijo ? `Cliente (RUC de la factura ${rucFijo})` : "Cliente"}>{rucFijo ? (cliFijo ? <Input readOnly value={`${cliFijo.razon_social} · ${cliFijo.numero_documento}${cliFijo.es_agente_retencion ? " · Agente de retención" : ""}`} /> : <div className="flex items-center gap-2 rounded-md border border-bad/40 bg-bad/5 px-3 py-1.5 text-xs"><span className="flex-1 text-bad">Cliente no registrado · {inicial?.razon} · RUC {rucFijo}</span><Boton type="button" variante="linea" disabled={creandoCli} onClick={() => void registrarCliente()}>{creandoCli ? "Registrando…" : "Registrar cliente"}</Boton></div>) : <Select disabled={cobrada} value={f.cliente_id} onChange={(e) => elegirCliente(e.target.value)}><option value="">— Elegir —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social} · {c.numero_documento}{c.es_agente_retencion ? " · Agente de retención" : ""}</option>)}</Select>}</Campo></div>
        <Campo etiqueta="Obra (opcional)"><Select value={f.proyecto_id} onChange={(e) => set("proyecto_id", e.target.value)}><option value="">— Sin obra —</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</Select></Campo>
        <div className="sm:col-span-3"><Campo etiqueta="Concepto"><Input value={f.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Valorización N° 1, venta de materiales…" /></Campo></div>
        <fieldset disabled={cobrada} className="contents">
        <Campo etiqueta="Moneda"><Select value={f.moneda} onChange={(e) => set("moneda", e.target.value as Form["moneda"])}><option value="PEN">Soles</option><option value="USD">Dólares</option></Select></Campo>
        {f.moneda === "USD" ? <Campo etiqueta="Tipo de cambio"><Input type="number" step="0.001" value={f.tc} onChange={(e) => set("tc", e.target.value)} /></Campo> : <div className="hidden sm:block" />}
        <div className="hidden sm:block" />
        <Campo etiqueta="Valor de venta (sin IGV)"><Input type="number" step="0.01" value={f.valor} onChange={(e) => set("valor", e.target.value)} /></Campo>
        <Campo etiqueta="IGV"><Input type="number" step="0.01" value={igvManual ? f.igv : igv.toFixed(2)} onChange={(e) => { setIgvManual(true); set("igv", e.target.value); }} /></Campo>
        <Campo etiqueta="Total"><Input readOnly value={fmt(total)} /></Campo>
        <Campo etiqueta="Condición de pago"><Select value={f.condicion} onChange={(e) => set("condicion", e.target.value as Form["condicion"])}><option>Contado</option><option>Crédito</option></Select></Campo>
        {f.condicion === "Crédito" ? <Campo etiqueta="Días de crédito"><Input type="number" value={f.dias} onChange={(e) => set("dias", e.target.value)} /></Campo> : <div className="hidden sm:block" />}
        <div className="hidden sm:block" />
        <Campo etiqueta="Régimen"><Select value={f.regimen} onChange={(e) => set("regimen", e.target.value as Form["regimen"])}><option value="ninguno">No aplica</option><option value="detraccion">Detracción</option><option value="retencion">Retención IGV 3%</option></Select></Campo>
        {f.regimen === "detraccion" ? <Campo etiqueta="% detracción"><Input type="number" step="0.01" value={f.pct} onChange={(e) => set("pct", e.target.value)} /></Campo> : <div className="hidden sm:block" />}
        <div className="self-end rounded-md border border-line bg-muted/40 px-3 py-2 text-xs">
          {f.regimen !== "ninguno" && !aplica ? <span className="text-muted-foreground">No aplica: total ≤ S/ 700</span> : aplica ? <>
            <div>{f.regimen === "detraccion" ? "Detracción (BN)" : "Retención"}: <b>{soles(retenidoPen)}</b></div>
            <div>Neto a cobrar: <b>{fmt(neto)}</b></div></> : <div>A cobrar: <b>{fmt(total)}</b></div>}
        </div>
        </fieldset>
        <div className="flex justify-end gap-2 sm:col-span-3">
          {!editar && !inicial && <Boton type="button" variante="linea" disabled={guardando} onClick={() => void guardar(true)}>Guardar y registrar otra</Boton>}
          <Boton type="submit" disabled={guardando || (!!rucFijo && !cliFijo)}>{guardando ? "Guardando…" : editar ? "Guardar cambios" : "Registrar venta"}</Boton>
        </div>
      </form>
    </VentanaFlotante>
  );
}
