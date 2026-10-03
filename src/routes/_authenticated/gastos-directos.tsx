import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Check, ChevronDown, ChevronRight, Plus, Trash2, Upload, X } from "lucide-react";
import { Buscador, Resaltar, coincide } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import {
  type RubroCosto,
  type GastoDirecto,
  useGastosDirectos,
  usePartidas,
  useProyectos,
  useTerceros,
} from "@/lib/datos";
import { InsigniaRubro } from "@/components/estado-ui";
import { exportarExcel } from "@/lib/exportar";
import { agruparSoloPorCategoria } from "@/lib/categorias";
import { InsigniaPago, PLAZOS, condicionVacia, datosCondicion } from "@/components/CondicionPago";

type Compra = GastoDirecto & { cantidad?: number; precio_unitario?: number; comprobante?: string; condicion_pago?: string; fecha_vencimiento?: string | null; estado_pago?: string; banco_id?: string | null; numero_operacion?: string; insumo_id?: string | null };

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
});

/** Tipo de insumo → rubro de la compra. */
const RUBRO_POR_TIPO: Record<string, RubroCosto> = {
  MO: "Servicios",
  MAT: "Materiales",
  EQ: "Equipos",
  HT: "Materiales",
  SC: "Subcontratos",
};
const rubroDeTipo = (tipo?: string) => RUBRO_POR_TIPO[tipo ?? ""] ?? "Materiales";

const num = (n: number) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosRaw = [] } = useGastosDirectos();
  const gastos = gastosRaw as Compra[];
  const { data: terceros = [] } = useTerceros();
  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const [proyectoId, setProyectoId] = useState("");
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [filas, setFilas] = useState<Record<string, Borrador[]>>({});
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
  const costoDe = (pid: string) => comprasProy.filter((g) => g.partida_id === pid).reduce((s, g) => s + Number(g.monto_soles), 0);
  const cantDe = (pid: string) => comprasProy.filter((g) => g.partida_id === pid).reduce((s, g) => s + Number(g.cantidad ?? 0), 0);
  const presuTotal = partidasProy.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
  const costoTotal = comprasProy.reduce((s, g) => s + Number(g.monto_soles), 0);
  const consumo = presuTotal > 0 ? (costoTotal / presuTotal) * 100 : 0;
  const nombreProv = (g: Compra) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const filasDe = (pid: string) => filas[pid] ?? [];

  function setFilasDe(pid: string, lista: Borrador[]) {
    setFilas((f) => ({ ...f, [pid]: lista }));
  }

  function abrirCompra(pid: string) {
    setAbiertas((a) => ({ ...a, [pid]: true }));
    setFilas((f) => (f[pid]?.length ? f : { ...f, [pid]: [borradorVacio()] }));
  }

  function alternar(pid: string) {
    const abierta = !abiertas[pid];
    setAbiertas((a) => ({ ...a, [pid]: abierta }));
    if (abierta) setFilas((f) => (f[pid]?.length ? f : { ...f, [pid]: [borradorVacio()] }));
  }

  async function registrar(pid: string, b: Borrador, insumos: InsumoApu[]): Promise<string | null> {
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
    const monto = Number(b.cantidad) * Number(b.precio_unitario);
    const { error: err } = await supabase.from("gastos_directos").insert({
      proyecto_id: proyectoId,
      partida_id: pid,
      descripcion: b.insumoTexto.trim() || partida.nombre,
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
      rubro: insumo ? rubroDeTipo(insumo.tipo) : "Materiales",
      fecha: b.fecha,
      ...datosCondicion(b, b.fecha),
      estado_pago: contado ? "Pagada" : "Pendiente",
      banco_id: contado && b.banco_id !== "caja" ? b.banco_id : null,
      fecha_pago: contado ? b.fecha : null,
      numero_operacion: contado && b.banco_id !== "caja" ? b.numero_operacion.trim() : "",
    } as never);
    if (err) return err.message;
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
    return null;
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
    <>
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
          <Dato
            titulo={`Saldo · ${consumo.toFixed(1)}% consumido`}
            valor={soles(presuTotal - costoTotal)}
            tono={presuTotal - costoTotal < 0 ? "text-bad" : "text-good"}
          />
        </div>
      </Panel>

      <Panel
        titulo="Control por partida"
        extra={<Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código o partida..." total={partidasProy.length} />}
      >
        {partidasProy.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="Esta obra aún no tiene partidas registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] font-mono text-xs">
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
                {agruparSoloPorCategoria(partidasProy).map((grupo) => (
                  <React.Fragment key={grupo.categoria}>
                    <tr className="border-b border-line/40 bg-muted/40">
                      <td colSpan={5} className="px-5 py-1.5 label-mono"><Resaltar texto={grupo.categoria} termino={busqueda} /></td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {soles(grupo.items.reduce((s, p) => s + Number(p.presupuesto_inicial), 0))}
                      </td>
                      <td />
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {soles(grupo.items.reduce((s, p) => s + costoDe(p.id), 0))}
                      </td>
                      <td colSpan={3} />
                    </tr>
                    {grupo.items.map((p) => {
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
                            <td className={`px-3 py-2.5 text-right font-semibold ${presu - costo < 0 ? "text-bad" : "text-good"}`}>
                              {soles(presu - costo)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Etiqueta tono={uso > 100 ? "bad" : uso > 85 ? "neutro" : "good"}>{uso.toFixed(0)}%</Etiqueta>
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
                            <tr className="border-b border-line/40 bg-muted/20">
                              <td colSpan={11} className="px-8 py-2">
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="text-left text-[10px] uppercase text-muted-foreground">
                                      <th className="py-1">Fecha</th>
                                      <th>Comprobante</th>
                                      <th>Proveedor</th>
                                      <th>Insumo</th>
                                      <th>Pago</th>
                                      <th className="text-right">Cantidad</th>
                                      <th className="text-right">P.U. compra</th>
                                      <th className="text-right">Costo real</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compras.map((g) => (
                                      <tr key={g.id} className="border-t border-line/30">
                                        <td className="py-1.5">{fmtFecha(g.fecha)}</td>
                                        <td>{g.comprobante || "—"}</td>
                                        <td>{nombreProv(g)}</td>
                                        <td>{g.insumo_id ? nombreInsumo(g.insumo_id) : (g.descripcion && g.descripcion !== p.nombre ? g.descripcion : "—")}</td>
                                        <td>
                                          <button type="button" title="Cambiar estado de pago" disabled={g.condicion_pago !== "Crédito"} onClick={() => alternarPago(g)}>
                                            <InsigniaPago condicion={g.condicion_pago} vencimiento={g.fecha_vencimiento} pagado={g.estado_pago === "Pagada"} />
                                          </button>
                                          {g.banco_id && (
                                            <div className="text-[10px] text-muted-foreground">
                                              {nombreBanco(g.banco_id)}{g.numero_operacion ? ` · Op. ${g.numero_operacion}` : ""}
                                            </div>
                                          )}
                                        </td>
                                        <td className="text-right">{num(Number(g.cantidad ?? 0))}</td>
                                        <td className="text-right">
                                          {g.moneda === "USD" ? "US$ " : "S/ "}
                                          {num(Number(g.precio_unitario ?? 0))}
                                        </td>
                                        <td className="text-right font-semibold">{soles(Number(g.monto_soles))}</td>
                                        <td className="text-right">
                                          <button type="button" onClick={() => eliminar(g.id)} className="text-muted-foreground hover:text-bad" title="Eliminar">
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {compras.length === 0 && filasDe(p.id).length === 0 && (
                                      <tr><td colSpan={9} className="py-1 text-muted-foreground">Sin compras registradas.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                                <div className="mt-1 space-y-1.5">
                                  {filasDe(p.id).map((b) => (
                                    <FilaCompra
                                      key={b.key}
                                      borrador={b}
                                      insumos={maestroInsumos}
                                      proveedores={proveedores}
                                      cuentas={cuentasActivas}
                                      onCambiar={(nb) => setFilasDe(p.id, filasDe(p.id).map((x) => (x.key === b.key ? nb : x)))}
                                      onDescartar={() => {
                                        const resto = filasDe(p.id).filter((x) => x.key !== b.key);
                                        setFilasDe(p.id, resto.length ? resto : [borradorVacio()]);
                                      }}
                                      onRegistrar={async () => {
                                        const error = await registrar(p.id, b, maestroInsumos);
                                        if (error) return error;
                                        const resto = filasDe(p.id).filter((x) => x.key !== b.key);
                                        setFilasDe(p.id, resto.length ? resto : [borradorVacio()]);
                                        return null;
                                      }}
                                    />
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setFilasDe(p.id, [...filasDe(p.id), borradorVacio()])}
                                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2.5 py-1.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                                    title="Añadir otra fila de compra"
                                  >
                                    <Plus size={12} /> Añadir otra compra
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
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

function FechaPeru({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
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

/** Ventana «Registrar compra»: resumen de la partida + campos; queda abierta tras guardar. */
function ModalCompra({
  partida,
  insumos,
  proveedores,
  cuentas,
  onCerrar,
  onRegistrar,
}: {
  partida: PartidaResumen;
  insumos: InsumoApu[];
  proveedores: Tercero[];
  cuentas: Cuenta[];
  onCerrar: () => void;
  onRegistrar: (b: Borrador) => Promise<string | null>;
}) {
  const [b, setB] = useState<Borrador>(borradorVacio);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
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

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCerrar]);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    setOk("");
    const err = await onRegistrar(b);
    setGuardando(false);
    if (err) return setError(err);
    setOk(`Compra registrada · ${soles(totalC / 100)}`);
    setB(borradorVacio());
  }

  const etq = "mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground";
  const inp = "h-9 px-2.5 text-xs";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4" onMouseDown={onCerrar}>
      <div className="panel my-8 w-full max-w-4xl overflow-hidden font-mono" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold tracking-tight">Registrar compra</h2>
          <button type="button" onClick={onCerrar} className="text-muted-foreground hover:text-ink" title="Cerrar (Esc)"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-line bg-muted/40 px-5 py-4 text-xs sm:grid-cols-4 lg:grid-cols-7">
          <ResumenDato t="Código" v={partida.codigo || "—"} />
          <div className="col-span-2 lg:col-span-2"><p className={etq}>Partida</p><p className="font-semibold text-ink">{partida.nombre}</p></div>
          <ResumenDato t="Und." v={partida.unidad || "—"} />
          <ResumenDato t="Presupuesto" v={soles(presuC / 100)} />
          <ResumenDato t="Costo real" v={soles(costoC / 100)} />
          <div>
            <p className={etq}>Saldo</p>
            <p className={`font-semibold ${saldoActual < 0 ? "text-bad" : "text-good"}`}>{soles(saldoActual / 100)}</p>
            <div className="mt-1"><BarraConsumo uso={usoActual} /></div>
          </div>
        </div>

        <form onSubmit={enviar} className="px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><span className={etq}>Fecha</span><FechaPeru valor={b.fecha} onChange={(v) => setB({ ...b, fecha: v })} /></div>
            <label><span className={etq}>Comprobante</span>
              <Input autoFocus value={b.comprobante} onChange={(e) => setB({ ...b, comprobante: e.target.value })} placeholder="F001-1240" maxLength={40} className={inp} /></label>
            <label className="lg:col-span-2"><span className={etq}>Proveedor</span>
              <Select value={b.proveedor_id} onChange={(e) => setB({ ...b, proveedor_id: e.target.value })} className={inp}>
                <option value="">Selecciona...</option>
                {proveedores.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
              </Select></label>
            <label className="sm:col-span-2"><span className={etq}>Insumo</span>
              <AutoInsumo
                value={b.insumoTexto}
                insumos={insumos}
                onChange={(v) => setB({ ...b, insumoTexto: v.toUpperCase(), insumo_id: null })}
                onElegir={(i) => setB({ ...b, insumoTexto: i.descripcion.toUpperCase(), insumo_id: i.id })}
                onEnter={() => void enviar()}
              /></label>
            <label><span className={etq}>Pago</span>
              <Select value={b.condicion_pago} onChange={(e) => setB({ ...b, ...condicionVacia(e.target.value) })} className={inp}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </Select></label>
            <label><span className={etq}>{contado ? "Banco" : `Días · vence ${fmtFecha(datosCondicion(b, b.fecha).fecha_vencimiento)}`}</span>
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
            {contado && b.banco_id && b.banco_id !== "caja" && (
              <label><span className={etq}>N° de operación</span>
                <Input value={b.numero_operacion} onChange={(e) => setB({ ...b, numero_operacion: e.target.value })} maxLength={40} className={inp} /></label>
            )}
            <label><span className={etq}>Cantidad</span>
              <Input type="number" step="0.01" min="0" value={b.cantidad} onChange={(e) => setB({ ...b, cantidad: e.target.value })} className={`${inp} text-right`} /></label>
            <label><span className={etq}>P.U. compra (S/)</span>
              <Input type="number" step="0.01" min="0" value={b.precio_unitario} onChange={(e) => setB({ ...b, precio_unitario: e.target.value })} className={`${inp} text-right`} /></label>
            <label><span className={etq}>Costo real</span>
              <Input readOnly disabled value={soles(totalC / 100)} className={`${inp} bg-muted text-right font-semibold`} /></label>
          </div>

          <div className={`mt-4 grid grid-cols-3 gap-3 rounded-md border px-4 py-3 text-xs ${saldoNuevo < 0 ? "border-bad/40 bg-bad/10" : "border-line bg-muted/30"}`}>
            <div><p className={etq}>Costo real proyectado</p><p className="font-semibold text-ink">{soles(nuevoCosto / 100)}</p></div>
            <div>
              <p className={etq}>Saldo proyectado</p>
              <p className={`font-semibold ${saldoNuevo < 0 ? "text-bad" : "text-good"}`}>{soles(saldoNuevo / 100)}</p>
              {saldoNuevo < 0 && <p className="text-[10px] text-bad">Sobregiro de {soles(-saldoNuevo / 100)}</p>}
            </div>
            <div><p className={etq}>Consumo proyectado</p><BarraConsumo uso={usoNuevo} /></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {error && <span className="mr-auto text-[11px] text-bad">{error}</span>}
            {ok && !error && <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-good"><Check size={13} /> {ok}</span>}
            <Boton type="button" variante="linea" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" disabled={guardando}><Check size={13} /> {guardando ? "Guardando…" : "Guardar"}</Boton>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResumenDato({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <p className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t}</p>
      <p className="font-semibold text-ink">{v}</p>
    </div>
  );
}

/** Buscador de insumo con sugerencias del APU de la partida; admite texto libre. */
function AutoInsumo({
  value,
  insumos,
  onChange,
  onElegir,
  onEnter,
}: {
  value: string;
  insumos: InsumoApu[];
  onChange: (v: string) => void;
  onElegir: (i: InsumoApu) => void;
  onEnter: () => void;
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
      <input
        value={value}
        placeholder="Busca en el maestro o escribe libre…"
        className="h-7 w-full rounded-md border border-line bg-card px-1.5 text-[11px] outline-none focus:border-primary"
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
      <p className={`mt-1 font-mono text-lg font-bold tracking-tight ${tono}`}>{valor}</p>
    </div>
  );
}
