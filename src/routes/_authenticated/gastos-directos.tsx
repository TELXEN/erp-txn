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

type InsumoApu = { id: string; descripcion: string; tipo: string };

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
  const { data: componentes = [] } = useQuery({
    queryKey: ["apu_insumos_compras"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("apu_componentes")
        .select("partida_id, insumo_id, insumos(id, descripcion, tipo)");
      if (err) throw err;
      return (data ?? []) as unknown as { partida_id: string; insumo_id: string | null; insumos: InsumoApu | null }[];
    },
  });
  const insumosDePartida = useMemo(() => {
    const mapa: Record<string, InsumoApu[]> = {};
    for (const c of componentes) {
      if (!c.insumos) continue;
      const lista = (mapa[c.partida_id] ??= []);
      if (!lista.some((i) => i.id === c.insumos!.id)) lista.push(c.insumos);
    }
    return mapa;
  }, [componentes]);
  const nombreInsumo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of componentes) if (c.insumos) mapa.set(c.insumos.id, c.insumos.descripcion);
    return (id?: string | null) => (id ? mapa.get(id) ?? "—" : "—");
  }, [componentes]);

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
                                        <td>{nombreInsumo(g.insumo_id)}</td>
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
                                      insumos={insumosDePartida[p.id] ?? []}
                                      proveedores={proveedores}
                                      cuentas={cuentasActivas}
                                      onCambiar={(nb) => setFilasDe(p.id, filasDe(p.id).map((x) => (x.key === b.key ? nb : x)))}
                                      onDescartar={() => {
                                        const resto = filasDe(p.id).filter((x) => x.key !== b.key);
                                        setFilasDe(p.id, resto.length ? resto : [borradorVacio()]);
                                      }}
                                      onRegistrar={async () => {
                                        const error = await registrar(p.id, b, insumosDePartida[p.id] ?? []);
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

/** Fila de captura WYSIWYG de una compra: Enter o ✓ registra, ✕ descarta. */
function FilaCompra({
  borrador: b,
  insumos,
  proveedores,
  cuentas,
  onCambiar,
  onDescartar,
  onRegistrar,
}: {
  borrador: Borrador;
  insumos: InsumoApu[];
  proveedores: Tercero[];
  cuentas: Cuenta[];
  onCambiar: (b: Borrador) => void;
  onDescartar: () => void;
  onRegistrar: () => Promise<string | null>;
}) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const contado = b.condicion_pago !== "Crédito";
  const total = Number(b.cantidad || 0) * Number(b.precio_unitario || 0);

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    const err = await onRegistrar();
    setGuardando(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={enviar} className="rounded-lg border border-dashed border-line bg-card p-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-[repeat(8,minmax(0,1fr))_auto]">
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Fecha</span>
          <Input type="date" value={b.fecha} onChange={(e) => onCambiar({ ...b, fecha: e.target.value })} className="h-7 px-1.5 text-[11px]" />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Comprobante</span>
          <Input value={b.comprobante} onChange={(e) => onCambiar({ ...b, comprobante: e.target.value })} placeholder="F001-1240" maxLength={40} className="h-7 px-1.5 text-[11px]" />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Proveedor</span>
          <Select value={b.proveedor_id} onChange={(e) => onCambiar({ ...b, proveedor_id: e.target.value })} className="h-7 px-1.5 text-[11px]">
            <option value="">Selecciona...</option>
            {proveedores.map((t) => (
              <option key={t.id} value={t.id}>{t.razon_social}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Insumo</span>
          <AutoInsumo
            value={b.insumoTexto}
            insumos={insumos}
            onChange={(v) => onCambiar({ ...b, insumoTexto: v, insumo_id: null })}
            onElegir={(i) => onCambiar({ ...b, insumoTexto: i.descripcion, insumo_id: i.id })}
            onEnter={() => void enviar()}
          />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Pago</span>
          <Select value={b.condicion_pago} onChange={(e) => onCambiar({ ...b, ...condicionVacia(e.target.value) })} className="h-7 px-1.5 text-[11px]">
            <option value="Contado">Contado</option>
            <option value="Crédito">Crédito</option>
          </Select>
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Banco</span>
          {contado ? (
            <Select value={b.banco_id} onChange={(e) => onCambiar({ ...b, banco_id: e.target.value })} className="h-7 px-1.5 text-[11px]">
              <option value="">Selecciona...</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}
                </option>
              ))}
              <option value="caja">Caja Chica (efectivo)</option>
            </Select>
          ) : (
            <Select
              value={PLAZOS.includes(Number(b.dias_credito)) ? b.dias_credito : "otro"}
              onChange={(e) => e.target.value !== "otro" && onCambiar({ ...b, dias_credito: e.target.value })}
              className="h-7 px-1.5 text-[11px]"
              title={`Vence ${fmtFecha(datosCondicion(b, b.fecha).fecha_vencimiento)}`}
            >
              {PLAZOS.map((p) => (
                <option key={p} value={String(p)}>{p} días</option>
              ))}
              <option value="otro">Otro</option>
            </Select>
          )}
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Cantidad</span>
          <Input type="number" step="0.01" min="0" value={b.cantidad} onChange={(e) => onCambiar({ ...b, cantidad: e.target.value })} className="h-7 px-1.5 text-right text-[11px]" />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">P.U. compra</span>
          <Input type="number" step="0.01" min="0" value={b.precio_unitario} onChange={(e) => onCambiar({ ...b, precio_unitario: e.target.value })} className="h-7 px-1.5 text-right text-[11px]" />
        </label>
        <div className="flex items-end gap-1 pb-0.5">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:brightness-95 disabled:opacity-50"
            title="Registrar compra (Enter)"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={onDescartar}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
            title="Descartar fila"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      {contado && b.banco_id && b.banco_id !== "caja" && (
        <div className="mt-1.5 max-w-xs">
          <Input value={b.numero_operacion} onChange={(e) => onCambiar({ ...b, numero_operacion: e.target.value })} placeholder="N° de operación" maxLength={40} className="h-7 px-1.5 text-[11px]" />
        </div>
      )}
      {!contado && !PLAZOS.includes(Number(b.dias_credito)) && (
        <div className="mt-1.5 flex max-w-xs items-center gap-2">
          <Input type="number" min="0" step="1" value={b.dias_credito} onChange={(e) => onCambiar({ ...b, dias_credito: e.target.value })} className="h-7 w-20 px-1.5 text-[11px]" />
          <span className="text-[10px] text-muted-foreground">días · vence {fmtFecha(datosCondicion(b, b.fecha).fecha_vencimiento)}</span>
        </div>
      )}
      <div className="mt-1 flex items-center gap-3">
        <span className="font-mono text-[10px] text-muted-foreground">
          Total: <strong className="text-ink">{soles(total)}</strong>
        </span>
        {error && <span className="font-mono text-[10px] text-bad">{error}</span>}
      </div>
    </form>
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
      .filter((i) => norm(i.descripcion).includes(t))
      .sort((a, b) => Number(norm(a.descripcion).startsWith(t)) - Number(norm(b.descripcion).startsWith(t)) ? -1 : 0)
      .slice(0, 8);
  }, [insumos, value]);

  return (
    <div className="relative">
      <input
        value={value}
        placeholder="Insumo del APU o libre…"
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
