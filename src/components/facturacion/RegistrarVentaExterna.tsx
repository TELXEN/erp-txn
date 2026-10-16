import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { hoy, soles } from "@/lib/format";
import { useTipoCambioHoy } from "@/lib/tipo-cambio";

/** Registro de una venta ya facturada por un tercero (PSE / portal SUNAT): no emite, solo registra en Ventas. */
type Form = { tipo: "Factura" | "Boleta"; numero: string; fecha: string; cliente_id: string; proyecto_id: string; concepto: string; moneda: "PEN" | "USD"; tc: string; valor: string; igv: string; condicion: "Contado" | "Crédito"; dias: string; regimen: "ninguno" | "detraccion" | "retencion"; pct: string };
const vacio = (tc = "1"): Form => ({ tipo: "Factura", numero: "", fecha: hoy(), cliente_id: "", proyecto_id: "", concepto: "", moneda: "PEN", tc, valor: "", igv: "", condicion: "Contado", dias: "30", regimen: "ninguno", pct: "12" });
const r2 = (n: number) => Number(n.toFixed(2));

export function RegistrarVentaExterna({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: tcHoy } = useTipoCambioHoy();
  const [f, setF] = useState<Form>(vacio());
  const [igvManual, setIgvManual] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const { data: clientes = [] } = useQuery({ queryKey: ["terceros", "clientes-venta-ext"], queryFn: async () => { const { data, error } = await supabase.from("terceros").select("id,razon_social,numero_documento,es_agente_retencion").eq("es_cliente", true).eq("activo", true).order("razon_social"); if (error) throw error; return data ?? []; } });
  const { data: proyectos = [] } = useQuery({ queryKey: ["proyectos"], queryFn: async () => { const { data, error } = await supabase.from("proyectos").select("id,nombre,codigo").order("nombre"); if (error) throw error; return data ?? []; } });

  useEffect(() => { if (abierta) { setF(vacio(tcHoy?.venta ? String(tcHoy.venta) : "3.75")); setIgvManual(false); } }, [abierta]);

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
    if (!f.cliente_id) { toast.error("Elige el cliente"); return; }
    if (valor <= 0) { toast.error("Ingresa el valor de venta"); return; }
    if (f.moneda === "USD" && tc <= 0) { toast.error("Ingresa el tipo de cambio"); return; }
    setGuardando(true);
    const { data: dup } = await supabase.from("ventas").select("id").eq("numero_factura", numero).eq("cliente_id", f.cliente_id).limit(1);
    if (dup?.length) { setGuardando(false); toast.error(`${numero} ya está registrada para este cliente`); return; }
    const dias = f.condicion === "Crédito" ? Math.max(0, Number(f.dias || 0)) : 0;
    const venc = new Date(`${f.fecha}T12:00:00`); venc.setDate(venc.getDate() + dias);
    const esDet = aplica && f.regimen === "detraccion"; const esRet = aplica && f.regimen === "retencion";
    const { error } = await supabase.from("ventas").insert({
      numero_factura: numero, fecha_emision: f.fecha, cliente_id: f.cliente_id, proyecto_id: f.proyecto_id || null,
      concepto: f.concepto.trim() || `${f.tipo} ${numero}`, moneda: f.moneda, tipo_cambio: tc, monto: valor, monto_soles: r2(valor * tc), igv, total,
      condicion_pago: f.condicion, dias_credito: dias, fecha_vencimiento: venc.toISOString().slice(0, 10), estado: "Pendiente de Pago", fecha_pago: null,
      tipo_tributario: aplica ? f.regimen : "ninguno", pct_detraccion: esDet ? pct : 0, monto_detraccion: esDet ? r2(retenidoPen / tc) : 0,
      detraccion_estado: esDet ? "Pendiente" : "No aplica", detraccion_constancia: "", monto_retencion: esRet ? retenidoPen : 0,
      rubro: f.proyecto_id ? "Proyectos / Obras" : "Servicios",
    } as never);
    setGuardando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Venta ${numero} registrada`);
    qc.invalidateQueries({ queryKey: ["ventas"] });
    if (seguir) { setF((p) => ({ ...vacio(p.tc), fecha: p.fecha, cliente_id: p.cliente_id, proyecto_id: p.proyecto_id, regimen: p.regimen, tipo: p.tipo })); setIgvManual(false); } else onCerrar();
  }

  const fmt = (n: number) => (f.moneda === "USD" ? `US$ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : soles(n));
  return (
    <VentanaFlotante titulo="Registrar venta" subtitulo="Comprobante ya emitido por tu facturador externo; queda en Ventas y en Cuentas por cobrar." abierta={abierta} onCerrar={onCerrar} ancho="max-w-3xl">
      <form className="grid gap-3 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void guardar(false); }}>
        <Campo etiqueta="Tipo"><Select value={f.tipo} onChange={(e) => set("tipo", e.target.value as Form["tipo"])}><option>Factura</option><option>Boleta</option></Select></Campo>
        <Campo etiqueta="N° comprobante"><Input autoFocus placeholder="F001-123" value={f.numero} onChange={(e) => set("numero", e.target.value)} /></Campo>
        <Campo etiqueta="Fecha de emisión"><Input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></Campo>
        <div className="sm:col-span-2"><Campo etiqueta="Cliente"><Select value={f.cliente_id} onChange={(e) => elegirCliente(e.target.value)}><option value="">— Elegir —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social} · {c.numero_documento}{c.es_agente_retencion ? " · Agente de retención" : ""}</option>)}</Select></Campo></div>
        <Campo etiqueta="Obra (opcional)"><Select value={f.proyecto_id} onChange={(e) => set("proyecto_id", e.target.value)}><option value="">— Sin obra —</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}</Select></Campo>
        <div className="sm:col-span-3"><Campo etiqueta="Concepto"><Input value={f.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Valorización N° 1, venta de materiales…" /></Campo></div>
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
        <div className="flex justify-end gap-2 sm:col-span-3">
          <Boton type="button" variante="linea" disabled={guardando} onClick={() => void guardar(true)}>Guardar y registrar otra</Boton>
          <Boton type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Registrar venta"}</Boton>
        </div>
      </form>
    </VentanaFlotante>
  );
}
