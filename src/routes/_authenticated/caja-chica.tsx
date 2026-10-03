import { createFileRoute } from "@tanstack/react-router";
import { coincide, Resaltar } from "@/components/Buscador";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Info, Lock, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import {
  RUBROS_COSTO,
  useCajasChicas,
  useCategoriasGastoGeneral,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTrabajadores,
} from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { useMantenimientos, useTraslados } from "@/lib/vehiculos";

export const Route = createFileRoute("/_authenticated/caja-chica")({
  head: () => ({
    meta: [
      { title: "Caja Chica — ERP TELXEN" },
      {
        name: "description",
        content: "Entregas de efectivo a los líderes de obra y rendición de cuentas por costo directo o gasto general.",
      },
      { property: "og:title", content: "Caja Chica — ERP TELXEN" },
      { property: "og:description", content: "Control de efectivo entregado y rendido por obra, en Soles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CajaChica,
});

function CajaChica() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: cajas = [] } = useCajasChicas();
  const { data: proyectos = [] } = useProyectos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: partidas = [] } = usePartidas();
  const { data: categorias = [] } = useCategoriasGastoGeneral();
  const { data: directos = [] } = useGastosDirectos();
  const { data: generales = [] } = useGastosGenerales();
  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return data ?? [];
    },
  });
  const cuentasActivas = cuentas.filter((c) => c.activo);
  const { data: mantVeh = [] } = useMantenimientos();
  const { data: trasVeh = [] } = useTraslados();
  const nombreBanco = (id?: string | null) => {
    const c = cuentas.find((x) => x.id === id);
    return c ? `${c.nombre}${c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}` : "—";
  };

  const categoriasActivas = categorias.filter((c) => c.activo);
  const trabajadoresActivos = trabajadores.filter((t) => t.activo);

  const [form, setForm] = useState({
    proyecto_id: "",
    responsable_id: "",
    motivo: "",
    monto_entregado: "",
    fecha_entrega: hoy(),
    banco_id: "",
    numero_operacion: "",
  });
  const [busqueda, setBusqueda] = useState("");
  const [modalNueva, setModalNueva] = useState(false);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [rend, setRend] = useState({
    tipo: "Directo",
    descripcion: "",
    monto: "",
    fecha: hoy(),
    partida_id: "",
    rubro: "Materiales",
    categoria: "",
    proveedor: "",
  });
  const [errorRend, setErrorRend] = useState("");

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
  const nombreResp = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";

  const rendicionesDe = (cajaId: string) => [
    ...directos
      .filter((g) => g.caja_chica_id === cajaId)
      .map((g) => ({
        id: g.id,
        tabla: "gastos_directos" as const,
        fecha: g.fecha,
        descripcion: g.descripcion,
        destino: "Costo directo",
        detalle: `${partidas.find((p) => p.id === g.partida_id)?.nombre ?? "—"} · ${g.rubro}`,
        monto: Number(g.monto_soles),
      })),
    ...generales
      .filter((g) => g.caja_chica_id === cajaId)
      .map((g) => ({
        id: g.id,
        tabla: "gastos_generales" as const,
        fecha: g.fecha,
        descripcion: g.descripcion,
        destino: "Gasto general",
        detalle: g.categoria ?? "—",
        monto: Number(g.monto_soles),
      })),
    ...mantVeh
      .filter((m) => m.caja_chica_id === cajaId)
      .map((m) => ({
        id: m.id,
        tabla: "mantenimientos_vehiculo" as string,
        fecha: m.fecha,
        descripcion: m.detalle || "Mantenimiento de vehículo",
        destino: "Vehículos",
        detalle: `Mantenimiento ${m.tipo}`,
        monto: Number(m.costo),
      })),
    ...trasVeh
      .filter((t) => t.caja_chica_id === cajaId && Number(t.combustible_monto) > 0)
      .map((t) => ({
        id: t.id,
        tabla: "traslados_vehiculo" as string,
        fecha: t.fecha,
        descripcion: `Combustible · ${t.origen} → ${t.destino}`,
        destino: "Vehículos",
        detalle: `${t.combustible_galones} gal`,
        monto: Number(t.combustible_monto),
      })),
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const rendidoDe = (cajaId: string) => rendicionesDe(cajaId).reduce((s, r) => s + r.monto, 0);

  const cajasFiltradas = cajas.filter((c) =>
    coincide(busqueda, nombreResp(c.responsable_id), nombreProy(c.proyecto_id), c.motivo, c.numero_operacion ?? ""),
  );
  const totalEntregado = cajas.reduce((s, c) => s + Number(c.monto_entregado), 0);
  const totalRendido = cajas.reduce((s, c) => s + rendidoDe(c.id), 0);
  const totalAbiertas = cajas.filter((c) => c.estado === "Abierta").length;

  async function crearCaja(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.proyecto_id) return setError("Selecciona la obra a la que se destina el efectivo.");
    if (!form.responsable_id) return setError("Selecciona al líder responsable del efectivo.");
    if (Number(form.monto_entregado) <= 0) return setError("Ingresa el monto entregado en efectivo.");
    if (!form.banco_id) return setError("Selecciona la cuenta bancaria de la que sale el efectivo.");
    if (!form.numero_operacion.trim())
      return setError("Ingresa el N° de operación bancaria (voucher, cheque o transferencia).");
    const { error: err } = await supabase.from("cajas_chicas").insert({
      proyecto_id: form.proyecto_id,
      responsable_id: form.responsable_id,
      motivo: form.motivo.trim(),
      monto_entregado: Number(form.monto_entregado),
      fecha_entrega: form.fecha_entrega,
      banco_id: form.banco_id,
      numero_operacion: form.numero_operacion.trim(),
    });
    if (err) return setError(err.message);
    setForm({ ...form, motivo: "", monto_entregado: "", numero_operacion: "" });
    setModalNueva(false);
    qc.invalidateQueries({ queryKey: ["cajas_chicas"] });
  }

  async function registrarRendicion(e: React.FormEvent, cajaId: string, proyectoId: string) {
    e.preventDefault();
    setErrorRend("");
    const monto = Number(rend.monto || 0);
    if (monto <= 0) return setErrorRend("Ingresa el monto del comprobante.");
    if (!rend.descripcion.trim()) return setErrorRend("Describe el gasto rendido.");
    if (rend.tipo === "Directo") {
      if (!rend.partida_id) return setErrorRend("Selecciona la partida de obra a la que se imputa el gasto.");
      const { error: err } = await supabase.from("gastos_directos").insert({
        proyecto_id: proyectoId,
        partida_id: rend.partida_id,
        descripcion: rend.descripcion.trim(),
        proveedor: rend.proveedor.trim(),
        rubro: rend.rubro,
        monto,
        moneda: "PEN" as const,
        tipo_cambio: 1,
        monto_soles: monto,
        fecha: rend.fecha,
        caja_chica_id: cajaId,
      });
      if (err) return setErrorRend(err.message);
      qc.invalidateQueries({ queryKey: ["gastos_directos"] });
    } else {
      if (!rend.categoria) return setErrorRend("Selecciona la categoría del gasto general.");
      const { error: err } = await supabase.from("gastos_generales").insert({
        proyecto_id: proyectoId,
        descripcion: rend.descripcion.trim(),
        proveedor: rend.proveedor.trim(),
        categoria: rend.categoria,
        monto,
        moneda: "PEN" as const,
        tipo_cambio: 1,
        monto_soles: monto,
        fecha: rend.fecha,
        caja_chica_id: cajaId,
      });
      if (err) return setErrorRend(err.message);
      qc.invalidateQueries({ queryKey: ["gastos_generales"] });
    }
    setRend({ ...rend, descripcion: "", monto: "", proveedor: "" });
  }

  async function eliminarRendicion(tabla: string, id: string) {
    if (!window.confirm("¿Eliminar este comprobante rendido?")) return;
    await supabase.from(tabla as never).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: [tabla] });
  }

  async function liquidar(cajaId: string) {
    if (!window.confirm("¿Cerrar y liquidar esta caja chica? Ya no se podrán registrar más comprobantes."))
      return;
    await supabase
      .from("cajas_chicas")
      .update({ estado: "Liquidada", fecha_liquidacion: hoy() })
      .eq("id", cajaId);
    qc.invalidateQueries({ queryKey: ["cajas_chicas"] });
  }

  async function reabrir(cajaId: string) {
    await supabase.from("cajas_chicas").update({ estado: "Abierta", fecha_liquidacion: null }).eq("id", cajaId);
    qc.invalidateQueries({ queryKey: ["cajas_chicas"] });
  }

  async function eliminarCaja(cajaId: string) {
    if (rendidoDe(cajaId) > 0)
      return window.alert("Primero elimina los comprobantes rendidos de esta caja chica.");
    if (!window.confirm("¿Eliminar esta caja chica?")) return;
    await supabase.from("cajas_chicas").delete().eq("id", cajaId);
    qc.invalidateQueries({ queryKey: ["cajas_chicas"] });
  }

  const COLS = "grid grid-cols-[1.2fr_1.6fr_0.8fr_1fr_0.9fr_0.9fr_1fr_0.7fr] items-center gap-3";
  return (
    <>
      <Encabezado titulo="Caja Chica" subtitulo="Efectivo entregado y rendición de cuentas" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="panel rise p-5">
          <p className="label-mono">Entregado en efectivo</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-ink">{soles(totalEntregado)}</p>
        </div>
        <div className="panel rise p-5">
          <p className="label-mono">Rendido con comprobantes</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-ink">{soles(totalRendido)}</p>
        </div>
        <div className="panel rise p-5">
          <p className="label-mono">Pendiente por rendir</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-ink">
            {soles(totalEntregado - totalRendido)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{totalAbiertas} caja(s) abierta(s)</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por responsable, obra o número de operación..."
            className="h-10 w-full rounded-md border border-line bg-card pl-9 pr-3 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <Boton
          variante="linea"
          onClick={() =>
            exportarExcel("caja-chica", [
              {
                nombre: "Caja Chica",
                filas: cajas.map((c) => ({
                  "Fecha de entrega": c.fecha_entrega,
                  Obra: nombreProy(c.proyecto_id),
                  Responsable: nombreResp(c.responsable_id),
                  Motivo: c.motivo,
                  "Cuenta bancaria de origen": nombreBanco(c.banco_id),
                  "N° de operación": c.numero_operacion ?? "",
                  "Entregado (S/)": Number(c.monto_entregado),
                  "Rendido (S/)": rendidoDe(c.id),
                  "Saldo (S/)": Number(c.monto_entregado) - rendidoDe(c.id),
                  Estado: c.estado,
                  "Fecha de liquidación": c.fecha_liquidacion ?? "",
                })),
              },
            ])
          }
        >
          <Upload size={13} /> Exportar a Excel
        </Boton>
        <Boton variante="accion" onClick={() => { setError(""); setModalNueva(true); }}>
          <Plus size={14} /> Nueva Entrega de Efectivo
        </Boton>
      </div>

      {modalNueva && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalNueva(false); }}
        >
          <form onSubmit={crearCaja} className="relative mt-10 w-full max-w-2xl rounded-lg border border-line bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-base font-semibold text-ink">Nueva entrega de efectivo</h2>
              <button type="button" onClick={() => setModalNueva(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-ink" title="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-snug text-ink">
                <Info size={15} className="mt-0.5 shrink-0 text-primary" />
                <p><strong>Nota:</strong> El efectivo entregado aún no es costo de obra: se convierte en costo directo o gasto general recién cuando se rinde cada comprobante.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Obra">
                  <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {proyectos.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                  </Select>
                </Campo>
                <Campo etiqueta="Líder responsable">
                  <Select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {trabajadoresActivos.map((t) => (<option key={t.id} value={t.id}>{t.nombre} — {t.cargo}</option>))}
                  </Select>
                </Campo>
                <Campo etiqueta="Monto entregado (S/)">
                  <Input type="number" step="0.01" min="0" value={form.monto_entregado} onChange={(e) => setForm({ ...form, monto_entregado: e.target.value })} required />
                </Campo>
                <Campo etiqueta="Motivo de la entrega">
                  <Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} maxLength={160} placeholder="Viáticos de viaje, compras de urgencia..." />
                </Campo>
                <Campo etiqueta="Fecha de entrega">
                  <Input type="date" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} />
                </Campo>
                <Campo etiqueta="Cuenta bancaria de origen">
                  <Select value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {cuentasActivas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} · {c.monedas}{c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}</option>
                    ))}
                  </Select>
                </Campo>
                <div className="sm:col-span-2">
                  <Campo etiqueta="N° de operación bancaria">
                    <Input value={form.numero_operacion} onChange={(e) => setForm({ ...form, numero_operacion: e.target.value })} maxLength={30} placeholder="Voucher, cheque o transferencia" required />
                  </Campo>
                </div>
              </div>
              {error && <p className="font-mono text-xs text-bad">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <Boton type="button" variante="linea" onClick={() => setModalNueva(false)}>Cancelar</Boton>
              <Boton type="submit" variante="accion">Registrar entrega</Boton>
            </div>
          </form>
        </div>
      )}

      <Panel titulo="Cajas chicas registradas">
        {cajasFiltradas.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay entregas de efectivo registradas."} />
        ) : (
          <div className="overflow-x-auto">
          <div className="min-w-[980px] divide-y divide-line">
            <div className={`${COLS} bg-muted px-5 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground`}>
              <span>Líder responsable</span><span>Obra / Detalle</span><span>Fecha de entrega</span><span>Origen / Operación</span>
              <span className="text-right">Monto entregado</span><span className="text-right">Rendido</span><span className="text-right">Saldo</span><span className="text-center">Estado</span>
            </div>
            {cajasFiltradas.map((c) => {
              const rendido = rendidoDe(c.id);
              const entregado = Number(c.monto_entregado);
              const saldo = entregado - rendido;
              const lista = rendicionesDe(c.id);
              const expandida = abierta === c.id;
              const partidasObra = partidas.filter((p) => p.proyecto_id === c.proyecto_id);
              return (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => setAbierta(expandida ? null : c.id)}
                    className={`${COLS} w-full px-5 py-3 text-left text-sm transition-colors hover:bg-ink/5 ${expandida ? "bg-ink/5" : ""}`}
                  >
                    <span className="font-semibold text-ink"><Resaltar texto={nombreResp(c.responsable_id)} termino={busqueda} /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium uppercase text-ink"><Resaltar texto={nombreProy(c.proyecto_id)} termino={busqueda} /></span>
                      {c.motivo && <span className="block truncate text-xs text-muted-foreground"><Resaltar texto={c.motivo} termino={busqueda} /></span>}
                    </span>
                    <span className="font-mono text-xs text-ink">{fmtFecha(c.fecha_entrega)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {nombreBanco(c.banco_id)}{c.numero_operacion ? <> • Op. <Resaltar texto={c.numero_operacion} termino={busqueda} /></> : ""}
                    </span>
                    <span className="text-right font-mono text-xs text-ink">{soles(entregado)}</span>
                    <span className="text-right font-mono text-xs text-ink">{soles(rendido)}</span>
                    <span className={`text-right font-mono text-sm font-bold ${saldo < -0.009 ? "text-bad" : "text-ink"}`}>
                      {saldo < -0.009 ? `Reembolsar ${soles(Math.abs(saldo))}` : soles(saldo)}
                    </span>
                    <span className="text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.estado === "Liquidada" ? "bg-good/15 text-good" : "bg-primary/10 text-primary"}`}>
                        {c.estado}
                      </span>
                    </span>
                  </button>

                  {expandida && (
                    <div className="border-t border-line bg-muted/30 px-5 py-4">
                      {c.estado === "Abierta" ? (
                        <form
                          onSubmit={(e) => registrarRendicion(e, c.id, c.proyecto_id)}
                          className="grid gap-3 sm:grid-cols-4"
                        >
                          <Campo etiqueta="¿Qué se compró o pagó?">
                            <Input
                              value={rend.descripcion}
                              onChange={(e) => setRend({ ...rend, descripcion: e.target.value })}
                              maxLength={160}
                            />
                          </Campo>
                          <Campo etiqueta="Naturaleza del gasto">
                            <Select value={rend.tipo} onChange={(e) => setRend({ ...rend, tipo: e.target.value })}>
                              <option value="Directo">Material o servicio de obra (costo directo)</option>
                              <option value="General">Viático o administrativo (gasto general)</option>
                            </Select>
                          </Campo>
                          {rend.tipo === "Directo" ? (
                            <>
                              <Campo etiqueta="Partida de obra">
                                <Select
                                  value={rend.partida_id}
                                  onChange={(e) => setRend({ ...rend, partida_id: e.target.value })}
                                >
                                  <option value="">Selecciona...</option>
                                  {partidasObra.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.especialidad} — {p.nombre}
                                    </option>
                                  ))}
                                </Select>
                              </Campo>
                              <Campo etiqueta="Rubro del recurso">
                                <Select
                                  value={rend.rubro}
                                  onChange={(e) => setRend({ ...rend, rubro: e.target.value })}
                                >
                                  {RUBROS_COSTO.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </Select>
                              </Campo>
                            </>
                          ) : (
                            <Campo etiqueta="Categoría del gasto general">
                              <Select
                                value={rend.categoria}
                                onChange={(e) => setRend({ ...rend, categoria: e.target.value })}
                              >
                                <option value="">Selecciona...</option>
                                {categoriasActivas.map((cat) => (
                                  <option key={cat.id} value={cat.nombre}>
                                    {cat.nombre}
                                  </option>
                                ))}
                              </Select>
                            </Campo>
                          )}
                          <Campo etiqueta="Proveedor o establecimiento">
                            <Input
                              value={rend.proveedor}
                              onChange={(e) => setRend({ ...rend, proveedor: e.target.value })}
                              maxLength={120}
                            />
                          </Campo>
                          <Campo etiqueta="Monto del comprobante (S/)">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={rend.monto}
                              onChange={(e) => setRend({ ...rend, monto: e.target.value })}
                            />
                          </Campo>
                          <Campo etiqueta="Fecha">
                            <Input
                              type="date"
                              value={rend.fecha}
                              onChange={(e) => setRend({ ...rend, fecha: e.target.value })}
                            />
                          </Campo>
                          <div className="flex items-end gap-2">
                            <Boton type="submit">Rendir comprobante</Boton>
                          </div>
                          {errorRend && <p className="font-mono text-xs text-bad sm:col-span-4">{errorRend}</p>}
                        </form>
                      ) : (
                        <p className="font-mono text-xs text-muted-foreground">
                          Caja liquidada el {c.fecha_liquidacion ? fmtFecha(c.fecha_liquidacion) : "—"}.
                        </p>
                      )}

                      <div className="mt-4 overflow-hidden rounded-md border border-line bg-card">
                        {lista.length === 0 ? (
                          <Vacio texto="Sin comprobantes rendidos todavía." />
                        ) : (
                          <table className="w-full font-mono text-xs">
                            <thead>
                              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                                <th className="px-4 py-2 font-medium">Fecha</th>
                                <th className="px-3 py-2 font-medium">Detalle</th>
                                <th className="px-3 py-2 font-medium">Imputación</th>
                                <th className="px-3 py-2 text-right font-medium">Monto</th>
                                <th className="px-4 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lista.map((r) => (
                                <tr key={r.id} className="border-b border-line/60 last:border-0">
                                  <td className="px-4 py-2.5">{fmtFecha(r.fecha)}</td>
                                  <td className="px-3 py-2.5 font-semibold text-ink">{r.descripcion}</td>
                                  <td className="px-3 py-2.5 text-muted-foreground">
                                    {r.destino} · {r.detalle}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">{soles(r.monto)}</td>
                                  <td className="px-4 py-2 text-right">
                                    {c.estado === "Abierta" && (
                                      <button
                                        type="button"
                                        onClick={() => eliminarRendicion(r.tabla, r.id)}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {c.estado === "Abierta" ? (
                          <Boton variante="linea" onClick={() => liquidar(c.id)}>
                            <Lock size={13} /> Liquidar y cerrar caja
                          </Boton>
                        ) : (
                          <Boton variante="linea" onClick={() => reabrir(c.id)}>
                            Reabrir caja
                          </Boton>
                        )}
                        <Boton variante="peligro" onClick={() => eliminarCaja(c.id)}>
                          Eliminar caja
                        </Boton>
                        <span className="font-mono text-xs text-muted-foreground">
                          {saldo > 0.009
                            ? `Debe devolver a la empresa ${soles(saldo)}`
                            : saldo < -0.009
                              ? `La empresa debe reembolsar ${soles(Math.abs(saldo))}`
                              : "El efectivo está totalmente rendido"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        )}
      </Panel>
    </>
  );
}
