import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { InsigniaCategoriaGasto } from "@/components/estado-ui";
import { Check, ChevronDown, ChevronRight, Info, Pencil, Trash2, Upload, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useCategoriasGastoGeneral, useGastosGenerales, useProyectos, useTerceros } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { CamposCondicion, InsigniaPago, condicionVacia, datosCondicion } from "@/components/CondicionPago";
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
  const [form, setForm] = useState({
    descripcion: "",
    comprobante: "",
    proveedor_id: "",
    proyecto_id: "",
    categoria: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    fecha: hoy(),
    banco_id: "",
    ...condicionVacia(),
  });
  const [error, setError] = useState("");
  const [ambito, setAmbito] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [guiaVisible, setGuiaVisible] = useState(false);
  const ayudaCategoria = categorias.find((c) => c.nombre === form.categoria)?.descripcion ?? "";
  const [editando, setEditando] = useState<{
    id: string;
    descripcion: string;
    comprobante: string;
    monto: string;
    categoria: string;
  } | null>(null);
  const nombreProv = (g: (typeof gastos)[number]) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";
  const nombreProy = (id: string | null) => (id ? (proyectos.find((p) => p.id === id)?.nombre ?? "—") : "Oficina Central");
  const nombreBanco = (id: string | null | undefined) => {
    const c = cuentas.find((x) => x.id === id);
    return c ? `${c.nombre} · ${c.monedas}` : "";
  };
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);

  const porAmbito =
    ambito === "Todas"
      ? gastos
      : ambito === "Oficina"
        ? gastos.filter((g) => !g.proyecto_id)
        : gastos.filter((g) => g.proyecto_id === ambito);
  const gastosFiltrados =
    filtroCategoria === "Todas" ? porAmbito : porAmbito.filter((g) => (g.categoria ?? "") === filtroCategoria);
  const gastosBusqueda = gastosFiltrados.filter((g) =>
    coincide(busqueda, g.descripcion, nombreProv(g), (g as Pago).comprobante),
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

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function alternarGrupo(nombre: string) {
    setCerrados((prev) => {
      const s = new Set(prev);
      if (s.has(nombre)) s.delete(nombre);
      else s.add(nombre);
      return s;
    });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.categoria) return setError("Selecciona la categoría del gasto general.");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const contado = form.condicion_pago !== "Crédito";
    if (contado && !form.banco_id) return setError("Elige la cuenta bancaria o Caja Chica del egreso.");
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
      fecha_pago: contado ? form.fecha : null,
    } as never);
    if (err) return setError(err.message);
    setForm({ ...form, descripcion: "", comprobante: "", proveedor_id: "", monto: "" });
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
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

  const contado = form.condicion_pago !== "Crédito";

  return (
    <>
      <Encabezado
        titulo="Gastos Generales"
        subtitulo="Compras indirectas y oficina"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("gastos-generales", [
                {
                  nombre: "Gastos Generales",
                  filas: gastosFiltrados.map((g) => ({
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
        }
      />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <div className="min-w-[240px] flex-1">
            <Campo etiqueta="Ámbito">
              <Select value={ambito} onChange={(e) => setAmbito(e.target.value)}>
                <option value="Todas">Todas las imputaciones</option>
                <option value="Oficina">Oficina Central (gastos de sede)</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `${p.codigo} · ` : ""}
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
          <div className="grid flex-[2] gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line px-3 py-2">
              <p className="label-mono">Total gastos generales</p>
              <p className="font-mono text-lg font-bold text-ink">{soles(total)}</p>
            </div>
            <div className="rounded-md border border-line px-3 py-2">
              <p className="label-mono">Pagado</p>
              <p className="font-mono text-lg font-bold text-good">{soles(pagado)}</p>
            </div>
            <div className="rounded-md border border-line px-3 py-2">
              <p className="label-mono">Por pagar (crédito)</p>
              <p className="font-mono text-lg font-bold text-bad">{soles(porPagar)}</p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        titulo="Nuevo gasto general"
        className="mb-4"
        extra={
          <button
            type="button"
            onClick={() => setGuiaVisible((v) => !v)}
            aria-pressed={guiaVisible}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Info size={13} /> Guía de categorías
          </button>
        }
      >
        {guiaVisible && (
          <div className="border-b border-line bg-muted/40 px-5 py-4">
            <p className="label-mono mb-2">Qué incluye cada categoría</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {categoriasActivas.map((c) => (
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
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Descripción">
            <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="N° comprobante">
            <Input
              value={form.comprobante}
              onChange={(e) => setForm({ ...form, comprobante: e.target.value })}
              placeholder="F001-4520"
              maxLength={40}
            />
          </Campo>
          <Campo etiqueta="Categoría del gasto">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
              <option value="">Selecciona...</option>
              {categoriasActivas.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            {ayudaCategoria && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ayudaCategoria}</p>}
          </Campo>
          <Campo etiqueta="Proveedor">
            <Select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {proveedores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.razon_social}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Imputación (obra u oficina)">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })}>
              <option value="">Oficina Central</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} · ` : ""}
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Monto gastado">
            <Input type="number" step="0.01" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Moneda">
            <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo etiqueta="Tipo de cambio">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.tipo_cambio}
              onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })}
              disabled={form.moneda === "PEN"}
              required={form.moneda === "USD"}
            />
          </Campo>
          <Campo etiqueta="Fecha">
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <CamposCondicion valor={form} fechaBase={form.fecha} onChange={(c) => setForm({ ...form, ...c })} />
          {contado && (
            <Campo etiqueta="Medio de egreso">
              <Select value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })}>
                <option value="">Selecciona...</option>
                {cuentasActivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {c.tipo_cuenta} · {c.monedas}
                    {c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}
                  </option>
                ))}
                <option value="caja">Caja Chica (efectivo)</option>
              </Select>
            </Campo>
          )}
          <div className="sm:col-span-4 flex flex-wrap items-end gap-3">
            <Boton type="submit" variante="accion">
              Registrar gasto
            </Boton>
            <span className="pb-2 font-mono text-xs text-muted-foreground">
              Equivalente: <strong className="text-ink">{soles(equivalente)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      {totalesCategoria.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {totalesCategoria.map((t) => (
            <button
              key={t.nombre}
              type="button"
              onClick={() => setFiltroCategoria(filtroCategoria === t.nombre ? "Todas" : t.nombre)}
              aria-pressed={filtroCategoria === t.nombre}
              className={`panel rise p-4 text-left transition ${
                filtroCategoria === t.nombre ? "border-primary ring-1 ring-primary/40" : ""
              }`}
            >
              <InsigniaCategoriaGasto valor={t.nombre} />
              <p className="mt-2 font-mono text-lg font-bold tracking-tight text-ink">{soles(t.total)}</p>
            </button>
          ))}
        </div>
      )}

      <Panel
        titulo={`Gastos registrados · ${ambito === "Todas" ? "Todas las imputaciones" : ambito === "Oficina" ? "Oficina Central" : nombreProy(ambito)}`}
        extra={
          <div className="flex items-center gap-3">
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              total={gastosBusqueda.length}
              placeholder="Buscar por descripción, proveedor o comprobante..."
            />
            {filtroCategoria !== "Todas" && (
              <button
                type="button"
                onClick={() => setFiltroCategoria("Todas")}
                className="font-mono text-[11px] text-primary underline-offset-2 hover:underline"
              >
                Ver todas
              </button>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">Total: {soles(total)}</span>
          </div>
        }
      >
        {gastosBusqueda.length === 0 ? (
              <Vacio
                texto={
                  busqueda
                    ? `Sin coincidencias para «${busqueda}»`
                    : "No hay gastos registrados en este ámbito y categoría."
                }
              />
            ) : gastosFiltrados.length === 0 ? (
          <Vacio
            texto={
              filtroCategoria === "Todas"
                ? "Aún no hay gastos generales en este ámbito."
                : `No hay gastos de la categoría ${filtroCategoria}.`
            }
          />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-1/12 px-5 py-2 font-medium">Fecha</th>
                <th className="w-2/12 px-3 py-2 font-medium">Comprobante</th>
                <th className="w-3/12 px-3 py-2 font-medium">Descripción</th>
                <th className="w-2/12 px-3 py-2 font-medium">Proveedor</th>
                <th className="w-2/12 px-3 py-2 font-medium">Pago</th>
                <th className="w-2/12 px-3 py-2 text-right font-medium">Monto</th>
                <th className="w-1/12 px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gruposCategoria.map((cat) => {
                const filas = gastosFiltrados.filter((g) => (g.categoria || "Sin categoría") === cat);
                const subtotal = filas.reduce((s, g) => s + Number(g.monto_soles), 0);
                const abierto = !cerrados.has(cat);
                return (
                  <Fragment key={cat}>
                    <tr className="border-b border-line bg-muted/40">
                      <td colSpan={7} className="px-5 py-2">
                        <button
                          type="button"
                          onClick={() => alternarGrupo(cat)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <span className="flex items-center gap-2">
                            {abierto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            <InsigniaCategoriaGasto valor={cat} />
                            <span className="text-[10px] text-muted-foreground">{filas.length} comprobante(s)</span>
                          </span>
                          <span className="font-semibold text-ink">{soles(subtotal)}</span>
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
                            <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={nombreProv(g)} termino={busqueda}/></td>
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
                          <tr key={g.id} className="border-b border-line/60">
                            <td className="px-5 py-2.5">{fmtFecha(g.fecha)}</td>
                            <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={(g as Pago).comprobante || "—"} termino={busqueda}/></td>
                            <td className="px-3 py-2.5 font-semibold text-ink">
                              <Resaltar texto={g.descripcion} termino={busqueda}/>
                              {ambito === "Todas" && (
                                <div className="text-[10px] font-normal text-muted-foreground">{nombreProy(g.proyecto_id)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={nombreProv(g)} termino={busqueda}/></td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                title="Cambiar estado de pago"
                                disabled={(g as Pago).condicion_pago !== "Crédito"}
                                onClick={() => alternarPago(g as Pago & { id: string })}
                              >
                                <InsigniaPago
                                  condicion={(g as Pago).condicion_pago}
                                  vencimiento={(g as Pago).fecha_vencimiento}
                                  pagado={(g as Pago).estado_pago === "Pagada"}
                                />
                              </button>
                              {nombreBanco((g as Pago).banco_id) && (
                                <div className="mt-1 text-[10px] text-muted-foreground">{nombreBanco((g as Pago).banco_id)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {g.moneda === "USD" ? `US$ ${Number(g.monto).toFixed(2)}` : soles(Number(g.monto))}
                                <Etiqueta tono="neutro">{g.moneda === "USD" ? `TC ${Number(g.tipo_cambio)}` : "PEN"}</Etiqueta>
                              </div>
                            </td>
                            <td className="px-5 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicion(g)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminar(g.id)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
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
        )}
      </Panel>
    </>
  );
}
