import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import {
  agruparPorCategoria,
  categoriasDe,
  codigoContextual,
  prefijosWBS,
  renumerarWBS,
  useCategoriasPartida,
} from "@/lib/categorias";
import { useUnidadesMedida } from "@/lib/unidades";
import { generarCodigoProyecto } from "@/lib/codificacion";
import { exportarExcel } from "@/lib/exportar";
import {
  ESTADOS_COTIZACION,
  generarCodigoCotizacion,
  previsualizarCodigoCotizacion,
  totalesCotizacion,
  useCodificacionCotizacion,
  useCotizacionItems,
  useCotizaciones,
  usePartidasMaestras,
  vigenciaHasta,
  type EstadoCotizacion,
} from "@/lib/cotizaciones";
import { ListOrdered, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cotizaciones")({
  head: () => ({
    meta: [
      { title: "Cotizaciones — ERP TELXEN" },
      {
        name: "description",
        content: "Propuestas comerciales con partidas, metrados, gastos generales y utilidad, convertibles en obra.",
      },
      { property: "og:title", content: "Cotizaciones — ERP TELXEN" },
      { property: "og:description", content: "Propuestas comerciales y conversión a obra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cotizaciones,
});

const cantidad = (n: number | string) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Cotizaciones() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: cotizaciones = [] } = useCotizaciones();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: maestras = [] } = usePartidasMaestras();
  const { data: categorias = [] } = useCategoriasPartida();
  const { data: clientes = [] } = useQuery({
    queryKey: ["terceros", "clientes-activos"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("terceros")
        .select("id, razon_social")
        .eq("es_cliente", true)
        .eq("activo", true)
        .order("razon_social");
      if (err) throw err;
      return data ?? [];
    },
  });
  const { data: codificacionCot } = useCodificacionCotizacion();

  const [seleccion, setSeleccion] = useState<string | null>(null);
  const { data: items = [] } = useCotizacionItems(seleccion);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [form, setForm] = useState({
    codigo: "",
    cliente_id: "",
    nombre: "",
    ubicacion: "",
    fecha_emision: hoy(),
    validez_dias: "15",
    pct_gastos_generales: "10",
    pct_utilidad: "10",
    condiciones: "Precios en Soles, no incluyen IGV. Forma de pago: 50% adelanto y 50% contra entrega.",
  });

  const [maestraSel, setMaestraSel] = useState("");
  const [item, setItem] = useState({
    codigo: "",
    nombre: "",
    especialidad: "",
    categoria: "",
    unidad: "glb",
    metrado: "1",
    precio_unitario: "",
  });

  /** Código contextual de la cotización: capítulo y categoría según lo ya agregado. */
  const sugerirCodigo = (especialidad: string, categoria = "") =>
    codigoContextual(especialidad, categoria, items);

  const cot = cotizaciones.find((c) => c.id === seleccion) ?? null;
  const totales = cot
    ? totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad))
    : null;

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const totalDe = (id: string) => {
    const c = cotizaciones.find((x) => x.id === id);
    if (!c || c.id !== seleccion) return null;
    return totalesCotizacion(items, Number(c.pct_gastos_generales), Number(c.pct_utilidad)).total;
  };

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    try {
      const codigo = form.codigo.trim().toUpperCase() || (await generarCodigoCotizacion());
      const cliente = clientes.find((c) => c.id === form.cliente_id);
      const { data, error: err } = await supabase
        .from("cotizaciones")
        .insert({
          codigo,
          cliente_id: form.cliente_id || null,
          cliente: cliente?.razon_social ?? "",
          nombre: form.nombre.trim(),
          ubicacion: form.ubicacion.trim(),
          fecha_emision: form.fecha_emision,
          validez_dias: Number(form.validez_dias || 0),
          pct_gastos_generales: Number(form.pct_gastos_generales || 0),
          pct_utilidad: Number(form.pct_utilidad || 0),
          condiciones: form.condiciones,
          estado: "Borrador",
        })
        .select("id")
        .single();
      if (err) {
        if (err.code === "23505") throw new Error("Ese código ya está asignado a otra cotización.");
        throw err;
      }
      setForm({ ...form, codigo: "", nombre: "", ubicacion: "" });
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setSeleccion(data.id);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear la cotización.");
    }
  }

  async function agregarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!cot) return;
    setError("");
    const { error: err } = await supabase.from("cotizacion_items").insert({
      cotizacion_id: cot.id,
      codigo: item.codigo.trim() || sugerirCodigo(item.especialidad, item.categoria),
      nombre: item.nombre.trim(),
      especialidad: item.especialidad,
      categoria: item.categoria,
      unidad: item.unidad,
      metrado: Number(item.metrado || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      orden: items.length + 1,
    });
    if (err) return setError(err.message);
    setMaestraSel("");
    setItem({ ...item, codigo: "", nombre: "", metrado: "1", precio_unitario: "" });
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
  }

  async function guardarEnBanco() {
    setError("");
    setAviso("");
    if (!item.nombre.trim()) return setError("Escribe la descripción antes de guardarla en el banco.");
    const { error: err } = await supabase.from("partidas_maestras").insert({
      codigo: "",
      nombre: item.nombre.trim(),
      especialidad: item.especialidad,
      categoria: item.categoria,
      unidad: item.unidad,
      precio_unitario: Number(item.precio_unitario || 0),
    });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
    setAviso("Partida guardada en el banco maestro.");
  }

  async function borrarItem(id: string) {
    await supabase.from("cotizacion_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cotizacion_items", seleccion] });
  }

  async function renumerarCotizacion() {
    if (!cot) return;
    const cambios = renumerarWBS(items);
    if (!cambios.length) return window.alert("La numeración de esta cotización ya está ordenada.");
    if (
      !window.confirm(
        `Se reasignarán códigos correlativos (01, 01.01, 01.01.01) a ${cambios.length} partida(s). ¿Continuar?`,
      )
    )
      return;
    setError("");
    for (const cambio of cambios) {
      const { error: err } = await supabase
        .from("cotizacion_items")
        .update({ codigo: cambio.codigo })
        .eq("id", cambio.id);
      if (err) return setError(err.message);
    }
    await qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
    setAviso("Jerarquía WBS renumerada correctamente.");
  }

  function exportarCotizacion() {
    if (!cot) return;
    const wbs = prefijosWBS(items);
    exportarExcel(`cotizacion-${cot.codigo ?? cot.id}`, [
      {
        nombre: "Partidas",
        filas: items.map((i) => ({
          "Cód. Especialidad": wbs.capitulo(i.especialidad),
          Especialidad: i.especialidad,
          "Cód. Categoría": wbs.categoria(i.especialidad, i.categoria),
          Categoría: i.categoria ?? "",
          "Cód. Partida": i.codigo,
          Partida: i.nombre,
          Unidad: i.unidad,
          Metrado: Number(i.metrado),
          "Precio Unitario (S/)": Number(i.precio_unitario),
          "Parcial (S/)": Number(i.metrado) * Number(i.precio_unitario),
        })),
      },
    ]);
  }

  async function cambiarEstado(id: string, estado: EstadoCotizacion) {
    await supabase.from("cotizaciones").update({ estado }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  }

  async function borrarCotizacion(id: string) {
    if (!window.confirm("¿Eliminar esta cotización y todas sus partidas?")) return;
    await supabase.from("cotizaciones").delete().eq("id", id);
    if (seleccion === id) setSeleccion(null);
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  }

  async function convertirEnObra() {
    if (!cot) return;
    setError("");
    setAviso("");
    if (cot.proyecto_id) return setError("Esta cotización ya generó una obra.");
    if (items.length === 0) return setError("Agrega al menos una partida antes de convertirla en obra.");
    try {
      const codigo = await generarCodigoProyecto();
      const { data: proy, error: err } = await supabase
        .from("proyectos")
        .insert({
          codigo,
          nombre: cot.nombre,
          cliente: cot.cliente,
          ubicacion: cot.ubicacion,
          estado: "En Ejecucion" as const,
          situacion: "No iniciado",
          pct_gastos_generales: Number(cot.pct_gastos_generales),
          pct_utilidad: Number(cot.pct_utilidad),
        })
        .select("id")
        .single();
      if (err) throw err;

      const { error: errP } = await supabase.from("partidas").insert(
        items.map((i) => ({
          proyecto_id: proy.id,
          codigo: i.codigo,
          nombre: i.nombre,
          especialidad: i.especialidad || "OTROS",
          categoria: i.categoria ?? "",
          unidad: i.unidad,
          metrado: Number(i.metrado),
          precio_unitario: Number(i.precio_unitario),
          presupuesto_inicial: Math.round(Number(i.metrado) * Number(i.precio_unitario) * 100) / 100,
          tipo_presupuesto: "Contractual",
        })),
      );
      if (errP) throw errP;

      await supabase
        .from("cotizaciones")
        .update({ estado: "Aprobada", proyecto_id: proy.id })
        .eq("id", cot.id);
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      qc.invalidateQueries({ queryKey: ["partidas"] });
      setAviso(`Obra ${codigo} creada con ${items.length} partidas contractuales.`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo convertir la cotización en obra.");
    }
  }

  const tonoEstado = (e: EstadoCotizacion) =>
    e === "Aprobada" ? "good" : e === "Rechazada" ? "bad" : "neutro";

  return (
    <>
      <Encabezado
        titulo="Cotizaciones"
        subtitulo="Propuestas comerciales a clientes"
        acciones={
          cot && (
            <Boton variante="linea" onClick={exportarCotizacion}>
              <Upload size={13} /> Exportar cotización
            </Boton>
          )
        }
      />

      <Panel titulo="Nueva cotización" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Código de cotización">
            <Input
              className="uppercase"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              maxLength={30}
              placeholder={codificacionCot ? previsualizarCodigoCotizacion(codificacionCot) : "Automático"}
              title="Déjalo vacío para asignar el código automático"
            />
          </Campo>
          <Campo etiqueta="Cliente">
            <Select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Trabajo a cotizar">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Fecha de emisión">
            <Input type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} />
          </Campo>
          <Campo etiqueta="Validez (días)">
            <Input type="number" min="1" value={form.validez_dias} onChange={(e) => setForm({ ...form, validez_dias: e.target.value })} />
          </Campo>
          <Campo etiqueta="% Gastos generales">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.pct_gastos_generales}
              onChange={(e) => setForm({ ...form, pct_gastos_generales: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="% Utilidad">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.pct_utilidad}
              onChange={(e) => setForm({ ...form, pct_utilidad: e.target.value })}
            />
          </Campo>
          <div className="sm:col-span-4">
            <Campo etiqueta="Condiciones comerciales">
              <Input value={form.condiciones} onChange={(e) => setForm({ ...form, condiciones: e.target.value })} maxLength={300} />
            </Campo>
          </div>
          <div className="sm:col-span-4">
            <Boton type="submit">Crear cotización</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
          {aviso && <p className="font-mono text-xs text-good sm:col-span-4">{aviso}</p>}
        </form>
      </Panel>

      <Panel titulo="Cotizaciones registradas" className="mb-4">
        {cotizaciones.length === 0 ? (
          <Vacio texto="Aún no hay cotizaciones." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Trabajo</th>
                <th className="px-3 py-2 font-medium">Emisión</th>
                <th className="px-3 py-2 font-medium">Vigente hasta</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map((c) => {
                const total = totalDe(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-line/60 last:border-0 ${c.id === seleccion ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-5 py-2.5 font-semibold text-primary">{c.codigo ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.cliente || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{c.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{fmtFecha(c.fecha_emision)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {fmtFecha(vigenciaHasta(c.fecha_emision, Number(c.validez_dias)))}
                    </td>
                    <td className="px-3 py-2.5 text-right">{total === null ? "—" : soles(total)}</td>
                    <td className="px-3 py-2.5">
                      <Etiqueta tono={tonoEstado(c.estado)}>{c.estado}</Etiqueta>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Boton variante="linea" onClick={() => setSeleccion(c.id === seleccion ? null : c.id)}>
                          {c.id === seleccion ? "Cerrar" : "Abrir"}
                        </Boton>
                        <Boton variante="peligro" onClick={() => borrarCotizacion(c.id)}>
                          Eliminar
                        </Boton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {cot && totales && (
        <Panel
          titulo={`${cot.codigo ?? "Cotización"} · ${cot.nombre}`}
          extra={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                className="w-40"
                value={cot.estado}
                onChange={(e) => cambiarEstado(cot.id, e.target.value as EstadoCotizacion)}
              >
                {ESTADOS_COTIZACION.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
              <Boton onClick={convertirEnObra} disabled={Boolean(cot.proyecto_id)}>
                {cot.proyecto_id ? "Obra generada" : "Convertir en obra"}
              </Boton>
              <Boton variante="linea" onClick={() => void renumerarCotizacion()}>
                <ListOrdered size={13} /> Renumerar WBS
              </Boton>
            </div>
          }
        >
          <div className="grid gap-3 border-b border-line bg-muted/30 p-4 sm:grid-cols-4">
            <div>
              <p className="label-mono">Costo directo</p>
              <p className="font-mono text-sm font-semibold">{soles(totales.costoDirecto)}</p>
            </div>
            <div>
              <p className="label-mono">Gastos generales ({cantidad(cot.pct_gastos_generales)}%)</p>
              <p className="font-mono text-sm font-semibold">{soles(totales.gastosGenerales)}</p>
            </div>
            <div>
              <p className="label-mono">Utilidad ({cantidad(cot.pct_utilidad)}%)</p>
              <p className="font-mono text-sm font-semibold">{soles(totales.utilidad)}</p>
            </div>
            <div>
              <p className="label-mono">Total ofertado (sin IGV)</p>
              <p className="font-mono text-sm font-semibold text-primary">{soles(totales.total)}</p>
            </div>
          </div>

          <form onSubmit={agregarItem} className="grid gap-3 border-b border-line p-5 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <Campo etiqueta="Partida del catálogo maestro">
                <Select
                  value={maestraSel}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMaestraSel(v);
                    if (v === "manual" || v === "") {
                      setItem({
                        codigo: "",
                        nombre: "",
                        especialidad: "",
                        categoria: "",
                        unidad: item.unidad,
                        metrado: "1",
                        precio_unitario: "",
                      });
                      return;
                    }
                    const m = maestras.find((x) => x.id === v);
                    if (!m) return;
                    setItem({
                      codigo: sugerirCodigo(m.especialidad, m.categoria ?? ""),
                      nombre: m.nombre,
                      especialidad: m.especialidad,
                      categoria: m.categoria ?? "",
                      unidad: m.unidad,
                      metrado: "1",
                      precio_unitario: String(m.precio_unitario ?? 0),
                    });
                  }}
                >
                  <option value="">Elige una partida del catálogo maestro...</option>
                  <option value="manual">Escribir manualmente (partida libre)</option>
                  {maestras
                    .filter((m) => m.activo)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} · {m.unidad} · {soles(Number(m.precio_unitario))}
                      </option>
                    ))}
                </Select>
              </Campo>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {maestraSel && maestraSel !== "manual"
                  ? "Descripción y clasificación vinculadas al catálogo maestro."
                  : "Campos libres: escribe la descripción y selecciona su clasificación."}
              </p>
            </div>
            <Campo etiqueta="Código">
              <Input
                value={item.codigo}
                onChange={(e) => setItem({ ...item, codigo: e.target.value })}
                maxLength={20}
                placeholder="01.01.01"
              />
            </Campo>
            <div className="sm:col-span-2">
              <Campo etiqueta="Descripción de la partida">
                <Input
                  value={item.nombre}
                  onChange={(e) => setItem({ ...item, nombre: e.target.value })}
                  required
                  maxLength={160}
                  placeholder="Escribe la descripción de la partida"
                />
              </Campo>
            </div>
            <Campo etiqueta="Especialidad">
              <Select
                value={item.especialidad}
                onChange={(e) => {
                  const especialidad = e.target.value;
                  setItem({
                    ...item,
                    especialidad,
                    categoria: "",
                    codigo: sugerirCodigo(especialidad),
                  });
                }}
              >
                <option value="">Selecciona...</option>
                {especialidades
                  .filter((e) => e.activo)
                  .map((e) => (
                    <option key={e.id} value={e.nombre}>
                      {e.nombre}
                    </option>
                  ))}
              </Select>
            </Campo>
            <Campo etiqueta="Categoría">
              <Select
                value={item.categoria}
                onChange={(e) => {
                  const categoria = e.target.value;
                  setItem({
                    ...item,
                    categoria,
                    codigo: sugerirCodigo(item.especialidad, categoria),
                  });
                }}
              >
                <option value="">Sin categoría</option>
                {categoriasDe(item.especialidad, categorias).map((c) => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Unidad">
              <Select value={item.unidad} onChange={(e) => setItem({ ...item, unidad: e.target.value })}>
                {unidades
                  .filter((u) => u.activo)
                  .map((u) => (
                    <option key={u.id} value={u.simbolo}>
                      {u.simbolo}
                    </option>
                  ))}
              </Select>
            </Campo>
            <Campo etiqueta="Metrado">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.metrado}
                onChange={(e) => setItem({ ...item, metrado: e.target.value })}
                required
              />
            </Campo>
            <Campo etiqueta="Precio unitario (S/)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.precio_unitario}
                onChange={(e) => setItem({ ...item, precio_unitario: e.target.value })}
                required
              />
            </Campo>
            <div className="flex items-end gap-3 sm:col-span-5">
              <Boton type="submit">Agregar partida</Boton>
              <Boton type="button" variante="linea" onClick={guardarEnBanco}>
                Guardar en el banco
              </Boton>
              <span className="font-mono text-xs text-muted-foreground">
                Parcial:{" "}
                <strong className="text-ink">
                  {soles(Number(item.metrado || 0) * Number(item.precio_unitario || 0))}
                </strong>
              </span>
            </div>
          </form>

          {items.length === 0 ? (
            <Vacio texto="Esta cotización todavía no tiene partidas." />
          ) : (
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Partida</th>
                  <th className="px-3 py-2 font-medium">Und.</th>
                  <th className="px-3 py-2 text-right font-medium">Metrado</th>
                  <th className="px-3 py-2 text-right font-medium">P.U. (S/)</th>
                  <th className="px-3 py-2 text-right font-medium">Parcial (S/)</th>
                  <th className="px-5 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              {agruparPorCategoria(items).map((grupo) => {
                const wbs = prefijosWBS(items);
                const subtotalEspecialidad = grupo.categorias.reduce(
                  (total, sub) =>
                    total + sub.items.reduce((s, i) => s + Number(i.metrado) * Number(i.precio_unitario), 0),
                  0,
                );
                return (
                <tbody key={grupo.especialidad}>
                  <tr className="border-b border-line/40 bg-muted/40">
                    <td className="px-5 py-2 font-semibold text-ink">{wbs.capitulo(grupo.especialidad)}</td>
                    <td colSpan={4} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink">
                      {grupo.especialidad}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">{soles(subtotalEspecialidad)}</td>
                    <td />
                  </tr>
                  {grupo.categorias.map((sub) => {
                    const subtotal = sub.items.reduce(
                      (s, i) => s + Number(i.metrado) * Number(i.precio_unitario),
                      0,
                    );
                    return (
                      <React.Fragment key={`${grupo.especialidad}-${sub.categoria}`}>
                        <tr className="bg-muted/20">
                          <td className="px-5 py-1.5 pl-8 text-[10px] font-semibold text-ink">
                            {wbs.categoria(grupo.especialidad, sub.categoria)}
                          </td>
                          <td colSpan={4} className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                            {sub.categoria}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-ink">{soles(subtotal)}</td>
                          <td />
                        </tr>
                        {sub.items.map((i) => (
                          <tr key={i.id} className="border-b border-line/60">
                            <td className="px-5 py-2.5 pl-8 text-primary">{i.codigo || "—"}</td>
                            <td className="px-3 py-2.5 font-semibold text-ink">{i.nombre}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{i.unidad}</td>
                            <td className="px-3 py-2.5 text-right">{cantidad(i.metrado)}</td>
                            <td className="px-3 py-2.5 text-right">{soles(Number(i.precio_unitario))}</td>
                            <td className="px-3 py-2.5 text-right font-semibold">
                              {soles(Number(i.metrado) * Number(i.precio_unitario))}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Boton variante="peligro" onClick={() => borrarItem(i.id)}>
                                Quitar
                              </Boton>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                );
              })}
            </table>
          )}

          <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted-foreground">
            {cot.condiciones || "Sin condiciones comerciales registradas."}
          </p>
        </Panel>
      )}
    </>
  );
}
