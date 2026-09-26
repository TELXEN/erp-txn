import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ListPlus, Pencil, Plus, Printer, Receipt, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Etiqueta, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { CamposCondicion, datosCondicion } from "@/components/CondicionPago";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";
import { useEmpresa } from "@/lib/empresa";
import { useUnidadesMedida } from "@/lib/unidades";


export const IGV = 0.18;
export const UMBRAL_DETRACCION = 700;

export type TipoTributario = "detraccion" | "retencion" | "ninguno";

/** Regímenes SUNAT disponibles al emitir. El % es editable. */
export const REGIMENES: { valor: TipoTributario; pct: string; etiqueta: string }[] = [
  { valor: "detraccion", pct: "12", etiqueta: "Detracción 12% — Servicios (SPOT)" },
  { valor: "detraccion", pct: "4", etiqueta: "Detracción 4% — Contratos de construcción" },
  { valor: "retencion", pct: "3", etiqueta: "Retención 3% — Venta de bienes" },
  { valor: "ninguno", pct: "0", etiqueta: "Sin detracción ni retención" },
];

export type Preliquidacion = {
  id: string;
  codigo: string;
  proyecto_id: string;
  cliente_id: string | null;
  concepto: string;
  fecha: string;
  moneda: "PEN" | "USD";
  tipo_cambio: number;
  pct_detraccion: number;
  tipo_tributario: TipoTributario;
  condicion_pago: string;
  dias_credito: number;
  fecha_vencimiento: string | null;
  estado: string;
  observacion: string;
  amortizacion?: number;
};
export type ItemPL = { id?: string; descripcion: string; unidad: string; cantidad: string; precio_unitario: string };

/**
 * Neto, IGV, total y el descuento del régimen tributario.
 * La detracción se calcula SIEMPRE en soles y redondeada al entero más cercano (SPOT).
 * La retención de IGV (3%) se calcula en soles con dos decimales.
 */
export function calcularMontos(neto: number, pctDet: number, tc: number, tipo: TipoTributario = "detraccion") {
  const igv = Math.round(neto * IGV * 100) / 100;
  const total = neto + igv;
  const tipoCambio = tc > 0 ? tc : 1;
  const totalPen = total * tipoCambio;
  const aplica = tipo !== "ninguno" && pctDet > 0 && totalPen > UMBRAL_DETRACCION;
  const brutoPen = aplica ? (totalPen * pctDet) / 100 : 0;
  // SPOT: fracción < 0.5 se elimina; fracción >= 0.5 sube a la unidad entera superior.
  const detraccionPen = tipo === "detraccion" ? Math.floor(brutoPen + 0.5) : 0;
  // Retención IGV 3%: estrictamente dos decimales.
  const retencionPen = tipo === "retencion" ? Number(brutoPen.toFixed(2)) : 0;

  const descuentoPen = detraccionPen + retencionPen;
  const detraccion = descuentoPen / tipoCambio;
  return {
    neto,
    igv,
    total,
    tipo,
    aplica,
    detraccion,
    detraccionPen,
    retencionPen,
    descuentoPen,
    cobrar: total - detraccion,
  };
}


const ESTADO_TONO: Record<string, "good" | "bad" | "neutro"> = {
  Borrador: "neutro",
  Enviada: "neutro",
  Aprobada: "good",
  Observada: "bad",
  Facturada: "good",
};

const itemVacio = (): ItemPL => ({ descripcion: "", unidad: "glb", cantidad: "1", precio_unitario: "" });

export type ClientePL = { id: string; razon_social: string; numero_documento?: string | null; direccion?: string | null };

type Props = {
  proyectos: { id: string; nombre: string; codigo: string | null; cliente?: string; pct_gastos_generales?: number; pct_utilidad?: number }[];
  clientes: ClientePL[];
  ofertadoDe: (proyectoId: string) => number;
  facturadoDe: (proyectoId: string) => number;
  onFacturar: (pl: Preliquidacion, neto: number) => void;
};

type CuentaBanco = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };
type PartidaObra = { id: string; codigo: string; nombre: string; unidad: string; metrado: number; precio_unitario: number; padre_id: string | null };

export function Preliquidaciones({ proyectos, clientes, ofertadoDe, facturadoDe, onFacturar }: Props) {
  const qc = useQueryClient();
  const { data: empresa } = useEmpresa();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos", "cuentas-cobro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bancos")
        .select("nombre, numero_cuenta, cci, tipo_cuenta, monedas, activo")
        .eq("activo", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CuentaBanco[];
    },
  });
  const ctaDetraccion = cuentas.find((c) => c.tipo_cuenta === "Detracciones") ?? null;
  const ctaComercial = (moneda: string) =>
    cuentas.find((c) => c.tipo_cuenta !== "Detracciones" && c.monedas === moneda) ?? null;
  const { data: facturas = [] } = useQuery({
    queryKey: ["ventas", "por-preliquidacion"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ventas").select("numero_factura, preliquidacion_id, fecha_emision, total, monto_soles").not("preliquidacion_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { numero_factura: string; preliquidacion_id: string; fecha_emision: string; total: number; monto_soles: number }[];
    },
  });
  const facturaDe = (id: string) => facturas.find((f) => f.preliquidacion_id === id) ?? null;
  const { data: lista = [] } = useQuery({
    queryKey: ["preliquidaciones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("preliquidaciones").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Preliquidacion[];
    },
  });
  const { data: items = [] } = useQuery({
    queryKey: ["preliquidacion_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("preliquidacion_items").select("*").order("orden");
      if (error) throw error;
      return (data ?? []) as { id: string; preliquidacion_id: string; descripcion: string; unidad: string; cantidad: number; precio_unitario: number }[];
    },
  });

  const formVacio = () => ({
    proyecto_id: "",
    cliente_id: "",
    concepto: "",
    fecha: hoy(),
    moneda: "PEN",
    tipo_cambio: "3.75",
    pct_detraccion: "12",
    tipo_tributario: "detraccion" as TipoTributario,
    condicion_pago: "Crédito",
    dias_credito: "30",
    observacion: "",
    amortizacion: "0",
  });

  const [form, setForm] = useState(formVacio());
  const [lineas, setLineas] = useState<ItemPL[]>([itemVacio()]);
  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [selectorPartidas, setSelectorPartidas] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);

  const { data: partidasObra = [] } = useQuery({
    queryKey: ["partidas", "obra-pl", form.proyecto_id],
    enabled: !!form.proyecto_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidas")
        .select("id, codigo, nombre, unidad, metrado, precio_unitario, padre_id")
        .eq("proyecto_id", form.proyecto_id)
        .order("codigo");
      if (error) throw error;
      const todas = (data ?? []) as PartidaObra[];
      const padres = new Set(todas.map((p) => p.padre_id).filter(Boolean));
      return todas.filter((p) => !padres.has(p.id));
    },
  });

  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
  const datosCliente = (id: string | null) => clientes.find((c) => c.id === id) ?? null;
  const nombreCliente = (id: string | null) => datosCliente(id)?.razon_social ?? "—";
  const rucCliente = (id: string | null) => datosCliente(id)?.numero_documento ?? "";
  const dirCliente = (id: string | null) => datosCliente(id)?.direccion ?? "";
  const itemsDe = (id: string) => items.filter((i) => i.preliquidacion_id === id);
  const brutoDe = (id: string) => itemsDe(id).reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);
  const amortDe = (id: string) => Number(lista.find((p) => p.id === id)?.amortizacion ?? 0);
  const netoDe = (id: string) => brutoDe(id) - amortDe(id);

  const tc = form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1;
  const brutoForm = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);
  const amortForm = Number(form.amortizacion || 0);
  const netoForm = brutoForm - amortForm;
  const m = calcularMontos(netoForm, Number(form.pct_detraccion || 0), tc, form.tipo_tributario);
  const clienteSel = datosCliente(form.cliente_id || null);

  const venc = datosCondicion(form, form.fecha).fecha_vencimiento;

  function comprometidoDe(proyectoId: string, excluir?: string | null) {
    return lista
      .filter((p) => p.proyecto_id === proyectoId && p.estado === "Aprobada" && p.id !== excluir)
      .reduce((s, p) => s + netoDe(p.id) * Number(p.tipo_cambio || 1), 0);
  }
  const saldoSel = form.proyecto_id
    ? ofertadoDe(form.proyecto_id) - facturadoDe(form.proyecto_id) - comprometidoDe(form.proyecto_id, editando)
    : 0;

  const filtradas = lista.filter((p) =>
    coincide(busqueda, p.codigo, p.concepto, nombreProy(p.proyecto_id), nombreCliente(p.cliente_id), p.estado, facturaDe(p.id)?.numero_factura ?? ""),
  );

  // KPIs (en soles)
  const netoPen = (p: Preliquidacion) => netoDe(p.id) * Number(p.tipo_cambio || 1);
  const mesHoy = hoy().slice(0, 7);
  const kpis = [
    { t: "En elaboración / enviadas", v: lista.filter((p) => ["Borrador", "Enviada", "Observada"].includes(p.estado)).reduce((s, p) => s + netoPen(p), 0), n: lista.filter((p) => ["Borrador", "Enviada", "Observada"].includes(p.estado)).length },
    { t: "Aprobadas por facturar", v: lista.filter((p) => p.estado === "Aprobada").reduce((s, p) => s + netoPen(p), 0), n: lista.filter((p) => p.estado === "Aprobada").length },
    { t: "Facturadas del mes", v: lista.filter((p) => p.estado === "Facturada" && (facturaDe(p.id)?.fecha_emision ?? p.fecha).slice(0, 7) === mesHoy).reduce((s, p) => s + netoPen(p), 0), n: lista.filter((p) => p.estado === "Facturada" && (facturaDe(p.id)?.fecha_emision ?? p.fecha).slice(0, 7) === mesHoy).length },
  ];

  function elegirProyecto(id: string) {
    const proy = proyectos.find((p) => p.id === id);
    const nombre = (proy?.cliente ?? "").trim().toLowerCase();
    const cli = nombre ? clientes.find((c) => c.razon_social.trim().toLowerCase() === nombre) : undefined;
    setForm({ ...form, proyecto_id: id, cliente_id: cli?.id ?? form.cliente_id });
    setSelectorPartidas(false);
    setMarcadas([]);
  }

  function cargarPartidas() {
    const proy = proyectos.find((p) => p.id === form.proyecto_id);
    const factor = 1 + (Number(proy?.pct_gastos_generales ?? 0) + Number(proy?.pct_utilidad ?? 0)) / 100;
    const nuevas: ItemPL[] = partidasObra
      .filter((p) => marcadas.includes(p.id))
      .map((p) => ({
        descripcion: `${p.codigo ? p.codigo + " " : ""}${p.nombre}`,
        unidad: p.unidad || "glb",
        cantidad: String(Number(p.metrado) || 1),
        precio_unitario: String(Math.round(Number(p.precio_unitario) * factor * 100) / 100),
      }));
    const actuales = lineas.filter((l) => l.descripcion.trim() || Number(l.precio_unitario) > 0);
    setLineas([...actuales, ...nuevas].length ? [...actuales, ...nuevas] : [itemVacio()]);
    setSelectorPartidas(false);
    setMarcadas([]);
  }


  function nuevo() {
    setForm(formVacio());
    setLineas([itemVacio()]);
    setEditando(null);
    setError("");
    setAbierto(true);
  }

  function editar(p: Preliquidacion) {
    setForm({
      proyecto_id: p.proyecto_id,
      cliente_id: p.cliente_id ?? "",
      concepto: p.concepto,
      fecha: p.fecha,
      moneda: p.moneda,
      tipo_cambio: String(p.tipo_cambio),
      pct_detraccion: String(p.pct_detraccion),
      tipo_tributario: (p.tipo_tributario ?? "detraccion") as TipoTributario,

      condicion_pago: p.condicion_pago,
      dias_credito: String(p.dias_credito),
      observacion: p.observacion,
      amortizacion: String(p.amortizacion ?? 0),
    });
    const its = itemsDe(p.id);
    setLineas(
      its.length
        ? its.map((i) => ({ descripcion: i.descripcion, unidad: i.unidad, cantidad: String(i.cantidad), precio_unitario: String(i.precio_unitario) }))
        : [itemVacio()],
    );
    setEditando(p.id);
    setError("");
    setAbierto(true);
  }

  function duplicar(p: Preliquidacion) {
    editar(p);
    setEditando(null);
    setForm((f) => ({ ...f, fecha: hoy(), concepto: p.concepto, observacion: "" }));
  }

  function generarCodigo(proyectoId: string) {
    const proy = proyectos.find((p) => p.id === proyectoId);
    const base = `PL-${proy?.codigo || "OBRA"}-`;
    let n = lista.filter((p) => p.codigo.startsWith(base)).length + 1;
    while (lista.some((p) => p.codigo === base + String(n).padStart(3, "0"))) n++;
    return base + String(n).padStart(3, "0");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validas = lineas.filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0);
    if (!validas.length) return setError("Agrega al menos una línea con descripción y cantidad.");
    if (form.moneda === "USD" && tc <= 0) return setError("Ingresa un tipo de cambio válido.");
    if (amortForm < 0 || amortForm > brutoForm) return setError("La amortización no puede ser negativa ni mayor al valor ejecutado.");
    if (netoForm * tc > saldoSel + 0.01)
      setError(`Aviso: el neto (${soles(netoForm * tc)}) supera el saldo disponible de la obra (${soles(Math.max(saldoSel, 0))}). Se guardó igual como borrador.`);
    const cond = datosCondicion(form, form.fecha);
    const datos = {
      proyecto_id: form.proyecto_id,
      cliente_id: form.cliente_id || null,
      concepto: form.concepto.trim(),
      fecha: form.fecha,
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      pct_detraccion: Number(form.pct_detraccion || 0),
      tipo_tributario: form.tipo_tributario,
      amortizacion: amortForm,
      observacion: form.observacion.trim(),
      ...cond,
    };
    let id = editando;
    if (editando) {
      const { error: err } = await supabase.from("preliquidaciones").update(datos as never).eq("id", editando);
      if (err) return setError(err.message);
      await supabase.from("preliquidacion_items").delete().eq("preliquidacion_id", editando);
    } else {
      const { data, error: err } = await supabase
        .from("preliquidaciones")
        .insert({ ...datos, codigo: generarCodigo(form.proyecto_id) } as never)
        .select("id")
        .single();
      if (err) return setError(err.message);
      id = (data as { id: string }).id;
    }
    const { error: errI } = await supabase.from("preliquidacion_items").insert(
      validas.map((l, i) => ({
        preliquidacion_id: id!,
        descripcion: l.descripcion.trim(),
        unidad: l.unidad.trim() || "glb",
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario || 0),
        orden: i,
      })) as never,
    );
    if (errI) return setError(errI.message);
    qc.invalidateQueries({ queryKey: ["preliquidaciones"] });
    qc.invalidateQueries({ queryKey: ["preliquidacion_items"] });
    setAbierto(false);
    setEditando(null);
  }

  async function cambiarEstado(p: Preliquidacion, estado: string) {
    if (estado === "Aprobada") {
      const saldo = ofertadoDe(p.proyecto_id) - facturadoDe(p.proyecto_id) - comprometidoDe(p.proyecto_id, p.id);
      const neto = netoDe(p.id) * Number(p.tipo_cambio || 1);
      if (neto > saldo + 0.01)
        return alert(`No se puede aprobar: el neto ${soles(neto)} supera el saldo disponible de la obra (${soles(Math.max(saldo, 0))}).`);
    }
    const cambios: Record<string, unknown> = { estado };
    if (estado === "Observada") {
      const motivo = window.prompt("¿Qué observó el cliente?", "");
      if (motivo === null) return;
      if (motivo.trim()) {
        const linea = `[Observada ${fmtFecha(hoy())}] ${motivo.trim()}`;
        cambios.observacion = p.observacion ? `${p.observacion}\n${linea}` : linea;
      }
    }
    await supabase.from("preliquidaciones").update(cambios as never).eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["preliquidaciones"] });
  }

  async function eliminar(p: Preliquidacion) {
    if (!confirm(`¿Eliminar la preliquidación ${p.codigo}?`)) return;
    await supabase.from("preliquidaciones").delete().eq("id", p.id);
    qc.invalidateQueries({ queryKey: ["preliquidaciones"] });
  }

  function imprimir(p: Preliquidacion) {
    const its = itemsDe(p.id);
    const neto = netoDe(p.id);
    const mm = calcularMontos(neto, Number(p.pct_detraccion), Number(p.tipo_cambio), p.tipo_tributario ?? "detraccion");
    const soles2 = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const solesEnt = (n: number) => `S/ ${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`;

    const sim = p.moneda === "USD" ? "US$" : "S/";
    const f = (n: number) => `${sim} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const color = empresa?.color_marca || "#003352";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${esc(p.codigo)}</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#222;margin:32px}
      .cab{display:flex;justify-content:space-between;border-bottom:3px solid ${color};padding-bottom:10px;margin-bottom:16px}
      h1{font-size:18px;margin:0;color:${color}} table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:${color};color:#fff;text-align:left;padding:6px;font-size:11px} td{padding:6px;border-bottom:1px solid #ddd}
      .r{text-align:right} .tot td{border:0;padding:3px 6px} .b{font-weight:bold} .nota{margin-top:24px;font-size:10px;color:#666}
    </style></head><body>
    <div class="cab"><div>${empresa?.logo_url ? `<img src="${esc(empresa.logo_url)}" style="height:48px"/><br/>` : ""}
      <b>${esc(empresa?.razon_social || "TELXEN SAC")}</b><br/>RUC ${esc(empresa?.ruc || "")}<br/>${esc(empresa?.direccion || "")}</div>
      <div style="text-align:right"><h1>PRELIQUIDACIÓN</h1><b>${esc(p.codigo)}</b><br/>Fecha: ${fmtFecha(p.fecha)}<br/>Estado: ${esc(p.estado)}</div></div>
    <p><b>Cliente:</b> ${esc(nombreCliente(p.cliente_id))}<br/><b>RUC:</b> ${esc(rucCliente(p.cliente_id) || "—")}<br/><b>Dirección:</b> ${esc(dirCliente(p.cliente_id) || "—")}<br/><b>Obra:</b> ${esc(nombreProy(p.proyecto_id))}<br/><b>Orden de compra:</b> ${esc(p.concepto)}</p>
    <table><thead><tr><th>#</th><th>Descripción</th><th>Und</th><th class="r">Cant.</th><th class="r">P.U.</th><th class="r">Subtotal</th></tr></thead><tbody>
    ${its.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.descripcion)}</td><td>${esc(i.unidad)}</td><td class="r">${Number(i.cantidad)}</td><td class="r">${f(Number(i.precio_unitario))}</td><td class="r">${f(Number(i.cantidad) * Number(i.precio_unitario))}</td></tr>`).join("")}
    </tbody></table>
    <table class="tot" style="width:360px;margin-left:auto">
      <tr><td>Valor neto</td><td class="r">${f(mm.neto)}</td></tr>
      <tr><td>IGV 18%</td><td class="r">${f(mm.igv)}</td></tr>
      <tr class="b"><td>Total</td><td class="r">${f(mm.total)}</td></tr>
      ${mm.detraccionPen > 0 ? `<tr><td>Detracción ${p.pct_detraccion}% (SPOT, en soles)</td><td class="r">${solesEnt(mm.detraccionPen)}</td></tr>` : ""}
      ${mm.retencionPen > 0 ? `<tr><td>Retención IGV ${p.pct_detraccion}%</td><td class="r">${soles2(mm.retencionPen)}</td></tr>` : ""}
      ${!mm.aplica ? `<tr><td>Detracción / retención</td><td class="r">No aplica</td></tr>` : ""}
      <tr class="b"><td>Neto a depositar en cuenta</td><td class="r">${f(mm.cobrar)}</td></tr>
    </table>
    <p><b>Condición de pago:</b> ${esc(p.condicion_pago)}${p.condicion_pago === "Crédito" ? ` a ${p.dias_credito} días · vence ${fmtFecha(p.fecha_vencimiento)}` : ""}</p>
    ${mm.detraccionPen > 0 ? `<p><b>Cuenta de detracciones (Banco de la Nación):</b> ${ctaDetraccion ? `${esc(ctaDetraccion.nombre)} · Cta. N° ${esc(ctaDetraccion.numero_cuenta || "—")}${ctaDetraccion.cci ? ` · CCI ${esc(ctaDetraccion.cci)}` : ""}` : "Registrar una cuenta de tipo Detracciones en Catálogos Maestros"}</p>` : ""}
    ${p.observacion ? `<p><b>Observaciones:</b> ${esc(p.observacion)}</p>` : ""}
    <p class="nota">Documento referencial previo a la emisión del comprobante electrónico. No tiene valor tributario.</p>
    <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();

  }

  const editable = (p: Preliquidacion) => p.estado === "Borrador" || p.estado === "Observada";

  return (
    <>
      {abierto && (
        <Panel titulo={editando ? "Editar preliquidación" : "Nueva preliquidación"} className="mb-4">
          <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
            <Campo etiqueta="Proyecto">
              <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Cliente">
              <Select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.numero_documento ? `${c.numero_documento} · ` : ""}{c.razon_social}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Orden de compra">
              <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required maxLength={160} placeholder="Ej. OC-2026-0154" />
            </Campo>

            <Campo etiqueta="Fecha">
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </Campo>
            {clienteSel && (
              <div className="sm:col-span-4 rounded-lg border border-line bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
                <span className="font-semibold text-ink">{clienteSel.razon_social}</span>
                {" · RUC "}{clienteSel.numero_documento || "—"}
                {" · "}{clienteSel.direccion || "Sin dirección registrada"}
              </div>
            )}
            <Campo etiqueta="Moneda">
              <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </Select>
            </Campo>
            <Campo etiqueta="Tipo de cambio">
              <Input type="number" step="0.001" min="0" value={form.tipo_cambio} disabled={form.moneda === "PEN"} onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })} />
            </Campo>
            <Campo etiqueta="Régimen tributario">
              <Select
                value={`${form.tipo_tributario}|${form.pct_detraccion}`}
                onChange={(e) => {
                  const [t, p] = e.target.value.split("|");
                  setForm({ ...form, tipo_tributario: t as TipoTributario, pct_detraccion: p ?? "0" });
                }}
              >
                {REGIMENES.map((r) => <option key={r.etiqueta} value={`${r.valor}|${r.pct}`}>{r.etiqueta}</option>)}
                <option value={`${form.tipo_tributario}|${form.pct_detraccion}`} hidden>
                  {form.tipo_tributario} {form.pct_detraccion}%
                </option>
              </Select>
            </Campo>
            <Campo etiqueta="% aplicado">
              <Input type="number" step="0.01" min="0" max="100" value={form.pct_detraccion} disabled={form.tipo_tributario === "ninguno"} onChange={(e) => setForm({ ...form, pct_detraccion: e.target.value })} />
            </Campo>

            <CamposCondicion valor={form} fechaBase={form.fecha} onChange={(c) => setForm({ ...form, ...c })} />

            <div className="sm:col-span-4 rounded-lg border border-line">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Descripción</th>
                    <th className="w-20 px-2 py-2 font-medium">Und</th>
                    <th className="w-24 px-2 py-2 font-medium">Cantidad</th>
                    <th className="w-32 px-2 py-2 font-medium">P.U. (neto)</th>
                    <th className="w-32 px-2 py-2 text-right font-medium">Subtotal</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => {
                    const upd = (c: Partial<ItemPL>) => setLineas(lineas.map((x, k) => (k === i ? { ...x, ...c } : x)));
                    return (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-1.5"><Input value={l.descripcion} onChange={(e) => upd({ descripcion: e.target.value })} maxLength={200} /></td>
                        <td className="px-2 py-1.5">
                          <Select value={l.unidad} onChange={(e) => upd({ unidad: e.target.value })}>
                            {!unidades.some((u) => u.simbolo === l.unidad) && <option value={l.unidad}>{l.unidad}</option>}
                            {unidades.filter((u) => u.activo).map((u) => (
                              <option key={u.id} value={u.simbolo}>{u.simbolo}</option>
                            ))}
                          </Select>
                        </td>

                        <td className="px-2 py-1.5"><Input type="number" step="0.01" min="0" value={l.cantidad} onChange={(e) => upd({ cantidad: e.target.value })} /></td>
                        <td className="px-2 py-1.5"><Input type="number" step="0.01" min="0" value={l.precio_unitario} onChange={(e) => upd({ precio_unitario: e.target.value })} /></td>
                        <td className="px-2 py-1.5 text-right">{(Number(l.cantidad || 0) * Number(l.precio_unitario || 0)).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2">
                          {lineas.length > 1 && (
                            <button type="button" onClick={() => setLineas(lineas.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-bad" aria-label="Quitar línea">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-line p-2">
                <Boton type="button" variante="linea" onClick={() => setLineas([...lineas, itemVacio()])}><Plus size={13} /> Agregar línea</Boton>
              </div>
            </div>

            <div className="sm:col-span-4 grid gap-3 rounded-lg border border-line bg-muted/30 p-3 sm:grid-cols-4">
              {[
                ["Valor neto", m.neto],
                ["IGV 18%", m.igv],
                ["Total", m.total],
              ].map(([t, v]) => (
                <div key={t as string}>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{t}</p>
                  <p className="font-mono text-sm font-semibold text-ink">{form.moneda === "USD" ? `US$ ${(v as number).toFixed(2)}` : soles(v as number)}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Saldo obra / vence</p>
                <p className={`font-mono text-sm font-semibold ${saldoSel - netoForm * tc >= 0 ? "text-good" : "text-bad"}`}>{soles(saldoSel)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{form.condicion_pago === "Crédito" ? fmtFecha(venc) : "Contado"}</p>
              </div>
            </div>

            <div className="sm:col-span-4">
              <Campo etiqueta="Observaciones">
                <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} maxLength={300} />
              </Campo>
            </div>

            <div className="sm:col-span-4 rounded-lg border-2 border-line bg-card p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Liquidación y cobro</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Detracción {m.tipo === "detraccion" && m.aplica ? `${form.pct_detraccion}% (S/ entero)` : ""}
                  </p>
                  <p className="font-mono text-base font-semibold text-ink">
                    {m.tipo === "detraccion" && m.aplica ? `S/ ${m.detraccionPen.toLocaleString("es-PE")}` : "No aplica"}
                  </p>
                  {m.tipo === "detraccion" && m.aplica && (
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {ctaDetraccion
                        ? `Cta. detracciones BN ${ctaDetraccion.numero_cuenta || "—"}`
                        : "Sin cuenta de detracciones registrada"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Retención IGV {m.tipo === "retencion" && m.aplica ? `${form.pct_detraccion}%` : ""}
                  </p>
                  <p className="font-mono text-base font-semibold text-ink">
                    {m.tipo === "retencion" && m.aplica ? soles(m.retencionPen) : "No aplica"}
                  </p>
                  {m.tipo === "retencion" && m.aplica && (
                    <p className="font-mono text-[10px] text-muted-foreground">Importe con dos decimales</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Neto a pagar</p>
                  <p className="font-mono text-base font-semibold text-good">
                    {form.moneda === "USD" ? `US$ ${m.cobrar.toFixed(2)}` : soles(m.cobrar)}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-4 flex gap-2">
              <Boton type="submit">{editando ? "Guardar cambios" : "Guardar borrador"}</Boton>
              <Boton type="button" variante="linea" onClick={() => setAbierto(false)}>Cancelar</Boton>
            </div>
            {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
          </form>
        </Panel>
      )}

      <Panel
        titulo="Preliquidaciones"
        extra={
          <div className="flex items-center gap-2">
            <Buscador valor={busqueda} onChange={setBusqueda} total={filtradas.length} placeholder="Buscar por código, concepto, cliente u obra..." />
            <Boton
              variante="linea"
              onClick={() =>
                exportarExcel("preliquidaciones", [
                  {
                    nombre: "Preliquidaciones",
                    filas: lista.map((p) => {
                      const mm = calcularMontos(netoDe(p.id), Number(p.pct_detraccion), Number(p.tipo_cambio), p.tipo_tributario ?? "detraccion");
                      return {
                        Código: p.codigo, Fecha: p.fecha, Obra: nombreProy(p.proyecto_id), Cliente: nombreCliente(p.cliente_id),
                        RUC: rucCliente(p.cliente_id), Dirección: dirCliente(p.cliente_id),
                        "Orden de compra": p.concepto, Moneda: p.moneda, Neto: mm.neto, IGV: mm.igv, Total: mm.total,
                        Régimen: mm.tipo === "detraccion" ? `Detracción ${p.pct_detraccion}%` : mm.tipo === "retencion" ? `Retención ${p.pct_detraccion}%` : "Ninguno",
                        "Detracción (S/)": mm.detraccionPen, "Retención (S/)": mm.retencionPen,
                        "Neto a cobrar": mm.cobrar, Condición: p.condicion_pago,

                        Vencimiento: p.fecha_vencimiento ?? "", Estado: p.estado,
                      };
                    }),
                  },
                ])
              }
            >
              <Upload size={13} /> Excel
            </Boton>
            {!abierto && <Boton onClick={nuevo}><Plus size={13} /> Nueva</Boton>}
          </div>
        }
      >
        {filtradas.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay preliquidaciones."} />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Orden de compra</th>
                <th className="px-3 py-2 font-medium">Cliente / Obra</th>
                <th className="px-3 py-2 font-medium">Condición</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Detracción / Retención</th>
                <th className="px-3 py-2 text-right font-medium">Neto a cobrar</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const mm = calcularMontos(netoDe(p.id), Number(p.pct_detraccion), Number(p.tipo_cambio), p.tipo_tributario ?? "detraccion");
                const fm = (n: number) => (p.moneda === "USD" ? `US$ ${n.toFixed(2)}` : soles(n));
                return (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-ink"><Resaltar texto={p.codigo} termino={busqueda} /><div className="text-[10px] font-normal text-muted-foreground">{fmtFecha(p.fecha)}</div></td>
                    <td className="px-3 py-2.5"><Resaltar texto={p.concepto} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      <Resaltar texto={nombreCliente(p.cliente_id)} termino={busqueda} />
                      {rucCliente(p.cliente_id) && <div className="text-[10px]">RUC <Resaltar texto={rucCliente(p.cliente_id)} termino={busqueda} /></div>}
                      <div className="text-[10px]"><Resaltar texto={nombreProy(p.proyecto_id)} termino={busqueda} /></div>

                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.condicion_pago}{p.condicion_pago === "Crédito" && <div className="text-[10px]">{p.dias_credito} d · {fmtFecha(p.fecha_vencimiento)}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fm(mm.total)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {!mm.aplica ? "—" : mm.tipo === "detraccion" ? `S/ ${mm.detraccionPen.toLocaleString("es-PE")}` : soles(mm.retencionPen)}
                      <div className="text-[10px]">{mm.aplica ? `${mm.tipo === "detraccion" ? "Detracción" : "Retención"} ${p.pct_detraccion}%` : ""}</div>
                    </td>

                    <td className="px-3 py-2.5 text-right font-semibold">{fm(mm.cobrar)}</td>
                    <td className="px-3 py-2.5">
                      {p.estado === "Facturada" ? (
                        <Etiqueta tono="good">Facturada</Etiqueta>
                      ) : (
                        <Select className="w-32" value={p.estado} onChange={(e) => cambiarEstado(p, e.target.value)}>
                          {["Borrador", "Enviada", "Aprobada", "Observada"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      )}
                      <span className="sr-only"><Etiqueta tono={ESTADO_TONO[p.estado] ?? "neutro"}>{p.estado}</Etiqueta></span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {p.estado === "Aprobada" && (
                          <Boton onClick={() => onFacturar(p, netoDe(p.id))}><Receipt size={13} /> Facturar</Boton>
                        )}
                        <button onClick={() => imprimir(p)} className="text-muted-foreground hover:text-ink" aria-label="Imprimir / PDF"><Printer size={14} /></button>
                        {editable(p) && (
                          <>
                            <button onClick={() => editar(p)} className="text-muted-foreground hover:text-ink" aria-label="Editar"><Pencil size={14} /></button>
                            <button onClick={() => eliminar(p)} className="text-muted-foreground hover:text-bad" aria-label="Eliminar"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
