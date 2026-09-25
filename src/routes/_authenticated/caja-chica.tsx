import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Lock, Trash2, Upload } from "lucide-react";
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
  ].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const rendidoDe = (cajaId: string) => rendicionesDe(cajaId).reduce((s, r) => s + r.monto, 0);

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

  async function eliminarRendicion(tabla: "gastos_directos" | "gastos_generales", id: string) {
    if (!window.confirm("¿Eliminar este comprobante rendido?")) return;
    await supabase.from(tabla).delete().eq("id", id);
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

  return (
    <>
      <Encabezado
        titulo="Caja Chica"
        subtitulo="Efectivo entregado y rendición de cuentas"
        acciones={
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
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="panel rise p-4">
          <p className="label-mono">Entregado en efectivo</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight text-ink">{soles(totalEntregado)}</p>
        </div>
        <div className="panel rise p-4">
          <p className="label-mono">Rendido con comprobantes</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight text-ink">{soles(totalRendido)}</p>
        </div>
        <div className="panel rise p-4">
          <p className="label-mono">Pendiente por rendir</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-tight text-ink">
            {soles(totalEntregado - totalRendido)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{totalAbiertas} caja(s) abierta(s)</p>
        </div>
      </div>

      <Panel titulo="Nueva entrega de efectivo" className="mb-4">
        <form onSubmit={crearCaja} className="grid gap-3 p-5 sm:grid-cols-3">
          <Campo etiqueta="Obra">
            <Select
              value={form.proyecto_id}
              onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })}
              required
            >
              <option value="">Selecciona...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Líder responsable">
            <Select
              value={form.responsable_id}
              onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
              required
            >
              <option value="">Selecciona...</option>
              {trabajadoresActivos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} — {t.cargo}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Motivo de la entrega">
            <Input
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              maxLength={160}
              placeholder="Viáticos de viaje, compras de urgencia..."
            />
          </Campo>
          <Campo etiqueta="Monto entregado (S/)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.monto_entregado}
              onChange={(e) => setForm({ ...form, monto_entregado: e.target.value })}
              required
            />
          </Campo>
          <Campo etiqueta="Fecha de entrega">
            <Input
              type="date"
              value={form.fecha_entrega}
              onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Cuenta bancaria de origen">
            <Select value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {cuentasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} · {c.monedas}
                  {c.numero_cuenta ? ` · ${c.numero_cuenta}` : ""}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="N° de operación bancaria">
            <Input
              value={form.numero_operacion}
              onChange={(e) => setForm({ ...form, numero_operacion: e.target.value })}
              maxLength={30}
              placeholder="Voucher, cheque o transferencia"
              required
            />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit">Registrar entrega</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-3">{error}</p>}
        </form>
        <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted-foreground">
          El efectivo entregado aún no es costo de obra: se convierte en costo directo o gasto general recién cuando
          se rinde cada comprobante.
        </p>
      </Panel>

      <Panel titulo="Cajas chicas registradas">
        {cajas.length === 0 ? (
          <Vacio texto="Aún no hay entregas de efectivo registradas." />
        ) : (
          <div className="divide-y divide-line">
            {cajas.map((c) => {
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
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-ink/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{nombreResp(c.responsable_id)}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {nombreProy(c.proyecto_id)} · {fmtFecha(c.fecha_entrega)}
                        {c.motivo ? ` · ${c.motivo}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                      <span className="text-muted-foreground">
                        Entregado <strong className="text-ink">{soles(entregado)}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Rendido <strong className="text-ink">{soles(rendido)}</strong>
                      </span>
                      <Etiqueta tono={saldo < -0.009 ? "bad" : saldo > 0.009 ? "neutro" : "good"}>
                        {saldo < -0.009
                          ? `Reembolsar ${soles(Math.abs(saldo))}`
                          : saldo > 0.009
                            ? `Saldo ${soles(saldo)}`
                            : "Sin saldo"}
                      </Etiqueta>
                      <Etiqueta tono={c.estado === "Liquidada" ? "good" : "neutro"}>{c.estado}</Etiqueta>
                    </div>
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
        )}
      </Panel>
    </>
  );
}
