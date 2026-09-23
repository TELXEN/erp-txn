import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { agruparSoloPorCategoria } from "@/lib/categorias";

type Compra = GastoDirecto & { cantidad?: number; precio_unitario?: number; comprobante?: string };

const num = (n: number) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const formVacio = (partida_id = "") => ({
  partida_id,
  proveedor_id: "",
  rubro: "Materiales" as RubroCosto,
  cantidad: "",
  precio_unitario: "",
  comprobante: "",
  moneda: "PEN",
  tipo_cambio: "3.75",
  fecha: hoy(),
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
  const [form, setForm] = useState(formVacio());
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!proyectoId && proyectos.length) setProyectoId(proyectos[0].id);
  }, [proyectos, proyectoId]);

  const proyecto = proyectos.find((p) => p.id === proyectoId);
  const partidasProy = useMemo(
    () =>
      partidas
        .filter((p) => p.proyecto_id === proyectoId)
        .sort((a, b) => (a.codigo ?? "").localeCompare(b.codigo ?? "", undefined, { numeric: true })),
    [partidas, proyectoId],
  );
  const comprasProy = gastos.filter((g) => g.proyecto_id === proyectoId);
  const costoDe = (pid: string) => comprasProy.filter((g) => g.partida_id === pid).reduce((s, g) => s + Number(g.monto_soles), 0);
  const cantDe = (pid: string) => comprasProy.filter((g) => g.partida_id === pid).reduce((s, g) => s + Number(g.cantidad ?? 0), 0);
  const presuTotal = partidasProy.reduce((s, p) => s + Number(p.presupuesto_inicial), 0);
  const costoTotal = comprasProy.reduce((s, g) => s + Number(g.monto_soles), 0);
  const consumo = presuTotal > 0 ? (costoTotal / presuTotal) * 100 : 0;
  const nombreProv = (g: Compra) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";

  const tc = form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1;
  const montoForm = Number(form.cantidad || 0) * Number(form.precio_unitario || 0);
  const partidaForm = partidas.find((p) => p.id === form.partida_id);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function abrirCompra(pid: string) {
    setForm(formVacio(pid));
    setMostrarForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!partidaForm) return setError("Selecciona una partida.");
    if (Number(form.cantidad) <= 0) return setError("La cantidad debe ser mayor a cero.");
    if (Number(form.precio_unitario) < 0) return setError("El precio unitario no puede ser negativo.");
    if (form.moneda === "USD" && tc <= 0) return setError("Ingresa un tipo de cambio válido.");
    const prov = terceros.find((t) => t.id === form.proveedor_id);
    const { error: err } = await supabase.from("gastos_directos").insert({
      proyecto_id: proyectoId,
      partida_id: form.partida_id,
      descripcion: partidaForm.nombre,
      proveedor: prov?.razon_social ?? "",
      proveedor_id: form.proveedor_id || null,
      cantidad: Number(form.cantidad),
      precio_unitario: Number(form.precio_unitario),
      comprobante: form.comprobante.trim(),
      monto: montoForm,
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: montoForm * tc,
      rubro: form.rubro,
      fecha: form.fecha,
    } as never);
    if (err) return setError(err.message);
    setAbiertas((a) => ({ ...a, [form.partida_id]: true }));
    setForm(formVacio(form.partida_id));
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
            Exportar a Excel
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

      {mostrarForm && (
        <Panel titulo="Registrar compra" className="mb-4">
          <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
            <Campo etiqueta="Partida" >
              <Select value={form.partida_id} onChange={(e) => setForm({ ...form, partida_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {partidasProy.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `[${p.codigo}] ` : ""}
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta={`Cantidad${partidaForm?.unidad ? ` (${partidaForm.unidad})` : ""}`}>
              <Input type="number" step="0.01" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
            </Campo>
            <Campo etiqueta="P.U. de compra">
              <Input type="number" step="0.01" min="0" value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} required />
            </Campo>
            <Campo etiqueta="N° comprobante">
              <Input value={form.comprobante} onChange={(e) => setForm({ ...form, comprobante: e.target.value })} placeholder="F001-1240" maxLength={40} />
            </Campo>
            <Campo etiqueta="Proveedor">
              <Select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {proveedores.map((t) => (
                  <option key={t.id} value={t.id}>{t.razon_social}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Rubro">
              <Select value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value as RubroCosto })}>
                {RUBROS_COSTO.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Moneda / T.C.">
              <div className="flex gap-2">
                <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
                  <option value="PEN">S/</option>
                  <option value="USD">US$</option>
                </Select>
                <Input type="number" step="0.001" min="0" value={form.tipo_cambio} disabled={form.moneda === "PEN"} onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })} />
              </div>
            </Campo>
            <Campo etiqueta="Fecha">
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </Campo>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
              <Boton type="submit">Registrar compra</Boton>
              <Boton type="button" variante="linea" onClick={() => setMostrarForm(false)}>Cerrar</Boton>
              <span className="font-mono text-xs text-muted-foreground">
                Costo real: {num(Number(form.cantidad || 0))} × {num(Number(form.precio_unitario || 0))}
                {form.moneda === "USD" ? ` × TC ${form.tipo_cambio}` : ""} ={" "}
                <strong className="text-ink">{soles(montoForm * tc)}</strong>
              </span>
            </div>
            {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
          </form>
        </Panel>
      )}

      <Panel
        titulo="Control por partida"
        acciones={<Boton onClick={() => abrirCompra("")} disabled={!proyecto}><Plus size={14} /> Registrar compra</Boton>}
      >
        {partidasProy.length === 0 ? (
          <Vacio texto="Esta obra aún no tiene partidas registradas." />
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
                      <td colSpan={5} className="px-5 py-1.5 label-mono">{grupo.categoria}</td>
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
                                onClick={() => setAbiertas({ ...abiertas, [p.id]: !abierta })}
                                className="inline-flex items-center gap-1 text-primary"
                                title="Ver compras"
                              >
                                {abierta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                {p.codigo || "—"}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-ink">{p.nombre}</td>
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
                              <Etiqueta tono={uso > 100 ? "malo" : uso > 85 ? "alerta" : "bueno"}>{uso.toFixed(0)}%</Etiqueta>
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
                                {compras.length === 0 ? (
                                  <p className="py-1 text-muted-foreground">Sin compras registradas.</p>
                                ) : (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="text-left text-[10px] uppercase text-muted-foreground">
                                        <th className="py-1">Fecha</th>
                                        <th>Comprobante</th>
                                        <th>Proveedor</th>
                                        <th>Rubro</th>
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
                                          <td><InsigniaRubro valor={g.rubro ?? "Materiales"} /></td>
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
                                    </tbody>
                                  </table>
                                )}
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

function Dato({ titulo, valor, tono = "text-ink" }: { titulo: string; valor: string; tono?: string }) {
  return (
    <div>
      <p className="label-mono">{titulo}</p>
      <p className={`mt-1 font-mono text-lg font-bold tracking-tight ${tono}`}>{valor}</p>
    </div>
  );
}
