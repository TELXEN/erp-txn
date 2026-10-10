import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, BotonIcono, Campo, Input, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { CalendarIcon, Check, ChevronDown, ChevronRight, Pencil, Plus, Lock, Search, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Buscador, Resaltar, coincide } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import {
  RUBROS_COSTO,
  type RubroCosto,
  type GastoDirecto,
  useGastosDirectos,
  usePartidas,
  useProyectos,
  useTerceros,
} from "@/lib/datos";
import { InsigniaRubro } from "@/components/estado-ui";
import { exportarExcel } from "@/lib/exportar";
import { DesgloseCd } from "@/components/DesgloseCd";
import { esSobrecosto, solicitarDesbloqueo, textoSobrecosto, useSolicitudesDesbloqueo } from "@/lib/sobrecosto";
import { agruparSoloPorCategoria } from "@/lib/categorias";
import { InsigniaPago, PLAZOS, condicionVacia, datosCondicion } from "@/components/CondicionPago";

type Compra = GastoDirecto & { cantidad?: number; precio_unitario?: number; comprobante?: string; condicion_pago?: string; dias_credito?: number; fecha_vencimiento?: string | null; estado_pago?: string; fecha_pago?: string | null; banco_id?: string | null; numero_operacion?: string; insumo_id?: string | null };

type InsumoApu = { id: string; descripcion: string; tipo: string; codigo: string | null };

type Cuenta = { id: string; nombre: string; tipo_cuenta?: string; monedas?: string; numero_cuenta?: string | null; activo?: boolean };
type Tercero = { id: string; razon_social: string };

type Borrador = {
  key: number;
  fecha: string;
  comprobante: string;
  proveedor_id: string;
  insumoTexto: string;
  insumo_id: string | null;
  condicion_pago: string;
  dias_credito: string;
  banco_id: string;
  numero_operacion: string;
  cantidad: string;
  precio_unitario: string;
  rubro: string;
};

let seqBorrador = 1;
const borradorVacio = (): Borrador => ({
  key: seqBorrador++,
  fecha: hoy(),
  comprobante: "",
  proveedor_id: "",
  insumoTexto: "",
  insumo_id: null,
  ...condicionVacia(),
  banco_id: "",
  numero_operacion: "",
  cantidad: "",
  precio_unitario: "",
  rubro: "",
});

/** Tipo de insumo → rubro de la compra. */
const RUBRO_POR_TIPO: Record<string, RubroCosto> = {
  MO: "Servicios",
  MAT: "Materiales",
  EQ: "Equipos",
  HT: "Herramientas manuales",
  SC: "Subcontratos",
};
const rubroDeTipo = (tipo?: string) => RUBRO_POR_TIPO[tipo ?? ""] ?? "Materiales";

const num = (n: number) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Céntimos enteros: evita errores de redondeo binario. */
const cent = (n: number) => Math.round(Number(n || 0) * 100);
const sumar = (xs: number[]) => xs.reduce((s, x) => s + cent(x), 0) / 100;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const Route = createFileRoute("/_authenticated/gastos-directos")({
  head: () => ({
    meta: [
      { title: "Costos Directos — ERP TELXEN" },
      { name: "description", content: "Control presupuestario por partida: presupuesto vs costo real de compras." },
      { property: "og:title", content: "Costos Directos — ERP TELXEN" },
      { property: "og:description", content: "Presupuesto vs costo real por partida de obra." },
    ],
  }),
  component: GastosDirectos,
});

function GastosDirectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: solicitudes = [] } = useSolicitudesDesbloqueo();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosRaw = [] } = useGastosDirectos();
  const gastos = gastosRaw as Compra[];
  const { data: terceros = [] } = useTerceros();
  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const [proyectoId, setProyectoId] = useState("");
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [gruposCerrados, setGruposCerrados] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ pid: string; editando?: Compra; inicial?: Borrador } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return (data ?? []) as Cuenta[];
    },
  });
  const cuentasActivas = cuentas.filter((c) => c.activo);
  const { data: maestroInsumos = [] } = useQuery({
    queryKey: ["insumos_compras"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("insumos")
        .select("id, nombre, tipo, codigo")
        .order("nombre");
      if (err) throw err;
      return (data ?? []).map((i) => ({ id: i.id, descripcion: i.nombre, tipo: i.tipo, codigo: i.codigo }));
    },
  });
  const nombreInsumo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const i of maestroInsumos) mapa.set(i.id, i.descripcion);
    return (id?: string | null) => (id ? mapa.get(id) ?? "—" : "—");
  }, [maestroInsumos]);

  const nombreBanco = (id?: string | null) => {
    const c = cuentas.find((x) => x.id === id);
    return c ? `${c.nombre}${c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}` : "";
  };

  useEffect(() => {
    if (!proyectoId && proyectos.length) setProyectoId(proyectos[0]!.id);
  }, [proyectos, proyectoId]);

  const proyecto = proyectos.find((p) => p.id === proyectoId);
  const partidasProy = useMemo(
    () =>
      partidas
        .filter((p) => p.proyecto_id === proyectoId && coincide(busqueda, p.codigo, p.nombre, p.categoria))
        .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? "", undefined, { numeric: true })),
    [partidas, proyectoId, busqueda],
  );
  const comprasProy = gastos.filter((g) => g.proyecto_id === proyectoId);
  const costoDe = (pid: string) => sumar(comprasProy.filter((g) => g.partida_id === pid).map((g) => Number(g.monto_soles)));
  const cantDe = (pid: string) => comprasProy.filter((g) => g.partida_id === pid).reduce((s, g) => s + Number(g.cantidad ?? 0), 0);
  const presuTotal = sumar(partidasProy.map((p) => Number(p.presupuesto_inicial)));
  const costoTotal = sumar(comprasProy.map((g) => Number(g.monto_soles)));
  const consumo = presuTotal > 0 ? (costoTotal / presuTotal) * 100 : 0;
  const nombreProv = (g: Compra) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";

  const pendientes = solicitudes.filter((x) => x.proyecto_id === proyectoId && x.estado === "Pendiente").length;
  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function abrirCompra(pid: string) {
    setAbiertas((a) => ({ ...a, [pid]: true }));
    setModal({ pid });
  }

  function alternar(pid: string) {
    setAbiertas((a) => ({ ...a, [pid]: !a[pid] }));
  }

  /** Solicitudes aprobadas por Gerencia, vigentes y aún no usadas, de una partida. */
  function autorizadasDe(pid: string) {
    const ahora = new Date();
    return solicitudes.filter(
      (s) => s.partida_id === pid && s.estado === "Aprobada" && !s.usada_en && new Date(s.vence_en) >= ahora,
    );
  }

  /** Abre la ventana precargada con los datos de la compra autorizada por Gerencia. */
  function abrirAutorizada(pid: string, s: (typeof solicitudes)[number]) {
    setAbiertas((a) => ({ ...a, [pid]: true }));
    const prov = terceros.find((t) => t.razon_social === s.proveedor);
    setModal({
      pid,
      inicial: {
        ...borradorVacio(),
        insumoTexto: s.descripcion ?? "",
        proveedor_id: prov?.id ?? "",
        rubro: s.rubro ?? "",
        cantidad: "1",
        precio_unitario: String(Number(s.monto).toFixed(2)),
      },
    });
  }

  /** Edición sobre una compra ya registrada: la ventana se abre precargada. */
  function abrirEdicion(g: Compra) {
    setAbiertas((a) => ({ ...a, [g.partida_id]: true }));
    setModal({ pid: g.partida_id, editando: g });
  }

  function borradorDeCompra(g: Compra): Borrador {
    const contado = (g.condicion_pago ?? "Contado") !== "Crédito";
    const nombrePartida = partidas.find((p) => p.id === g.partida_id)?.nombre;
    const desc = g.insumo_id ? (maestroInsumos.find((i) => i.id === g.insumo_id)?.descripcion ?? "") : "";
    return {
      key: seqBorrador++,
      fecha: g.fecha,
      comprobante: g.comprobante ?? "",
      proveedor_id: g.proveedor_id ?? "",
      insumoTexto: desc || (g.descripcion === nombrePartida ? "" : g.descripcion),
      insumo_id: g.insumo_id ?? null,
      ...condicionVacia(g.condicion_pago ?? "Contado"),
      dias_credito: String(g.dias_credito ?? 0),
      banco_id: g.banco_id ?? (contado ? "caja" : ""),
      numero_operacion: g.numero_operacion ?? "",
      cantidad: String(g.cantidad ?? ""),
      precio_unitario: String(g.precio_unitario ?? ""),
      rubro: g.rubro ?? "",
    };
  }

  /** Guarda la compra: inserta una nueva o actualiza la que se está editando. */
  async function guardar(pid: string, b: Borrador, insumos: InsumoApu[], editando?: Compra): Promise<string | null> {
    const partida = partidas.find((p) => p.id === pid);
    if (!partida) return "Partida no encontrada.";
    if (!b.proveedor_id) return "Elige el proveedor.";
    if (Number(b.cantidad) <= 0) return "La cantidad debe ser mayor a cero.";
    if (Number(b.precio_unitario) < 0) return "El P.U. de compra no puede ser negativo.";
    const contado = b.condicion_pago !== "Crédito";
    if (contado && !b.banco_id) return "Elige la cuenta bancaria o Caja Chica del egreso.";
    if (contado && b.banco_id !== "caja" && !b.numero_operacion.trim()) return "Ingresa el N° de operación.";
    const prov = terceros.find((t) => t.id === b.proveedor_id);
    const insumo = insumos.find((i) => i.id === b.insumo_id);
    const monto = cent(Number(b.cantidad) * Number(b.precio_unitario)) / 100;
    const estado = editando?.estado_pago ?? (contado ? "Pagada" : "Pendiente");
    const datos = {
      proyecto_id: proyectoId,
      partida_id: pid,
      descripcion: b.insumoTexto.trim().toUpperCase() || partida.nombre,
      proveedor: prov?.razon_social ?? "",
      proveedor_id: b.proveedor_id,
      insumo_id: b.insumo_id,
      cantidad: Number(b.cantidad),
      precio_unitario: Number(b.precio_unitario),
      comprobante: b.comprobante.trim(),
      monto,
      moneda: "PEN",
      tipo_cambio: 1,
      monto_soles: monto,
      rubro: b.rubro || (insumo ? rubroDeTipo(insumo.tipo) : "Materiales"),
      fecha: b.fecha,
      ...datosCondicion(b, b.fecha),
      estado_pago: estado,
      banco_id: contado && b.banco_id !== "caja" ? b.banco_id : null,
      fecha_pago: estado === "Pagada" ? (editando?.fecha_pago ?? b.fecha) : null,
      numero_operacion: contado && b.banco_id !== "caja" ? b.numero_operacion.trim() : "",
    } as never;
    const q = editando
      ? supabase.from("gastos_directos").update(datos).eq("id", editando.id)
      : supabase.from("gastos_directos").insert(datos);
    const { error: err } = await q;
    if (err) return err.message;
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
    qc.invalidateQueries({ queryKey: ["solicitudes_desbloqueo"] });
    return null;
  }

  async function solicitar(pid: string, b: Borrador, insumos: InsumoApu[], motivo: string) {
    const prov = terceros.find((t) => t.id === b.proveedor_id);
    const insumo = insumos.find((i) => i.id === b.insumo_id);
    const err = await solicitarDesbloqueo({
      proyecto_id: proyectoId,
      partida_id: pid,
      rubro: b.rubro || (insumo ? rubroDeTipo(insumo.tipo) : "Materiales"),
      descripcion: b.insumoTexto.trim().toUpperCase(),
      proveedor: prov?.razon_social ?? "",
      monto: cent(Number(b.cantidad) * Number(b.precio_unitario)) / 100,
      motivo,
    });
    qc.invalidateQueries({ queryKey: ["solicitudes_desbloqueo"] });
    return err;
  }

  async function alternarPago(g: Compra) {
    await supabase.from("gastos_directos").update({ estado_pago: g.estado_pago === "Pagada" ? "Pendiente" : "Pagada" } as never).eq("id", g.id);
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta compra registrada?")) return;
    await supabase.from("gastos_directos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
  }

  function exportar() {
    const nomPart = (id: string) => partidas.find((p) => p.id === id);
    exportarExcel(`costos-directos-${proyecto?.codigo ?? "obra"}`, [
      {
        nombre: "Control por partida",
        filas: partidasProy.map((p) => {
          const c = costoDe(p.id);
          return {
            Código: p.codigo ?? "",
            Categoría: p.categoria ?? "",
            Partida: p.nombre,
            Und: p.unidad ?? "",
            Metrado: Number(p.metrado ?? 0),
            "P.U. Presup. (S/)": Number(p.precio_unitario ?? 0),
            "Presupuesto (S/)": Number(p.presupuesto_inicial),
            "Cant. comprada": cantDe(p.id),
            "Costo real (S/)": c,
            "Saldo (S/)": Number(p.presupuesto_inicial) - c,
          };
        }),
      },
      {
        nombre: "Compras",
        filas: comprasProy.map((g) => ({
          Fecha: g.fecha,
          Código: nomPart(g.partida_id)?.codigo ?? "",
          Partida: nomPart(g.partida_id)?.nombre ?? "",
          Comprobante: g.comprobante ?? "",
          Insumo: nombreInsumo(g.insumo_id),
          Condición: g.condicion_pago ?? "Contado",
          Vencimiento: g.fecha_vencimiento ?? "",
          "Estado de pago": g.estado_pago ?? "Pagada",
          "Cuenta bancaria": nombreBanco(g.banco_id),
          "N° operación": g.numero_operacion ?? "",
          Proveedor: nombreProv(g),
          Rubro: g.rubro,
          Cantidad: Number(g.cantidad ?? 0),
          "P.U. Compra": Number(g.precio_unitario ?? 0),
          Moneda: g.moneda,
          "Tipo de Cambio": Number(g.tipo_cambio),
          "Costo real (S/)": Number(g.monto_soles),
        })),
      },
    ]);
  }

  return (
    <div className="font-['Roboto']">
      <Encabezado
        titulo="Costos Directos"
        subtitulo="Presupuesto vs costo real por partida"
        acciones={
          <Boton variante="linea" onClick={exportar} disabled={!proyecto}>
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <Panel className="mb-4">
        <div className="grid gap-4 p-5 md:grid-cols-[minmax(220px,1.2fr)_repeat(4,1fr)] md:items-end">
          <Campo etiqueta="Obra">
            <Select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} · ` : ""}
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Dato titulo="Cliente" valor={proyecto?.cliente || "—"} />
          <Dato titulo="Presupuesto CD" valor={soles(presuTotal)} />
          <Dato titulo="Costo real" valor={soles(costoTotal)} />
          <TarjetaSaldo saldo={presuTotal - costoTotal} consumo={consumo} />
        </div>
      </Panel>

      {pendientes > 0 && (
        <p className="mb-3 rounded-md border border-warn/30 bg-warn/10 px-4 py-2 text-xs text-warn">
          {pendientes} solicitud{pendientes === 1 ? "" : "es"} de desbloqueo pendiente{pendientes === 1 ? "" : "s"} de aprobación de Gerencia en esta obra.
        </p>
      )}
      <div className="mb-4"><DesgloseCd proyectoId={proyectoId} /></div>

      <Panel
        titulo="Control por partida"
        extra={<Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código o partida..." total={partidasProy.length} />}
      >
        {partidasProy.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Esta obra aún no tiene partidas registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] tabular-nums text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Partida</th>
                  <th className="px-2 py-2 font-medium">Und.</th>
                  <th className="px-2 py-2 text-right font-medium">Metrado</th>
                  <th className="px-2 py-2 text-right font-medium">P.U.</th>
                  <th className="px-3 py-2 text-right font-medium">Presupuesto</th>
                  <th className="px-2 py-2 text-right font-medium">Cant. real</th>
                  <th className="px-3 py-2 text-right font-medium">Costo real</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo</th>
                  <th className="px-3 py-2 text-right font-medium">Consumo</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {agruparSoloPorCategoria(partidasProy).map((grupo) => {
                  const gPresu = grupo.items.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
                  const gCosto = sumar(grupo.items.map((p) => costoDe(p.id)));
                  const cerrado = gruposCerrados[grupo.categoria];
                  return (
                  <React.Fragment key={grupo.categoria}>
                    <tr className="border-b border-line/40 bg-muted/40">
                      <td colSpan={11} className="px-5 py-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <button type="button" onClick={() => setGruposCerrados((g) => ({ ...g, [grupo.categoria]: !g[grupo.categoria] }))} className="inline-flex items-center gap-1 label-mono text-left">
                            {cerrado ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            <Resaltar texto={grupo.categoria} termino={busqueda} />
                          </button>
                          <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-muted-foreground">
                            Presupuesto Grupo: <b className="text-ink">{soles(gPresu)}</b>
                            <span className="mx-2 text-line">|</span>
                            Consumido: <b className={gCosto > gPresu ? "text-bad" : "text-ink"}>{soles(gCosto)}</b>
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!cerrado && grupo.items.map((p) => {
                      const presu = Number(p.presupuesto_inicial);
                      const costo = costoDe(p.id);
                      const uso = presu > 0 ? (costo / presu) * 100 : costo > 0 ? 100 : 0;
                      const compras = comprasProy.filter((g) => g.partida_id === p.id);
                      const abierta = abiertas[p.id];
                      return (
                        <React.Fragment key={p.id}>
                          <tr className="border-b border-line/40">
                            <td className="px-5 py-2.5">
                              <button
                                type="button"
                                onClick={() => alternar(p.id)}
                                className="inline-flex items-center gap-1 text-primary"
                                title="Ver compras"
                              >
                                {abierta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <Resaltar texto={p.codigo || "—"} termino={busqueda} />
                              </button>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-ink"><Resaltar texto={p.nombre} termino={busqueda} /></td>
                            <td className="px-2 py-2.5 text-muted-foreground">{p.unidad || "—"}</td>
                            <td className="px-2 py-2.5 text-right">{num(Number(p.metrado ?? 0))}</td>
                            <td className="px-2 py-2.5 text-right">{num(Number(p.precio_unitario ?? 0))}</td>
                            <td className="px-3 py-2.5 text-right">{soles(presu)}</td>
                            <td className="px-2 py-2.5 text-right">{num(cantDe(p.id))}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-ink">{soles(costo)}</td>
                            <td className={`px-3 py-2.5 text-right font-semibold ${presu - costo < 0 ? "bg-bad/10 text-bad" : "text-good"}`}>
                              {solesSaldo(presu - costo)}
                              {presu - costo < 0 && <div className="text-[9px] font-normal uppercase tracking-wide">Sobregiro</div>}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <BarraConsumo uso={uso} />
                            </td>
                            <td className="px-5 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => abrirCompra(p.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-muted-foreground hover:border-primary hover:text-primary"
                              >
                                <Plus size={12} /> Compra
                              </button>
                            </td>
                          </tr>
                          {abierta && (
                            <tr className="border-b border-line/40">
                              <td colSpan={11} className="px-8 py-3">
                                {autorizadasDe(p.id).map((s) => (
                                  <div key={s.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-md border border-good/40 bg-good/10 px-3 py-2">
                                    <Check size={13} className="shrink-0 text-good" />
                                    <p className="flex-1 text-[11px] text-ink">
                                      <b>Compra autorizada por Gerencia:</b> {s.descripcion || "Sin descripción"} · {soles(Number(s.monto))}
                                      <span className="text-muted-foreground"> · vence {fmtFecha(s.vence_en.slice(0, 10))}</span>
                                    </p>
                                    <Boton type="button" onClick={() => abrirAutorizada(p.id, s)}>
                                      <Pencil size={12} /> Registrar compra autorizada
                                    </Boton>
                                  </div>
                                ))}
                                <div className="overflow-hidden rounded-md border border-line">
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="bg-muted text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                                      <th className="px-3 py-1.5 font-medium">Fecha</th>
                                      <th className="px-2 font-medium">Comprobante</th>
                                      <th className="px-2 font-medium">Proveedor</th>
                                      <th className="px-2 font-medium">Insumo</th>
                                      <th className="px-2 font-medium">Pago</th>
                                      <th className="px-2 font-medium">Banco</th>
                                      <th className="px-2 text-right font-medium">Cantidad</th>
                                      <th className="px-2 text-right font-medium">P.U. compra</th>
                                      <th className="px-2 text-right font-medium">Costo real</th>
                                      <th className="px-3"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compras.map((g) => (
                                      <tr key={g.id} className="border-t border-line/40">
                                        <td className="px-3 py-1.5">{fmtFecha(g.fecha)}</td>
                                        <td className="px-2">{g.comprobante || "—"}</td>
                                        <td className="px-2">{nombreProv(g)}</td>
                                        <td className="px-2 uppercase">{g.insumo_id ? nombreInsumo(g.insumo_id) : (g.descripcion && g.descripcion !== p.nombre ? g.descripcion : "—")}</td>
                                        <td className="px-2">
                                          <button type="button" title="Cambiar estado de pago" disabled={g.condicion_pago !== "Crédito"} onClick={() => alternarPago(g)}>
                                            <InsigniaPago condicion={g.condicion_pago} vencimiento={g.fecha_vencimiento} pagado={g.estado_pago === "Pagada"} />
                                          </button>
                                        </td>
                                        <td className="px-2 text-[10px] text-muted-foreground">
                                          {g.banco_id ? nombreBanco(g.banco_id) : g.condicion_pago === "Crédito" ? "—" : "Caja Chica"}
                                          {g.numero_operacion ? ` · Op. ${g.numero_operacion}` : ""}
                                        </td>
                                        <td className="px-2 text-right">{num(Number(g.cantidad ?? 0))}</td>
                                        <td className="px-2 text-right">
                                          {g.moneda === "USD" ? "US$ " : "S/ "}
                                          {num(Number(g.precio_unitario ?? 0))}
                                        </td>
                                        <td className="px-2 text-right font-semibold">{soles(Number(g.monto_soles))}</td>
                                        <td className="px-3 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <BotonIcono etiqueta="Editar compra" tono="neutro" className="size-7" onClick={() => abrirEdicion(g)}>
                                              <Pencil size={12} />
                                            </BotonIcono>
                                            <BotonIcono etiqueta="Eliminar compra" tono="peligro" className="size-7" onClick={() => eliminar(g.id)}>
                                              <Trash2 size={12} />
                                            </BotonIcono>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    {compras.length === 0 && (
                                      <tr><td colSpan={10} className="px-3 py-2 text-muted-foreground">Sin compras registradas.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => abrirCompra(p.id)}
                                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                                >
                                  <Plus size={12} /> Añadir otra compra
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {modal && (() => {
        const mp = partidas.find((x) => x.id === modal.pid);
        if (!mp) return null;
        const ed = modal.editando;
        const costoBase = ed ? (cent(costoDe(mp.id)) - cent(Number(ed.monto_soles))) / 100 : costoDe(mp.id);
        return (
          <ModalCompra
            key={ed ? `edit-${ed.id}` : modal.inicial ? `aut-${modal.inicial.key}` : mp.id}
            partida={{ codigo: mp.codigo, nombre: mp.nombre, unidad: mp.unidad, presupuesto: Number(mp.presupuesto_inicial), costo: costoBase }}
            insumos={maestroInsumos}
            proveedores={proveedores}
            cuentas={cuentasActivas}
            onCerrar={() => setModal(null)}
            inicial={ed ? borradorDeCompra(ed) : modal.inicial}
            esEdicion={!!ed}
            onRegistrar={(b) => guardar(mp.id, b, maestroInsumos, ed)}
            onSolicitar={(b, m) => solicitar(mp.id, b, maestroInsumos, m)}
          />
        );
      })()}
    </div>
  );
}

/** Barra de consumo: verde < 80 %, amarillo 80–100 %, rojo > 100 %. */
function BarraConsumo({ uso }: { uso: number }) {
  const color = uso > 100 ? "bg-bad" : uso >= 80 ? "bg-accent" : "bg-good";
  const texto = uso > 100 ? "text-bad" : "text-ink";
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, uso))}%` }} />
      </div>
      <span className={`w-10 text-right font-semibold ${texto}`}>{uso.toFixed(0)}%</span>
    </div>
  );
}

type PartidaResumen = { codigo: string | null; nombre: string; unidad: string | null; presupuesto: number; costo: number };

export function FechaPeru({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const d = valor ? new Date(`${valor}T00:00:00`) : undefined;
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-9 w-full items-center justify-between rounded-md border border-line bg-card px-2.5 text-left text-xs outline-none focus:border-primary">
          {d ? format(d, "dd/MM/yyyy") : <span className="text-muted-foreground">DD/MM/AAAA</span>}
          <CalendarIcon size={13} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={d}
          locale={es}
          onSelect={(x) => { if (x) { onChange(format(x, "yyyy-MM-dd")); setAbierto(false); } }}
          initialFocus
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

/** Ventana «Registrar compra» / «Editar compra»: resumen de la partida + campos. */
function ModalCompra({
  partida,
  insumos,
  proveedores,
  cuentas,
  onCerrar,
  onRegistrar,
  onSolicitar,
  inicial,
  esEdicion = false,
}: {
  partida: PartidaResumen;
  insumos: InsumoApu[];
  proveedores: Tercero[];
  cuentas: Cuenta[];
  onCerrar: () => void;
  onRegistrar: (b: Borrador) => Promise<string | null>;
  onSolicitar: (b: Borrador, motivo: string) => Promise<string | null>;
  /** Compra ya registrada: la ventana se abre precargada y guarda los cambios. */
  inicial?: Borrador | undefined;
  esEdicion?: boolean;
}) {
  const [b, setB] = useState<Borrador>(inicial ?? borradorVacio);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [bloqueo, setBloqueo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const contado = b.condicion_pago !== "Crédito";
  const totalC = cent(Number(b.cantidad || 0) * Number(b.precio_unitario || 0));
  const costoC = cent(partida.costo);
  const presuC = cent(partida.presupuesto);
  const nuevoCosto = costoC + totalC;
  const saldoActual = presuC - costoC;
  const saldoNuevo = presuC - nuevoCosto;
  const usoActual = presuC > 0 ? (costoC / presuC) * 100 : costoC > 0 ? 100 : 0;
  const usoNuevo = presuC > 0 ? (nuevoCosto / presuC) * 100 : nuevoCosto > 0 ? 100 : 0;

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    setOk("");
    const err = await onRegistrar(b);
    setGuardando(false);
    if (err) { setBloqueo(esSobrecosto(err) ? textoSobrecosto(err) : ""); return setError(esSobrecosto(err) ? "" : err); }
    setBloqueo("");
    if (esEdicion) return onCerrar();
    setOk(`Compra registrada · ${soles(totalC / 100)}`);
    setB(borradorVacio());
  }

  const etq = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";
  const etqF = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink/70";
  const inp = "h-9 px-3 text-sm";
  const muestraOperacion = contado && b.banco_id && b.banco_id !== "caja";

  return (
    <VentanaFlotante titulo={esEdicion ? "Editar compra" : "Registrar compra"} abierta onCerrar={onCerrar} ancho="max-w-2xl" ocultarBarra>
      <div className="font-['Roboto']">
        {/* Contexto de la partida (precargado y bloqueado) */}
        <div className="grid grid-cols-12 gap-x-5 gap-y-3 border-b border-line bg-muted/40 px-5 py-4">
          <div className="col-span-3"><p className={etq}>Código de partida</p><p className="text-sm font-medium text-ink">{partida.codigo || "—"}</p></div>
          <div className="col-span-7"><p className={etq}>Descripción</p><p className="truncate text-sm font-medium text-ink" title={partida.nombre}>{partida.nombre}</p></div>
          <div className="col-span-2"><p className={etq}>Und.</p><p className="text-sm font-medium text-ink">{partida.unidad || "—"}</p></div>
          <div className="col-span-3"><p className={etq}>Presupuesto</p><p className="text-sm tabular-nums text-ink">{soles(presuC / 100)}</p></div>
          <div className="col-span-3"><p className={etq}>{esEdicion ? "Costo real (sin esta compra)" : "Costo real"}</p><p className="text-sm tabular-nums text-ink">{soles(costoC / 100)}</p></div>
          <div className="col-span-6 flex flex-col justify-end">
            <div className="flex items-end justify-between">
              <p className={etq}>Saldo disponible</p>
              <p className={`text-sm font-bold tabular-nums ${saldoActual < 0 ? "text-bad" : "text-good"}`}>{solesSaldo(saldoActual / 100)}</p>
            </div>
            <BarraConsumo uso={usoActual} />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{usoActual.toFixed(0)}% consumido</p>
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><span className={etqF}>Fecha</span><FechaPeru valor={b.fecha} onChange={(v) => setB({ ...b, fecha: v })} /></div>
            <label><span className={etqF}>Comprobante</span>
              <Input autoFocus value={b.comprobante} onChange={(e) => setB({ ...b, comprobante: e.target.value })} placeholder="F001-1240" maxLength={40} className={inp} /></label>
            <label><span className={etqF}>Proveedor</span>
              <Select value={b.proveedor_id} onChange={(e) => setB({ ...b, proveedor_id: e.target.value })} className={inp}>
                <option value="">Selecciona...</option>
                {proveedores.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
              </Select></label>
          </div>

          <label className="block"><span className={etqF}>Insumo</span>
            <AutoInsumo
              conIcono
              value={b.insumoTexto}
              insumos={insumos}
              onChange={(v) => setB({ ...b, insumoTexto: v.toUpperCase(), insumo_id: null })}
              onElegir={(i) => setB({ ...b, insumoTexto: i.descripcion.toUpperCase(), insumo_id: i.id, rubro: rubroDeTipo(i.tipo) })}
              onEnter={() => void enviar()}
            /></label>

          <label className="block"><span className={etqF}>Tipo de recurso</span>
            <Select required value={b.rubro} onChange={(e) => setB({ ...b, rubro: e.target.value })} className={inp}>
              <option value="">Según el insumo…</option>
              {RUBROS_COSTO.map((r) => <option key={r} value={r}>{r === "Equipos" ? "Herramientas y equipos" : r}</option>)}
            </Select></label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label><span className={etqF}>Pago</span>
              <Select value={b.condicion_pago} onChange={(e) => setB({ ...b, ...condicionVacia(e.target.value) })} className={inp}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </Select></label>
            <label><span className={etqF}>{contado ? "Banco" : `Días · vence ${fmtFecha(datosCondicion(b, b.fecha).fecha_vencimiento)}`}</span>
              {contado ? (
                <Select value={b.banco_id} onChange={(e) => setB({ ...b, banco_id: e.target.value })} className={inp}>
                  <option value="">Selecciona...</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}</option>)}
                  <option value="caja">Caja Chica (efectivo)</option>
                </Select>
              ) : (
                <div className="flex gap-1.5">
                  <Select value={PLAZOS.includes(Number(b.dias_credito)) ? b.dias_credito : "otro"} onChange={(e) => e.target.value !== "otro" && setB({ ...b, dias_credito: e.target.value })} className={inp}>
                    {PLAZOS.map((p) => <option key={p} value={String(p)}>{p} días</option>)}
                    <option value="otro">Otro</option>
                  </Select>
                  {!PLAZOS.includes(Number(b.dias_credito)) && (
                    <Input type="number" min="0" step="1" value={b.dias_credito} onChange={(e) => setB({ ...b, dias_credito: e.target.value })} className={`${inp} w-20 text-right`} />
                  )}
                </div>
              )}</label>
            {muestraOperacion && (
              <label><span className={etqF}>N° de operación</span>
                <Input value={b.numero_operacion} onChange={(e) => setB({ ...b, numero_operacion: e.target.value })} maxLength={40} className={inp} /></label>
            )}
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
            <label><span className={etqF}>Cantidad</span>
              <Input type="number" step="0.01" min="0" value={b.cantidad} onChange={(e) => setB({ ...b, cantidad: e.target.value })} className={`${inp} text-right`} /></label>
            <label><span className={etqF}>P.U. compra (S/)</span>
              <Input type="number" step="0.01" min="0" value={b.precio_unitario} onChange={(e) => setB({ ...b, precio_unitario: e.target.value })} className={`${inp} text-right`} /></label>
            <div className="rounded-md border border-line bg-muted/50 px-3 py-2">
              <p className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Costo real</p>
              <p className="text-right text-sm font-bold tabular-nums text-ink">{soles(totalC / 100)}</p>
            </div>
          </div>

          <div className={`overflow-hidden rounded-lg border ${saldoNuevo < 0 ? "border-bad/40 bg-bad/10" : "border-line"}`}>
            <div className="border-b border-line bg-muted/50 px-4 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impacto proyectado</h3>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              <div className="px-3 py-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Costo real</p>
                <p className="text-sm font-semibold tabular-nums text-ink">{soles(nuevoCosto / 100)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Saldo final</p>
                <p className={`text-sm font-semibold tabular-nums ${saldoNuevo < 0 ? "text-bad" : "text-good"}`}>{soles(saldoNuevo / 100)}</p>
                {saldoNuevo < 0 && <p className="text-[10px] text-bad">Sobregiro de {soles(-saldoNuevo / 100)}</p>}
              </div>
              <div className="flex flex-col items-center justify-center gap-1 px-3 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Consumo</p>
                <BarraConsumo uso={usoNuevo} />
              </div>
            </div>
          </div>

          {bloqueo && (
            <div className="space-y-2 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-bad"><Lock size={13} /> Partida bloqueada por sobrecosto</p>
              <p className="text-xs text-ink">{bloqueo}</p>
              <div className="flex flex-wrap gap-2">
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo para Gerencia (opcional)" className="h-8 flex-1 text-xs" maxLength={300} />
                <Boton type="button" onClick={async () => {
                  const e = await onSolicitar(b, motivo.trim());
                  if (e) return setError(e);
                  setBloqueo(""); setMotivo("");
                  setOk("Solicitud enviada a Gerencia. Cuando la apruebe, vuelve a guardar esta compra.");
                }}>Solicitar desbloqueo a Gerencia</Boton>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {error && <span className="mr-auto text-[11px] text-bad">{error}</span>}
            {ok && !error && <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-good"><Check size={13} /> {ok}</span>}
            <Boton type="button" variante="linea" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" disabled={guardando}><Check size={13} /> {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Guardar"}</Boton>
          </div>
        </form>
      </div>
    </VentanaFlotante>
  );
}


/** Buscador de insumo con sugerencias del APU de la partida; admite texto libre. */
function AutoInsumo({
  value,
  insumos,
  onChange,
  onElegir,
  onEnter,
  conIcono = false,
}: {
  value: string;
  insumos: InsumoApu[];
  onChange: (v: string) => void;
  onElegir: (i: InsumoApu) => void;
  onEnter: () => void;
  conIcono?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);
  const sugerencias = useMemo(() => {
    const t = norm(value.trim());
    if (!t) return insumos.slice(0, 8);
    return insumos
      .filter((i) => norm(i.descripcion).includes(t) || (i.codigo ? norm(i.codigo).includes(t) : false))
      .sort((a, b) => Number(norm(b.descripcion).startsWith(t)) - Number(norm(a.descripcion).startsWith(t)))
      .slice(0, 8);
  }, [insumos, value]);

  return (
    <div className="relative">
      {conIcono && <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />}
      <input
        value={value}
        placeholder="Busca en el maestro o escribe libre…"
        className={`h-9 w-full rounded-md border border-line bg-card text-xs outline-none focus:border-primary ${conIcono ? "pl-8 pr-3" : "px-2"}`}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setIndice(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && abierto && sugerencias.length) {
            e.preventDefault();
            setIndice((i) => (i + 1) % sugerencias.length);
            return;
          }
          if (e.key === "ArrowUp" && abierto && sugerencias.length) {
            e.preventDefault();
            setIndice((i) => (i - 1 + sugerencias.length) % sugerencias.length);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (abierto && sugerencias[indice]) {
              setAbierto(false);
              onElegir(sugerencias[indice]!);
            } else onEnter();
            return;
          }
          if (e.key === "Escape") setAbierto(false);
        }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute left-0 top-full z-30 mt-1 max-h-48 w-64 overflow-auto rounded-md border border-line bg-card shadow-lg">
          {sugerencias.map((i, idx) => (
            <li key={i.id}>
              <button
                type="button"
                className={`block w-full px-2 py-1 text-left text-[11px] ${idx === indice ? "bg-muted" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setAbierto(false);
                  onElegir(i);
                }}
              >
                <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{i.codigo ?? "—"}</span>
                {i.descripcion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dato({ titulo, valor, tono = "text-ink" }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div>
      <p className="label-mono">{titulo}</p>
      <p className={`mt-1 tabular-nums text-lg font-bold tracking-tight ${tono}`}>{valor}</p>
    </div>
  );
}

function solesSaldo(v: number) {
  return v < 0 ? `(${soles(Math.abs(v))})` : soles(v);
}

function TarjetaSaldo({ saldo, consumo }: { saldo: number; consumo: number }) {
  const color = consumo > 100 ? "bg-bad" : consumo >= 80 ? "bg-accent" : "bg-good";
  return (
    <div className="rounded-md border border-line bg-muted/30 px-3 py-2">
      <p className="label-mono">Saldo</p>
      <p className={`mt-0.5 tabular-nums text-xl font-bold tracking-tight ${saldo < 0 ? "text-bad" : "text-good"}`}>{solesSaldo(saldo)}</p>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>% Consumido Global</span>
        <span className={`tabular-nums font-semibold ${consumo > 100 ? "text-bad" : "text-ink"}`}>{consumo.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, consumo))}%` }} />
      </div>
    </div>
  );
}
