import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Fragment, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { InsigniaCategoriaGasto } from "@/components/estado-ui";
import { Building2, CalendarDays, Check, ChevronDown, ChevronRight, Info, Pencil, Plus, Search, Truck, Trash2, Upload, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useCategoriasGastoGeneral, useGastosGenerales, useProyectos, useTerceros } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { InsigniaPago, PLAZOS, condicionVacia, datosCondicion } from "@/components/CondicionPago";
import { FechaPeru } from "./gastos-directos";
import { useMantenimientos, useTraslados, useVehiculos } from "@/lib/vehiculos";

export const Route = createFileRoute("/_authenticated/gastos-generales")({
  head: () => ({
    meta: [
      { title: "Gastos Generales — ERP TELXEN" },
      { name: "description", content: "Compras indirectas y costos de oficina no vinculados a partidas, en Soles." },
      { property: "og:title", content: "Gastos Generales — ERP TELXEN" },
      { property: "og:description", content: "Costos administrativos consolidados en Soles." },
    ],
  }),
  component: GastosGenerales,
});

type Pago = {
  condicion_pago?: string;
  fecha_vencimiento?: string | null;
  estado_pago?: string;
  comprobante?: string;
  banco_id?: string | null;
};

type Cuenta = { id: string; nombre: string; monedas: string; tipo_cuenta: string; numero_cuenta: string; activo: boolean };

const formGastoVacio = () => ({
  descripcion: "",
  comprobante: "",
  proveedor_id: "",
  proyecto_id: "",
  categoria: "",
  notas: "",
  monto: "",
  moneda: "PEN",
  tipo_cambio: "3.75",
  fecha: hoy(),
  banco_id: "",
  numero_operacion: "",
  ...condicionVacia(),
});
type FormGasto = ReturnType<typeof formGastoVacio>;

function GastosGenerales() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: gastos = [] } = useGastosGenerales();
  const { data: terceros = [] } = useTerceros();
  const { data: proyectos = [] } = useProyectos();
  const { data: categorias = [] } = useCategoriasGastoGeneral();
  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return (data ?? []) as unknown as Cuenta[];
    },
  });
  const cuentasActivas = cuentas.filter((c) => c.activo);
  const { data: vehiculos = [] } = useVehiculos();
  const { data: mantVeh = [] } = useMantenimientos();
  const { data: trasVeh = [] } = useTraslados();
  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const categoriasActivas = categorias.filter((c) => c.activo);
  const [form, setForm] = useState<FormGasto>(formGastoVacio);
  const [modalGasto, setModalGasto] = useState(false);
  const [error, setError] = useState("");
  const [ambito, setAmbito] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [pestana, setPestana] = useState<"gastos" | "mantenimiento" | "combustible">("gastos");
  const gruposGastos = [
    { titulo: "Gastos indirectos", icono: Building2, items: ["gastos"] as const },
    { titulo: "Flota", icono: Truck, items: ["mantenimiento", "combustible"] as const },
  ];
  const grupoActivo = gruposGastos.find((g) => (g.items as readonly string[]).includes(pestana)) ?? gruposGastos[0];
  const ayudaCategoria = categorias.find((c) => c.nombre === form.categoria)?.descripcion ?? "";
  const [editando, setEditando] = useState<{
    id: string;
    descripcion: string;
    comprobante: string;
    monto: string;
    categoria: string;
    notas: string;
  } | null>(null);
  const nombreProv = (g: (typeof gastos)[number]) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";
  const nombreProy = (id: string | null) => (id ? (proyectos.find((p) => p.id === id)?.nombre ?? "—") : "Oficina Central");
  const nombreBanco = (id: string | null | undefined) => {
    const c = cuentas.find((x) => x.id === id);
    return c ? `${c.nombre} · ${c.monedas}` : "";
  };
  const enRango = (f: string) => (!desde || f >= desde) && (!hasta || f <= hasta);
  const gastosRango = gastos.filter((g) => enRango(g.fecha));
  const porAmbito =
    ambito === "Todas"
      ? gastosRango
      : ambito === "Oficina"
        ? gastosRango.filter((g) => !g.proyecto_id)
        : gastosRango.filter((g) => g.proyecto_id === ambito);
  const gastosFiltrados =
    filtroCategoria === "Todas" ? porAmbito : porAmbito.filter((g) => (g.categoria ?? "") === filtroCategoria);
  const gastosBusqueda = gastosFiltrados.filter((g) =>
    coincide(busqueda, g.descripcion, nombreProv(g), (g as Pago).comprobante, g.notas ?? undefined),
  );

  const totalesCategoria = categoriasActivas
    .map((c) => ({
      nombre: c.nombre,
      total: porAmbito.filter((g) => (g.categoria ?? "") === c.nombre).reduce((s, g) => s + Number(g.monto_soles), 0),
    }))
    .filter((t) => t.total > 0 || filtroCategoria === t.nombre);
  const total = gastosBusqueda.reduce((s, g) => s + Number(g.monto_soles), 0);
  const pagado = gastosBusqueda
    .filter((g) => (g as Pago).estado_pago === "Pagada")
    .reduce((s, g) => s + Number(g.monto_soles), 0);
  const porPagar = total - pagado;

  const gruposCategoria = Array.from(new Set(gastosBusqueda.map((g) => g.categoria || "Sin categoría"))).sort();

  // Egresos de flota (módulo Vehículos): mantenimiento mecánico y combustible
  const placaDe = (id: string) => vehiculos.find((v) => v.id === id)?.placa ?? "—";
  const origenDe = (x: { origen_pago: string; banco_id: string | null; numero_operacion: string }) => {
    const base = x.origen_pago === "Caja chica" ? "Caja chica" : nombreBanco(x.banco_id) || "Cuenta bancaria";
    return x.numero_operacion ? `${base} · Op. ${x.numero_operacion}` : base;
  };
  const verFlota = ambito === "Todas" || ambito === "Oficina";
  const listaMant = (verFlota ? mantVeh : [])
    .filter((m) => Number(m.costo) > 0 && enRango(m.fecha))
    .map((m) => ({
      id: m.id,
      fecha: m.fecha,
      vehiculo: placaDe(m.vehiculo_id),
      tipo: m.tipo,
      km: Number(m.km || 0),
      detalle: m.detalle || "—",
      origen: origenDe(m),
      monto: Number(m.costo),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const listaComb = trasVeh
    .filter(
      (t) =>
        Number(t.combustible_monto) > 0 &&
        enRango(t.fecha) &&
        (ambito === "Todas" || (ambito === "Oficina" ? !t.proyecto_id : t.proyecto_id === ambito)),
    )
    .map((t) => ({
      id: t.id,
      fecha: t.fecha,
      vehiculo: placaDe(t.vehiculo_id),
      ruta: `${t.origen} → ${t.destino}`,
      galones: Number(t.combustible_galones || 0),
      ambito: nombreProy(t.proyecto_id),
      origen: origenDe(t),
      monto: Number(t.combustible_monto),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const totalMant = listaMant.reduce((s, f) => s + f.monto, 0);
  const totalComb = listaComb.reduce((s, f) => s + f.monto, 0);
  const granTotal = total + totalMant + totalComb;
  const desglose = [
    ...totalesCategoria.map((t) => ({ ...t, filtrable: true })),
    ...(totalMant > 0 ? [{ nombre: "Mantenimiento vehicular", total: totalMant, filtrable: false }] : []),
    ...(totalComb > 0 ? [{ nombre: "Combustible vehicular", total: totalComb, filtrable: false }] : []),
  ].sort((a, b) => b.total - a.total);
  const maxDesglose = Math.max(0, ...desglose.map((d) => d.total));

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function alternarGrupo(nombre: string) {
    setCerrados((prev) => {
      const s = new Set(prev);
      if (s.has(nombre)) s.delete(nombre);
      else s.add(nombre);
      return s;
    });
  }

  async function guardar(): Promise<string | null> {
    if (!form.categoria) return "Selecciona la categoría del gasto general.";
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return "Ingresa un tipo de cambio válido para dólares.";
    const contado = form.condicion_pago !== "Crédito";
    if (contado && !form.banco_id) return "Elige la cuenta bancaria o Caja Chica del egreso.";
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const prov = terceros.find((t) => t.id === form.proveedor_id);
    const { error: err } = await supabase.from("gastos_generales").insert({
      descripcion: form.descripcion.trim(),
      comprobante: form.comprobante.trim(),
      proveedor: prov?.razon_social ?? "",
      proveedor_id: form.proveedor_id || null,
      proyecto_id: form.proyecto_id || null,
      categoria: form.categoria,
      monto: Number(form.monto || 0),
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: Number(form.monto || 0) * tc,
      fecha: form.fecha,
      ...datosCondicion(form, form.fecha),
      estado_pago: contado ? "Pagada" : "Pendiente",
      banco_id: contado && form.banco_id !== "caja" ? form.banco_id : null,
      numero_operacion: contado ? form.numero_operacion.trim() : "",
      fecha_pago: contado ? form.fecha : null,
    } as never);
    if (err) return err.message;
    setForm({ ...form, descripcion: "", comprobante: "", proveedor_id: "", monto: "" });
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
    return null;
  }

  async function alternarPago(g: Pago & { id: string }) {
    await supabase
      .from("gastos_generales")
      .update({ estado_pago: g.estado_pago === "Pagada" ? "Pendiente" : "Pagada" } as never)
      .eq("id", g.id);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este gasto general? Esta acción no se puede deshacer.")) return;
    await supabase.from("gastos_generales").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  function iniciarEdicion(g: (typeof gastos)[number]) {
    setEditando({
      id: g.id,
      descripcion: g.descripcion,
      comprobante: (g as Pago).comprobante ?? "",
      monto: String(g.monto),
      categoria: g.categoria ?? "",
    });
  }

  function cancelarEdicion() {
    setEditando(null);
  }

  async function actualizarEdicion(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    const monto = Number(editando.monto);
    if (monto < 0) return setError("El monto no puede ser negativo.");
    const original = gastos.find((g) => g.id === editando.id);
    if (!original) return;
    const tc = original.moneda === "USD" ? Number(original.tipo_cambio) : 1;
    const { error: err } = await supabase
      .from("gastos_generales")
      .update({
        descripcion: editando.descripcion.trim(),
        comprobante: editando.comprobante.trim(),
        categoria: editando.categoria,
        monto,
        monto_soles: monto * tc,
      } as never)
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  return (
    <>
      <Encabezado
        titulo="Gastos Generales"
        subtitulo="Compras indirectas y oficina"
        acciones={
          <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1">
            <CalendarDays size={14} className="text-muted-foreground" />
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-label="Desde"
              className="bg-transparent font-mono text-xs text-ink outline-none"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              aria-label="Hasta"
              className="bg-transparent font-mono text-xs text-ink outline-none"
            />
            {(desde || hasta) && (
              <button type="button" onClick={() => { setDesde(""); setHasta(""); }} aria-label="Limpiar fechas" className="text-muted-foreground hover:text-ink">
                <X size={13} />
              </button>
            )}
          </div>
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("gastos-generales", [
                {
                  nombre: "Gastos Generales",
                  filas: gastosBusqueda.map((g) => ({
                    Fecha: g.fecha,
                    Comprobante: (g as Pago).comprobante ?? "",
                    Descripcion: g.descripcion,
                    Categoria: g.categoria ?? "",
                    Ambito: nombreProy(g.proyecto_id),
                    Proveedor: nombreProv(g),
                    Condicion: (g as Pago).condicion_pago ?? "Contado",
                    Vencimiento: (g as Pago).fecha_vencimiento ?? "",
                    Estado: (g as Pago).estado_pago ?? "",
                    Cuenta: nombreBanco((g as Pago).banco_id),
                    Monto: Number(g.monto),
                    Moneda: g.moneda,
                    "Tipo de Cambio": Number(g.tipo_cambio),
                    "Equivalente (S/)": Number(g.monto_soles),
                  })),
                },
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {gruposGastos.map((g) => { const Icono = g.icono; return <Boton key={g.titulo} variante={g === grupoActivo ? "primario" : "linea"} onClick={() => { const primero = g.items[0]; if (primero) setPestana(primero); }}><Icono size={13} />{g.titulo}</Boton>; })}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1 overflow-x-auto border-b border-line pb-3">
        {(
          [
            ["gastos", "Gastos generales"],
            ["mantenimiento", "Mantenimiento"],
            ["combustible", "Combustible"],
          ] as const
        ).filter(([id]) => (grupoActivo?.items as readonly string[] | undefined)?.includes(id)).map(([id, txt]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPestana(id)}
            className={`whitespace-nowrap rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${pestana === id ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}
          >
            {txt}
          </button>
        ))}
      </div>

      {(
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <section className="panel rise flex flex-col justify-between p-5">
            <div>
              <p className="label-mono">Total gastos</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-ink">{soles(granTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gastos generales {soles(total)} · Flota {soles(totalMant + totalComb)}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-good/10 px-3 py-2.5">
                <p className="label-mono text-good">Pagado</p>
                <p className="font-mono text-lg font-bold text-good">{soles(pagado + totalMant + totalComb)}</p>
              </div>
              <div className={`rounded-md px-3 py-2.5 ${porPagar > 0.004 ? "bg-bad/10" : "bg-muted"}`}>
                <p className={`label-mono ${porPagar > 0.004 ? "text-bad" : ""}`}>Por pagar (crédito)</p>
                <p className={`font-mono text-lg font-bold ${porPagar > 0.004 ? "text-bad" : "text-ink"}`}>{soles(porPagar)}</p>
              </div>
            </div>
          </section>
          <section className="panel rise p-5">
            <p className="label-mono mb-3">Desglose por categoría</p>
            {desglose.length === 0 ? (
              <p className="py-4 text-center font-mono text-xs text-muted-foreground">Sin gastos en este periodo.</p>
            ) : (
              <ul className="space-y-2.5">
                {desglose.map((d) => {
                  const activo = filtroCategoria === d.nombre;
                  return (
                    <li key={d.nombre}>
                      <button
                        type="button"
                        disabled={!d.filtrable}
                        onClick={() => {
                          setPestana("gastos");
                          setFiltroCategoria(activo ? "Todas" : d.nombre);
                        }}
                        className={`w-full rounded-md px-2 py-1 text-left transition-colors ${d.filtrable ? "hover:bg-muted/60" : "cursor-default"} ${activo ? "bg-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className={`truncate ${activo ? "font-semibold text-primary" : "text-ink"}`}>{d.nombre}</span>
                          <span className="font-mono text-xs font-semibold text-ink">{soles(d.total)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${maxDesglose > 0 ? (d.total / maxDesglose) * 100 : 0}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {pestana === "mantenimiento" && (
        <Panel titulo={`Mantenimiento de flota (${listaMant.length})`} className="mb-4">
          {listaMant.length === 0 ? (
            <Vacio texto="Sin mantenimientos registrados para este ámbito." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label-mono px-3 py-2 text-left">Fecha</th>
                    <th className="label-mono px-3 py-2 text-left">Vehículo</th>
                    <th className="label-mono px-3 py-2 text-left">Tipo</th>
                    <th className="label-mono px-3 py-2 text-right">Km</th>
                    <th className="label-mono px-3 py-2 text-left">Detalle</th>
                    <th className="label-mono px-3 py-2 text-left">Pagado desde</th>
                    <th className="label-mono px-3 py-2 text-right">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {listaMant.map((f) => (
                    <tr key={f.id} className="border-b border-line/60">
                      <td className="px-3 py-2 font-mono text-sm">{fmtFecha(f.fecha)}</td>
                      <td className="px-3 py-2 font-mono text-sm font-semibold">{f.vehiculo}</td>
                      <td className="px-3 py-2 text-sm">
                        <Etiqueta tono={f.tipo === "Correctivo" ? "bad" : "good"}>{f.tipo}</Etiqueta>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm">{f.km ? f.km.toLocaleString("es-PE") : "—"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{f.detalle}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.origen}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">{soles(f.monto)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40">
                    <td className="px-3 py-2 text-sm font-semibold" colSpan={6}>
                      Total mantenimiento · se registra desde el módulo Vehículos
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-bold">{soles(totalMant)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {pestana === "combustible" && (
        <Panel titulo={`Combustible de flota (${listaComb.length})`} className="mb-4">
          {listaComb.length === 0 ? (
            <Vacio texto="Sin cargas de combustible registradas para este ámbito." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="label-mono px-3 py-2 text-left">Fecha</th>
                    <th className="label-mono px-3 py-2 text-left">Vehículo</th>
                    <th className="label-mono px-3 py-2 text-left">Ruta</th>
                    <th className="label-mono px-3 py-2 text-right">Galones</th>
                    <th className="label-mono px-3 py-2 text-left">Imputación</th>
                    <th className="label-mono px-3 py-2 text-left">Pagado desde</th>
                    <th className="label-mono px-3 py-2 text-right">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {listaComb.map((f) => (
                    <tr key={f.id} className="border-b border-line/60">
                      <td className="px-3 py-2 font-mono text-sm">{fmtFecha(f.fecha)}</td>
                      <td className="px-3 py-2 font-mono text-sm font-semibold">{f.vehiculo}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{f.ruta}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">{f.galones ? f.galones.toFixed(2) : "—"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{f.ambito}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{f.origen}</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">{soles(f.monto)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40">
                    <td className="px-3 py-2 text-sm font-semibold" colSpan={6}>
                      Total combustible · se registra desde el módulo Vehículos
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm font-bold">{soles(totalComb)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}




      {pestana === "gastos" && (
      <>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
        <Select value={ambito} onChange={(e) => setAmbito(e.target.value)} className="md:w-64">
          <option value="Todas">Todas las imputaciones</option>
          <option value="Oficina">Oficina Central (gastos de sede)</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo ? `${p.codigo} · ` : ""}
              {p.nombre}
            </option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción o proveedor..."
            className="pl-9"
          />
        </div>
        {filtroCategoria !== "Todas" && (
          <button
            type="button"
            onClick={() => setFiltroCategoria("Todas")}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-2 font-mono text-[11px] text-primary hover:bg-muted"
          >
            {filtroCategoria} <X size={12} />
          </button>
        )}
        <Boton variante="accion" onClick={() => setModalGasto(true)} className="px-4 py-2.5">
          <Plus size={14} /> Registrar Gasto
        </Boton>
      </div>
      <Panel>
        {gastosBusqueda.length === 0 ? (
          <Vacio
            texto={
              busqueda
                ? `Sin coincidencias para «${busqueda}»`
                : filtroCategoria !== "Todas"
                  ? `No hay gastos de la categoría ${filtroCategoria}.`
                  : "Aún no hay gastos generales en este ámbito y periodo."
            }
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[11%] px-5 py-2.5 font-medium">Fecha</th>
                <th className="w-[14%] px-3 py-2.5 font-medium">Comprobante</th>
                <th className="w-[35%] px-3 py-2.5 font-medium">Detalle</th>
                <th className="w-[14%] px-3 py-2.5 font-medium">Estado</th>
                <th className="w-[14%] px-3 py-2.5 text-right font-medium">Monto</th>
                <th className="w-[12%] px-5 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposCategoria.map((cat) => {
                const filas = gastosBusqueda.filter((g) => (g.categoria || "Sin categoría") === cat);
                const subtotal = filas.reduce((s, g) => s + Number(g.monto_soles), 0);
                const abierto = !cerrados.has(cat);
                return (
                  <Fragment key={cat}>
                    <tr className="border-b border-line bg-muted/40">
                      <td colSpan={6} className="px-5 py-2.5">
                        <button
                          type="button"
                          onClick={() => alternarGrupo(cat)}
                          aria-expanded={abierto}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <span className="flex items-center gap-2">
                            {abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <InsigniaCategoriaGasto valor={cat} />
                            <span className="text-[11px] text-muted-foreground">
                              {filas.length} {filas.length === 1 ? "comprobante" : "comprobantes"}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-ink">{soles(subtotal)}</span>
                        </button>
                      </td>
                    </tr>
                    {abierto &&
                      filas.map((g) =>
                        editando?.id === g.id ? (
                          <tr key={g.id} className="border-b border-line/60">
                            <td className="px-5 py-2.5">{fmtFecha(g.fecha)}</td>
                            <td className="px-3 py-2">
                              <Input
                                value={editando.comprobante}
                                onChange={(e) => setEditando({ ...editando, comprobante: e.target.value })}
                                className="py-1 text-xs"
                                maxLength={40}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={editando.descripcion}
                                onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                                className="py-1 text-xs"
                                maxLength={160}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={editando.categoria}
                                onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}
                                className="py-1 text-xs"
                              >
                                <option value="">Sin categoría</option>
                                {categoriasActivas.map((c) => (
                                  <option key={c.id} value={c.nombre}>
                                    {c.nombre}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editando.monto}
                                onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
                                className="py-1 text-xs"
                              />
                            </td>
                            <td className="px-5 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={actualizarEdicion}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                  title="Guardar"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelarEdicion}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                                  title="Cancelar"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={g.id} className="border-b border-line/60 transition-colors hover:bg-muted/30">
                            <td className="px-5 py-3 text-ink">{fmtFecha(g.fecha)}</td>
                            <td className="px-3 py-3 text-ink"><Resaltar texto={(g as Pago).comprobante || "—"} termino={busqueda}/></td>
                            <td className="px-3 py-3">
                              <div className="truncate font-sans text-sm font-semibold text-ink">
                                <Resaltar texto={g.descripcion} termino={busqueda}/>
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {nombreProy(g.proyecto_id)} | <Resaltar texto={nombreProv(g)} termino={busqueda}/>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                title={(g as Pago).condicion_pago === "Crédito" ? "Cambiar estado de pago" : undefined}
                                disabled={(g as Pago).condicion_pago !== "Crédito"}
                                onClick={() => alternarPago(g as Pago & { id: string })}
                              >
                                <Pastilla g={g as Pago} />
                              </button>
                              {nombreBanco((g as Pago).banco_id) && (
                                <div className="mt-1 truncate text-[10px] text-muted-foreground">{nombreBanco((g as Pago).banco_id)}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold text-ink">
                              {g.moneda === "USD" ? (
                                <>
                                  US$ {Number(g.monto).toFixed(2)}
                                  <div className="text-[10px] font-normal text-muted-foreground">TC {Number(g.tipo_cambio)} · {soles(Number(g.monto_soles))}</div>
                                </>
                              ) : (
                                soles(Number(g.monto))
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicion(g)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminar(g.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-bad/10 hover:text-bad"
                                  title="Eliminar"
                                  aria-label="Eliminar"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
       </Panel>
      </>
      )}

      {modalGasto && (
        <ModalGasto
          form={form}
          setForm={setForm}
          proveedores={proveedores}
          categorias={categoriasActivas}
          ayudaCategoria={ayudaCategoria}
          proyectos={proyectos}
          cuentas={cuentasActivas}
          onGuardar={guardar}
          onCerrar={() => setModalGasto(false)}
        />
      )}
    </>
  );
}

/** Ventana «Registrar gasto general»: mismo patrón que la ventana de compra de Costos Directos. */
function ModalGasto({
  form,
  setForm,
  proveedores,
  categorias,
  ayudaCategoria,
  proyectos,
  cuentas,
  onGuardar,
  onCerrar,
}: {
  form: FormGasto;
  setForm: (f: FormGasto) => void;
  proveedores: { id: string; razon_social: string }[];
  categorias: { id: string; nombre: string; descripcion: string | null }[];
  ayudaCategoria: string;
  proyectos: { id: string; nombre: string; codigo?: string | null }[];
  cuentas: Cuenta[];
  onGuardar: () => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guiaVisible, setGuiaVisible] = useState(false);
  const contado = form.condicion_pago !== "Crédito";
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);

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
    const err = await onGuardar();
    setGuardando(false);
    if (err) return setError(err);
    setOk(`Gasto registrado · ${soles(equivalente)}`);
  }

  const etq = "mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground";
  const inp = "h-9 px-2.5 text-xs";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4" onMouseDown={onCerrar}>
      <div className="panel my-8 w-full max-w-4xl overflow-hidden font-mono" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Registrar gasto general</h2>
            <p className="text-[11px] text-muted-foreground">Compra indirecta o costo de oficina no vinculado a una partida.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGuiaVisible((v) => !v)}
              aria-pressed={guiaVisible}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Info size={13} /> Guía de categorías
            </button>
            <button type="button" onClick={onCerrar} className="text-muted-foreground hover:text-ink" title="Cerrar (Esc)"><X size={16} /></button>
          </div>
        </div>

        {guiaVisible && (
          <div className="border-b border-line bg-muted/40 px-5 py-4">
            <p className="label-mono mb-2">Qué incluye cada categoría</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categorias.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 rounded-md border border-line bg-card px-3 py-2">
                  <InsigniaCategoriaGasto valor={c.nombre} />
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {c.descripcion || "Sin descripción registrada. Agrégala en Datos > Catálogos Maestros."}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={enviar} className="px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><span className={etq}>Fecha</span><FechaPeru valor={form.fecha} onChange={(v) => setForm({ ...form, fecha: v })} /></div>
            <label><span className={etq}>N° comprobante</span>
              <Input value={form.comprobante} onChange={(e) => setForm({ ...form, comprobante: e.target.value })} placeholder="F001-4520" maxLength={40} className={inp} /></label>
            <label className="sm:col-span-2"><span className={etq}>Descripción</span>
              <Input autoFocus required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={160} className={inp} /></label>
            <label className="sm:col-span-2"><span className={etq}>Categoría del gasto</span>
              <Select required value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inp}>
                <option value="">Selecciona...</option>
                {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </Select>
              {ayudaCategoria && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ayudaCategoria}</p>}
            </label>
            <label className="sm:col-span-2"><span className={etq}>Proveedor</span>
              <Select required value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })} className={inp}>
                <option value="">Selecciona...</option>
                {proveedores.map((t) => <option key={t.id} value={t.id}>{t.razon_social}</option>)}
              </Select></label>
            <label className="sm:col-span-2"><span className={etq}>Imputación (obra u oficina)</span>
              <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} className={inp}>
                <option value="">Oficina Central</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nombre}</option>)}
              </Select></label>
            <label><span className={etq}>Monto gastado</span>
              <Input required type="number" step="0.01" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className={`${inp} text-right`} /></label>
            <label><span className={etq}>Moneda</span>
              <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className={inp}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </Select></label>
            <label><span className={etq}>Tipo de cambio</span>
              <Input type="number" step="0.001" min="0" value={form.tipo_cambio} onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })} disabled={form.moneda === "PEN"} required={form.moneda === "USD"} className={`${inp} text-right`} /></label>
            <label><span className={etq}>Pago</span>
              <Select value={form.condicion_pago} onChange={(e) => setForm({ ...form, ...condicionVacia(e.target.value) })} className={inp}>
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </Select></label>
            <label><span className={etq}>{contado ? "Medio de egreso" : `Días · vence ${fmtFecha(datosCondicion(form, form.fecha).fecha_vencimiento)}`}</span>
              {contado ? (
                <Select value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })} className={inp}>
                  <option value="">Selecciona...</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.tipo_cuenta} · {c.monedas}{c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}</option>)}
                  <option value="caja">Caja Chica (efectivo)</option>
                </Select>
              ) : (
                <div className="flex gap-1.5">
                  <Select value={PLAZOS.includes(Number(form.dias_credito)) ? form.dias_credito : "otro"} onChange={(e) => e.target.value !== "otro" && setForm({ ...form, dias_credito: e.target.value })} className={inp}>
                    {PLAZOS.map((p) => <option key={p} value={String(p)}>{p} días</option>)}
                    <option value="otro">Otro</option>
                  </Select>
                  {!PLAZOS.includes(Number(form.dias_credito)) && (
                    <Input type="number" min="0" step="1" value={form.dias_credito} onChange={(e) => setForm({ ...form, dias_credito: e.target.value })} className={`${inp} w-20 text-right`} />
                  )}
                </div>
              )}</label>
            {contado && form.banco_id && form.banco_id !== "caja" && (
              <label><span className={etq}>N° de operación</span>
                <Input value={form.numero_operacion} onChange={(e) => setForm({ ...form, numero_operacion: e.target.value })} maxLength={40} className={inp} /></label>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line bg-muted/30 px-4 py-3 text-xs">
            <p className={etq}>Equivalente en soles</p>
            <p className="text-sm font-semibold text-ink">{soles(equivalente)}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {error && <span className="mr-auto text-[11px] text-bad">{error}</span>}
            {ok && !error && <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-good"><Check size={13} /> {ok}</span>}
            <Boton type="button" variante="linea" onClick={onCerrar}>Cancelar</Boton>
            <Boton type="submit" variante="accion" disabled={guardando}><Check size={13} /> {guardando ? "Guardando…" : "Guardar"}</Boton>
          </div>
        </form>
      </div>
    </div>
  );
}

function Pastilla({ g }: { g: Pago }) {
  const credito = g.condicion_pago === "Crédito";
  const pagado = g.estado_pago === "Pagada";
  const vencida = credito && !pagado && !!g.fecha_vencimiento && g.fecha_vencimiento < hoy();
  const [txt, cls] = !credito || pagado
    ? ["Pagado", "bg-good/10 text-good ring-good/20"]
    : vencida
      ? ["Vencido", "bg-bad/10 text-bad ring-bad/20"]
      : ["Crédito", "bg-warn/10 text-warn ring-warn/25"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold ring-1 ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {txt}
      {credito && !pagado && g.fecha_vencimiento && <span className="font-normal">· {fmtFecha(g.fecha_vencimiento)}</span>}
    </span>
  );
}
