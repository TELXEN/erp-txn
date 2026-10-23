import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { useEffect, useState } from "react";
import { useTipoCambioHoy } from "@/lib/tipo-cambio";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Receipt, Upload } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Boton, BotonIcono, Campo, Etiqueta, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { condicionVacia, datosCondicion, PLAZOS } from "@/components/CondicionPago";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { exportarExcel } from "@/lib/exportar";
import { useEmpresa } from "@/lib/empresa";
import { useUnidadesMedida } from "@/lib/unidades";
import { HojaPreliquidacion } from "@/components/HojaPreliquidacion";
import { numeroDocumentoProyecto, type DocumentoProyecto } from "@/lib/documento-proyecto";
import { calcularMontos, IGV, UMBRAL_DETRACCION, REGIMENES, type TipoTributario } from "@/lib/preliquidacion-montos";


// Los cálculos viven en @/lib/preliquidacion-montos (compartidos con la hoja y el PDF).
export { calcularMontos, IGV, UMBRAL_DETRACCION, REGIMENES };
export type { TipoTributario };

export type Preliquidacion = {
  id: string;
  codigo: string;
  proyecto_id: string | null;
  cliente_id: string | null;
  concepto: string;
  orden_compra?: string;
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


const ESTADO_TONO: Record<string, "good" | "bad" | "neutro"> = {
  Borrador: "neutro",
  Enviada: "neutro",
  Aprobada: "good",
  Observada: "bad",
  Facturada: "good",
};

const itemVacio = (): ItemPL => ({ descripcion: "", unidad: "GLB", cantidad: "1", precio_unitario: "" });

export type ClientePL = { id: string; razon_social: string; numero_documento?: string | null; direccion?: string | null };

type Props = {
  proyectos: ({ id: string; nombre: string; codigo: string | null; cliente?: string; pct_gastos_generales?: number; pct_utilidad?: number } & DocumentoProyecto)[];
  clientes: ClientePL[];
  ofertadoDe: (proyectoId: string) => number;
  facturadoDe: (proyectoId: string) => number;
  onFacturar: (pl: Preliquidacion, neto: number) => void;
};

type CuentaBanco = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

export function Preliquidaciones({ proyectos, clientes, ofertadoDe, facturadoDe, onFacturar }: Props) {
  const navigate = useNavigate();
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

  const { data: tcHoyInfo } = useTipoCambioHoy();
  const tcHoy = tcHoyInfo?.venta ?? 0;
  const formVacio = () => ({
    proyecto_id: "",
    cliente_id: "",
    concepto: "",
    orden_compra: "",
    fecha: hoy(),
    moneda: "PEN",
    tipo_cambio: tcHoy > 0 ? String(tcHoy) : "",
    pct_detraccion: "12",
    tipo_tributario: "detraccion" as TipoTributario,
    condicion_pago: "Crédito",
    dias_credito: "30",
    observacion: "",
    amortizacion: "0",
  });

  const [form, setForm] = useState(formVacio());
  useEffect(() => {
    // El T.C. solo sirve para la detracción/retención: se toma siempre de Decolecta (SUNAT del día).
    if (tcHoy > 0 && Number(form.tipo_cambio) !== tcHoy) setForm((f) => ({ ...f, tipo_cambio: String(tcHoy) }));
  }, [tcHoy, form.tipo_cambio]);
  const [lineas, setLineas] = useState<ItemPL[]>([itemVacio()]);
  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState("");
  const actual = lista.find((x) => x.id === sel);
  const [cintaColapsada, setCintaColapsada] = useState(false);
  // Origen de la preliquidación nueva: libre o desde un cliente (estado del editor, no URL).
  const [origen, setOrigen] = useState<"libre" | "cliente">("libre");
  const [dlgOrigen, setDlgOrigen] = useState<null | "elegir" | "cliente">(null);
  const [cliDlg, setCliDlg] = useState("");

  const nombreProy = (id: string | null) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
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

  // KPIs separados por moneda (el cobro en dólares es fijo, sin conversión)
  const grupo = (f: (p: Preliquidacion) => boolean) => {
    const ps = lista.filter(f);
    const suma = (mon: string) => ps.filter((p) => (p.moneda ?? "PEN") === mon).reduce((s, p) => s + netoDe(p.id), 0);
    return { pen: suma("PEN"), usd: suma("USD"), n: ps.length };
  };
  const mesHoy = hoy().slice(0, 7);
  const kpis = [
    { t: "En elaboración / enviadas", ...grupo((p) => ["Borrador", "Enviada", "Observada"].includes(p.estado)) },
    { t: "Aprobadas por facturar", ...grupo((p) => p.estado === "Aprobada") },
    { t: "Facturadas del mes", ...grupo((p) => p.estado === "Facturada" && (facturaDe(p.id)?.fecha_emision ?? p.fecha).slice(0, 7) === mesHoy) },
  ];

  const clave = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const proyectosDe = (clienteId: string) => {
    const c = clientes.find((x) => x.id === clienteId);
    if (!c) return [];
    return proyectos.filter((p) => clave(p.cliente) === clave(c.razon_social));
  };
  const conceptoDe = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? `${p.codigo ? p.codigo + " " : ""}${p.nombre}` : "";
  };

  function elegirProyecto(id: string) {
    const proy = proyectos.find((p) => p.id === id);
    const nombre = clave(proy?.cliente);
    const cli = nombre ? clientes.find((c) => clave(c.razon_social) === nombre) : undefined;
    // El concepto toma el nombre del proyecto solo si el usuario no lo ha personalizado.
    const previo = form.proyecto_id ? conceptoDe(form.proyecto_id) : "";
    const concepto = !form.concepto.trim() || form.concepto === previo ? conceptoDe(id) : form.concepto;
    setForm({ ...form, proyecto_id: id, cliente_id: origen === "cliente" ? form.cliente_id : cli?.id ?? form.cliente_id, concepto, orden_compra: numeroDocumentoProyecto(proy) });
  }

  function nuevo() {
    setCliDlg("");
    setDlgOrigen("elegir");
  }

  function abrirNuevo(o: "libre" | "cliente", clienteId = "", proyectoId = "") {
    setOrigen(o);
    setForm({ ...formVacio(), cliente_id: clienteId, proyecto_id: proyectoId, concepto: proyectoId ? conceptoDe(proyectoId) : "", orden_compra: numeroDocumentoProyecto(proyectos.find((p) => p.id === proyectoId)) });
    setLineas([itemVacio()]);
    setEditando(null);
    setError("");
    setDlgOrigen(null);
    setAbierto(true);
  }

  function editar(p: Preliquidacion) {
    setOrigen("libre");
    setForm({
      proyecto_id: p.proyecto_id ?? "",
      cliente_id: p.cliente_id ?? "",
      concepto: p.concepto,
      orden_compra: p.orden_compra ?? "",
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

  async function generarCodigo() {
    const { reservarCodigo } = await import("@/lib/codigos.functions");
    return reservarCodigo({ data: { tipo: "preliquidacion" } });
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
      proyecto_id: form.proyecto_id || null,
      cliente_id: form.cliente_id || null,
      concepto: form.concepto.trim(),
      orden_compra: form.orden_compra.trim(),
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
      let codigo: string;
      try {
        codigo = await generarCodigo();
      } catch (ex) {
        return setError(ex instanceof Error ? ex.message : "No se pudo generar el código.");
      }
      const { data, error: err } = await supabase
        .from("preliquidaciones")
        .insert({ ...datos, codigo } as never)
        .select("id")
        .single();
      if (err) return setError(err.message);
      id = (data as { id: string }).id;
    }
    const { error: errI } = await supabase.from("preliquidacion_items").insert(
      validas.map((l, i) => ({
        preliquidacion_id: id!,
        descripcion: l.descripcion.trim(),
        unidad: l.unidad.trim() || "GLB",
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
      const saldo = p.proyecto_id ? ofertadoDe(p.proyecto_id) - facturadoDe(p.proyecto_id) - comprometidoDe(p.proyecto_id, p.id) : Infinity;
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
        cambios["observacion"] = p.observacion ? `${p.observacion}\n${linea}` : linea;
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


  const editable = (p: Preliquidacion) => p.estado === "Borrador" || p.estado === "Observada";

  const proyDlg = cliDlg ? proyectosDe(cliDlg) : [];
  return (
    <>
      {dlgOrigen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setDlgOrigen(null)}>
          <div className="w-full max-w-md rounded-lg border border-line bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Nueva preliquidación</h3>
            {dlgOrigen === "elegir" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="rounded-md border border-line p-3 text-left hover:border-primary hover:bg-primary/5" onClick={() => abrirNuevo("libre")}>
                  <div className="text-sm font-medium">Libre</div>
                  <div className="text-xs text-muted-foreground">Editor vacío, cliente y proyecto opcionales.</div>
                </button>
                <button type="button" className="rounded-md border border-line p-3 text-left hover:border-primary hover:bg-primary/5" onClick={() => setDlgOrigen("cliente")}>
                  <div className="text-sm font-medium">Desde cliente</div>
                  <div className="text-xs text-muted-foreground">Elige cliente y uno de sus proyectos.</div>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Cliente</label>
                  <Select value={cliDlg} onChange={(e) => setCliDlg(e.target.value)}>
                    <option value="">Selecciona...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </Select>
                </div>
                {cliDlg && (proyDlg.length ? (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Proyectos del cliente</label>
                    {proyDlg.map((p) => (
                      <button key={p.id} type="button" className="block w-full rounded border border-line px-2 py-1.5 text-left text-xs hover:border-primary hover:bg-primary/5" onClick={() => abrirNuevo("cliente", cliDlg, p.id)}>
                        <span className="text-muted-foreground">{p.codigo}</span> {p.nombre}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Este cliente no tiene proyectos registrados.</p>
                    <Boton type="button" variante="linea" onClick={() => abrirNuevo("libre", cliDlg)}>Continuar como libre</Boton>
                  </div>
                ))}
                <Boton type="button" variante="linea" onClick={() => setDlgOrigen("elegir")}>Volver</Boton>
              </div>
            )}
          </div>
        </div>
      )}

      {abierto && (
        <div className="-mx-4 -my-6 min-h-full bg-background sm:-mx-6">
        <Panel
          titulo={editando ? `Editar preliquidación ${lista.find((p) => p.id === editando)?.codigo ?? ""}` : "Nueva preliquidación"}
          className="min-h-full"
          extra={<Boton type="button" variante="linea" onClick={() => setAbierto(false)}>Cerrar editor</Boton>}
        >
          <form onSubmit={guardar} className="p-5">
            <div className="mb-3 overflow-hidden rounded-lg bg-sidebar text-sidebar-foreground shadow-sm">
              <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground">
                  Configuración de preliquidación
                  {cintaColapsada && form.proyecto_id && (
                    <span className="ml-2 font-medium normal-case tracking-normal text-sidebar-muted">
                      {nombreProy(form.proyecto_id)} · {nombreCliente(form.cliente_id || null)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setCintaColapsada((v) => !v)}
                  className="rounded bg-sidebar-hover px-2 py-0.5 text-[10px] text-sidebar-muted transition-colors hover:bg-sidebar-border"
                >
                  {cintaColapsada ? "Expandir panel" : "Contraer panel"}
                </button>
              </div>
              {!cintaColapsada && (
                <div className="grid grid-cols-2 gap-px bg-sidebar-border p-px sm:grid-cols-4 lg:grid-cols-7">
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-muted">Proyecto</label>
                    <select
                      className="-ml-1 w-full rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 [&>option]:text-black"
                      value={form.proyecto_id}
                      onChange={(e) => elegirProyecto(e.target.value)}
                      required={origen === "cliente"}
                    >
                      <option value="">{origen === "cliente" ? "Selecciona..." : "Sin proyecto"}</option>
                      {(origen === "cliente" && form.cliente_id ? proyectosDe(form.cliente_id) : proyectos).map((p) => (
                        <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-muted">Cliente</label>
                    <select
                      className="-ml-1 w-full rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 [&>option]:text-black"
                      value={form.cliente_id}
                      onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                      disabled={origen === "cliente"}
                    >
                      <option value="">Selecciona...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.razon_social}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-muted">Régimen</label>
                    <select
                      className="-ml-1 w-full rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 [&>option]:text-black"
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
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-muted">% aplicado</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="-ml-1 w-full rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 disabled:text-sidebar-muted/60"
                      value={form.pct_detraccion}
                      disabled={form.tipo_tributario === "ninguno"}
                      onChange={(e) => setForm({ ...form, pct_detraccion: e.target.value })}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-muted">Condición</label>
                    <select
                      className="-ml-1 w-full rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 [&>option]:text-black"
                      value={form.condicion_pago}
                      onChange={(e) => setForm({ ...form, ...condicionVacia(e.target.value) })}
                    >
                      <option value="Contado">Contado</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2">
                    <label className="mb-0.5 truncate text-[9px] font-bold uppercase text-sidebar-muted" title={form.condicion_pago === "Crédito" ? `Vence ${fmtFecha(venc)}` : "Días de crédito"}>
                      {form.condicion_pago === "Crédito" ? `Días · vence ${fmtFecha(venc)}` : "Días crédito"}
                    </label>
                    {form.condicion_pago === "Crédito" ? (
                      <div className="flex gap-1">
                        <select
                          className="-ml-1 w-full min-w-0 rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60 [&>option]:text-black"
                          value={PLAZOS.includes(Number(form.dias_credito)) ? form.dias_credito : "otro"}
                          onChange={(e) => e.target.value !== "otro" && setForm({ ...form, dias_credito: e.target.value })}
                        >
                          {PLAZOS.map((p) => (
                            <option key={p} value={String(p)}>{p} días</option>
                          ))}
                          <option value="otro">Otro</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-14 rounded bg-transparent px-1 text-xs font-medium text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-foreground/60"
                          value={form.dias_credito}
                          onChange={(e) => setForm({ ...form, dias_credito: e.target.value })}
                        />
                      </div>
                    ) : (
                      <span className="px-1 text-xs text-sidebar-muted">—</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col bg-sidebar p-2 ring-1 ring-inset ring-sidebar-foreground/25">
                    <label className="mb-0.5 text-[9px] font-bold uppercase text-sidebar-foreground">Saldo obra</label>
                    {form.proyecto_id ? (
                      <span className={`px-1 text-xs font-bold ${saldoSel - netoForm * tc >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {soles(saldoSel)}
                      </span>
                    ) : (
                      <span className="px-1 text-xs text-sidebar-muted">—</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <HojaPreliquidacion
              editable
              anchoCompleto
              empresa={empresa}
              codigo={editando ? lista.find((p) => p.id === editando)?.codigo ?? "" : ""}
              estado={editando ? lista.find((p) => p.id === editando)?.estado ?? "Borrador" : "Borrador"}
              fecha={form.fecha}
              moneda={form.moneda}
              tipoCambio={Number(form.tipo_cambio || 0)}
              cliente={clienteSel ? { razon_social: clienteSel.razon_social, numero_documento: clienteSel.numero_documento, direccion: clienteSel.direccion } : null}
              proyectoNombre={form.proyecto_id ? nombreProy(form.proyecto_id) : ""}
              concepto={form.concepto}
              ordenCompra={form.orden_compra}
              lineas={lineas}
              amortizacion={amortForm}
              tipoTributario={form.tipo_tributario}
              pctDetraccion={Number(form.pct_detraccion || 0)}
              condicionPago={form.condicion_pago}
              diasCredito={Number(form.dias_credito || 0)}
              fechaVencimiento={venc ?? ""}
              observacion={form.observacion}
              cuentas={cuentas}
              unidades={unidades}
              onCampo={(campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))}
              onLinea={(i, cambios) => setLineas(lineas.map((x, k) => (k === i ? { ...x, ...cambios } : x)))}
              onQuitarLinea={(i) => setLineas(lineas.filter((_, k) => k !== i))}
              onAgregarLinea={() => setLineas([...lineas, itemVacio()])}
            />

            <div className="mt-4 flex gap-2">
              <Boton type="submit">{editando ? "Guardar cambios" : "Guardar borrador"}</Boton>
              <Boton type="button" variante="linea" onClick={() => setAbierto(false)}>Cancelar</Boton>
            </div>
            {error && <p className="mt-2 font-mono text-xs text-bad">{error}</p>}
          </form>
        </Panel>
        </div>
      )}

      {!abierto && <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.t} data-distintivo="monto" className="rounded-lg border border-line bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{k.t}</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div><p className="text-[10px] text-muted-foreground">Total en Soles</p><p className="font-mono text-lg font-semibold text-moneda-pen">S/ {k.pen.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Total en Dólares</p><p className="font-mono text-lg font-semibold text-moneda-usd">$ {k.usd.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">{k.n} preliquidación(es)</p>
          </div>
        ))}
      </div>}

      {!abierto && <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1"
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
                        "Amortización adelanto": amortDe(p.id), Factura: facturaDe(p.id)?.numero_factura ?? "",
                        "Orden de compra": p.orden_compra ?? "", Descripción: p.concepto, Moneda: p.moneda, Neto: mm.neto, IGV: mm.igv, Total: mm.total,
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
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const mm = calcularMontos(netoDe(p.id), Number(p.pct_detraccion), Number(p.tipo_cambio), p.tipo_tributario ?? "detraccion");
                const fm = (n: number) => (p.moneda === "USD" ? `US$ ${n.toFixed(2)}` : soles(n));
                return (
                  <tr key={p.id} onClick={() => setSel(p.id)} onDoubleClick={() => { setSel(p.id); if (editable(p)) void editar(p); }} className={`cursor-pointer border-b border-line/40 hover:bg-muted/40 ${sel === p.id ? "bg-primary/10" : ""}`}>
                    <td className="px-5 py-2.5 font-semibold text-ink"><Resaltar texto={p.codigo} termino={busqueda} /><div className="text-[10px] font-normal text-muted-foreground">{fmtFecha(p.fecha)}</div></td>
                    <td className="px-3 py-2.5"><Resaltar texto={p.orden_compra || "—"} termino={busqueda} /><div className="text-[10px] text-muted-foreground"><Resaltar texto={p.concepto} termino={busqueda} /></div></td>
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
                        <>
                          <Etiqueta tono="good">Facturada</Etiqueta>
                          {facturaDe(p.id) && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              <Resaltar texto={facturaDe(p.id)!.numero_factura} termino={busqueda} /> · {fmtFecha(facturaDe(p.id)!.fecha_emision)}
                            </div>
                          )}
                        </>
                      ) : (
                        <Select className="w-32" value={p.estado} onChange={(e) => cambiarEstado(p, e.target.value)}>
                          {["Borrador", "Enviada", "Aprobada", "Observada"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                      )}
                      {p.estado === "Observada" && p.observacion && (
                        <div className="mt-1 max-w-[180px] truncate text-[10px] text-bad" title={p.observacion}>{p.observacion.split("\n").pop()}</div>
                      )}
                      <span className="sr-only"><Etiqueta tono={ESTADO_TONO[p.estado] ?? "neutro"}>{p.estado}</Etiqueta></span>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="preliquidación" haySeleccion={!!actual} onAgregar={!abierto ? nuevo : undefined} onEditar={actual && editable(actual) ? () => void editar(actual) : undefined} onCopiar={() => { if (actual) void duplicar(actual); }} onEliminar={actual && editable(actual) ? () => void eliminar(actual) : undefined} extras={<>
        <BotonIcono etiqueta="Facturar" disabled={!actual || actual.estado !== "Aprobada"} onClick={() => { if (actual) onFacturar(actual, netoDe(actual.id)); }}><Receipt size={15} /></BotonIcono>
        <BotonIcono etiqueta="Vista previa" disabled={!actual} onClick={() => { if (actual) void navigate({ to: "/preliquidacion-vista", search: { id: actual.id } }); }}><Eye size={15} /></BotonIcono>
      </>} />
      </div>}
    </>
  );
}
