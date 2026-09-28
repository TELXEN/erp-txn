import { createFileRoute, Link } from "@tanstack/react-router";
import { Buscador, Resaltar, coincide } from "@/components/Buscador";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { ApuPartida } from "@/components/ApuPartida";
import { apuDb } from "@/lib/apu";
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
  ordenarJerarquia,
  siguienteCodigoSubpartida,
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
import { Check, Calculator, CornerDownRight, ListOrdered, Upload, X, Eye, Trash2 } from "lucide-react";

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
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState({
    codigo: "",
    cliente_id: "",
    nombre: "",
    ubicacion: "",
    fecha_emision: hoy(),
    validez_dias: "15",
    pct_gastos_generales: "10",
    pct_utilidad: "10",
    condiciones: "Precios en Soles. Forma de pago: 50% adelanto y 50% contra entrega.",
    aplica_igv: "si",
  });

  const [maestraSel, setMaestraSel] = useState("");
  const [item, setItem] = useState({
    codigo: "",
    nombre: "",
    especialidad: "",
    categoria: "",
    marca: "",
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

  const [apu, setApu] = useState<(typeof items)[number] | null>(null);
  const [nuevaSub, setNuevaSub] = useState<{
    padre_id: string;
    codigo: string;
    nombre: string;
    marca: string;
    unidad: string;
    metrado: string;
    precio_unitario: string;
  } | null>(null);

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
          aplica_igv: form.aplica_igv === "si",
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
      marca: item.marca.trim(),
      unidad: item.unidad,
      metrado: Number(item.metrado || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      orden: items.length + 1,
    });
    if (err) return setError(err.message);
    setMaestraSel("");
    setItem({ ...item, codigo: "", nombre: "", marca: "", metrado: "1", precio_unitario: "" });
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
      marca: item.marca.trim(),
      unidad: item.unidad,
      precio_unitario: Number(item.precio_unitario || 0),
    });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
    setAviso("Partida guardada en el banco maestro.");
  }


  function abrirSubpartida(padre: (typeof items)[number]) {
    setNuevaSub({
      padre_id: padre.id,
      codigo: siguienteCodigoSubpartida(padre.codigo, items.filter((x) => x.padre_id === padre.id)),
      nombre: "",
      marca: padre.marca ?? "",
      unidad: padre.unidad || "glb",
      metrado: "1",
      precio_unitario: "",
    });
  }

  async function guardarSubpartida() {
    if (!cot || !nuevaSub) return;
    const padre = items.find((x) => x.id === nuevaSub.padre_id);
    if (!padre) return;
    if (!nuevaSub.nombre.trim()) return setError("Escribe la descripción de la subpartida.");
    const primera = !items.some((x) => x.padre_id === padre.id);
    const parcialPadre = Number(padre.metrado) * Number(padre.precio_unitario);
    if (
      primera &&
      parcialPadre > 0 &&
      !window.confirm(
        `"${padre.nombre}" pasará a ser partida agrupadora: su parcial será la suma de sus subpartidas y su metrado/P.U. propios (${soles(parcialPadre)}) se pondrán en cero. ¿Continuar?`,
      )
    )
      return;
    setError("");
    const { error: err } = await supabase.from("cotizacion_items").insert({
      cotizacion_id: cot.id,
      padre_id: padre.id,
      codigo: nuevaSub.codigo.trim(),
      nombre: nuevaSub.nombre.trim(),
      especialidad: padre.especialidad,
      categoria: padre.categoria ?? "",
      marca: nuevaSub.marca.trim(),
      unidad: nuevaSub.unidad,
      metrado: Number(nuevaSub.metrado || 0),
      precio_unitario: Number(nuevaSub.precio_unitario || 0),
      orden: items.length + 1,
    });
    if (err) return setError(err.message);
    if (primera) {
      await supabase.from("cotizacion_items").update({ metrado: 1, precio_unitario: 0 }).eq("id", padre.id);
    }
    setNuevaSub(null);
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
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
          Marca: i.marca || "-",
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

      const nuevosIds = new Map(items.map((i) => [i.id, crypto.randomUUID()]));
      const aFila = (i: (typeof items)[number]) => ({
          id: nuevosIds.get(i.id)!,
          padre_id: i.padre_id ? nuevosIds.get(i.padre_id) ?? null : null,
          proyecto_id: proy.id,
          codigo: i.codigo,
          nombre: i.nombre,
          especialidad: i.especialidad || "OTROS",
          categoria: i.categoria ?? "",
          marca: i.marca ?? "",
          unidad: i.unidad,
          metrado: Number(i.metrado),
          precio_unitario: Number(i.precio_unitario),
          presupuesto_inicial: Math.round(Number(i.metrado) * Number(i.precio_unitario) * 100) / 100,
          tipo_presupuesto: "Contractual",
          rendimiento: Number(i.rendimiento ?? 1),
          jornada: Number(i.jornada ?? 8),
          pct_herramientas: Number(i.pct_herramientas ?? 3),
        });
      const { error: errP } = await supabase.from("partidas").insert(items.filter((i) => !i.padre_id).map(aFila));
      if (errP) throw errP;
      const hijos = items.filter((i) => i.padre_id);
      if (hijos.length) {
        const { error: errH } = await supabase.from("partidas").insert(hijos.map(aFila));
        if (errH) throw errH;
      }
      const { data: apuCot } = await apuDb
        .from("apu_componentes")
        .select("cotizacion_item_id, insumo_id, cuadrilla, cantidad")
        .in("cotizacion_item_id", items.map((i) => i.id));
      if (apuCot?.length) {
        const { error: errA } = await apuDb.from("apu_componentes").insert(
          apuCot.map((c: { cotizacion_item_id: string; insumo_id: string; cuadrilla: number; cantidad: number }) => ({
            partida_id: nuevosIds.get(c.cotizacion_item_id),
            insumo_id: c.insumo_id,
            cuadrilla: c.cuadrilla,
            cantidad: c.cantidad,
          })),
        );
        if (errA) throw errA;
      }

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
          <div className="flex gap-2">
            {cot && (
              <Link to="/cotizacion-vista" search={{ id: cot.id }}>
                <Boton variante="linea">Vista previa comercial</Boton>
              </Link>
            )}
            {cot && (
              <Boton variante="linea" onClick={exportarCotizacion}>
                <Upload size={13} /> Exportar cotización
              </Boton>
            )}
          </div>
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
          <Campo etiqueta="IGV">
            <Select value={form.aplica_igv} onChange={(e) => setForm({ ...form, aplica_igv: e.target.value })}>
              <option value="si">Con IGV (18%)</option>
              <option value="no">Sin IGV</option>
            </Select>
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

      <Panel titulo="Cotizaciones registradas" className="mb-4" extra={<Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código, cliente o trabajo..." total={cotizaciones.filter((c) => coincide(busqueda, c.codigo, c.cliente, c.nombre, c.estado)).length} />}>
        {cotizaciones.length === 0 ? (
          <Vacio texto="Aún no hay cotizaciones." />
        ) : cotizaciones.filter((c) => coincide(busqueda, c.codigo, c.cliente, c.nombre, c.estado)).length === 0 ? (
          <Vacio texto={`Sin coincidencias para «${busqueda}».`} />
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
              {cotizaciones.filter((c) => coincide(busqueda, c.codigo, c.cliente, c.nombre, c.estado)).map((c) => {
                const total = totalDe(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-line/60 last:border-0 ${c.id === seleccion ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-5 py-2.5 font-semibold text-primary"><Resaltar texto={c.codigo ?? "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={c.cliente || "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 font-semibold text-ink"><Resaltar texto={c.nombre} termino={busqueda} /></td>
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
                        <div className="group/tip relative">
                          <Link
                            to="/cotizacion-vista"
                            search={{ id: c.id }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            aria-label="Vista previa"
                          >
                            <Eye size={15} />
                          </Link>
                          <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-background opacity-0 shadow transition-opacity group-hover/tip:opacity-100">
                            Vista previa
                          </span>
                        </div>
                        <div className="group/tip relative">
                          <button
                            type="button"
                            onClick={() => borrarCotizacion(c.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                          <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-background opacity-0 shadow transition-opacity group-hover/tip:opacity-100">
                            Eliminar
                          </span>
                        </div>
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
                className="w-36"
                value={cot.aplica_igv !== false ? "si" : "no"}
                onChange={async (e) => {
                  await supabase.from("cotizaciones").update({ aplica_igv: e.target.value === "si" }).eq("id", cot.id);
                  qc.invalidateQueries({ queryKey: ["cotizaciones"] });
                }}
              >
                <option value="si">Con IGV (18%)</option>
                <option value="no">Sin IGV</option>
              </Select>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                GG %
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  className="w-20"
                  defaultValue={Number(cot.pct_gastos_generales)}
                  onBlur={async (e) => {
                    const v = Number(e.target.value) || 0;
                    if (v === Number(cot.pct_gastos_generales)) return;
                    await supabase.from("cotizaciones").update({ pct_gastos_generales: v }).eq("id", cot.id);
                    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
                  }}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Utilidad %
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  className="w-20"
                  defaultValue={Number(cot.pct_utilidad)}
                  onBlur={async (e) => {
                    const v = Number(e.target.value) || 0;
                    if (v === Number(cot.pct_utilidad)) return;
                    await supabase.from("cotizaciones").update({ pct_utilidad: v }).eq("id", cot.id);
                    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
                  }}
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground" title="Versión de revisión que se imprime en la cotización (acepta números y letras: 01, A, 01B...)">
                Rev.
                <Input
                  key={`rev-${cot.id}-${cot.revision ?? "01"}`}
                  type="text"
                  maxLength={6}
                  className="w-16"
                  defaultValue={cot.revision ?? "01"}
                  onBlur={async (e) => {
                    const v = e.target.value.trim().toUpperCase() || "01";
                    if (v === (cot.revision ?? "01")) return;
                    await supabase.from("cotizaciones").update({ revision: v }).eq("id", cot.id);
                    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
                    qc.invalidateQueries({ queryKey: ["cotizacion"] });
                  }}
                />
              </label>
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
              <p className="label-mono">Total ofertado {cot.aplica_igv !== false ? "(inc. IGV 18%)" : "(sin IGV)"}</p>
              <p className="font-mono text-sm font-semibold text-primary">
                {soles(cot.aplica_igv !== false ? totales.total + Math.round(totales.total * 0.18 * 100) / 100 : totales.total)}
              </p>
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
                        marca: "",
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
                      marca: m.marca ?? "",
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
            <Campo etiqueta="Marca">
              <Input
                value={item.marca}
                onChange={(e) => setItem({ ...item, marca: e.target.value })}
                maxLength={60}
                placeholder="Sin marca"
              />
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
                  <th className="px-3 py-2 font-medium">Marca</th>
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
                    <td colSpan={5} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink">
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
                          <td colSpan={5} className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                            {sub.categoria}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-ink">{soles(subtotal)}</td>
                          <td />
                        </tr>
                        {ordenarJerarquia(sub.items).map(({ fila: i, nivel, agrupadora, hijos }) => {
                          const parcial = agrupadora
                            ? hijos.reduce((s, h) => s + Number(h.metrado) * Number(h.precio_unitario), 0)
                            : Number(i.metrado) * Number(i.precio_unitario);
                          const ultimoHijo =
                            nivel === 4 && sub.items.filter((x) => x.padre_id === i.padre_id).at(-1)?.id === i.id;
                          const formAqui =
                            nuevaSub &&
                            ((nivel === 4 && ultimoHijo && nuevaSub.padre_id === i.padre_id) ||
                              (nivel === 3 && !agrupadora && nuevaSub.padre_id === i.id));
                          return (
                            <React.Fragment key={i.id}>
                              <tr className={`border-b border-line/60 ${agrupadora ? "bg-muted/10" : ""}`}>
                                <td className={`px-5 py-2.5 text-primary ${nivel === 4 ? "pl-12" : "pl-8"}`}>{i.codigo || "—"}</td>
                                <td className={`px-3 py-2.5 text-ink ${nivel === 4 ? "pl-6" : "font-semibold"}`}>
                                  {nivel === 4 && <CornerDownRight size={11} className="mr-1 inline text-muted-foreground" />}
                                  {i.nombre}
                                  {agrupadora && (
                                    <span className="ml-1.5 text-[9px] uppercase text-muted-foreground">({hijos.length} subpartidas)</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{agrupadora ? "—" : i.marca || "-"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{agrupadora ? "—" : i.unidad}</td>
                                <td className="px-3 py-2.5 text-right">{agrupadora ? "—" : cantidad(i.metrado)}</td>
                                <td className="px-3 py-2.5 text-right">{agrupadora ? "—" : soles(Number(i.precio_unitario))}</td>
                                <td className="px-3 py-2.5 text-right font-semibold">{soles(parcial)}</td>
                                <td className="px-5 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {!agrupadora && (
                                      <button
                                        type="button"
                                        onClick={() => setApu(i)}
                                        title="Análisis de precios unitarios"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                      >
                                        <Calculator size={14} />
                                      </button>
                                    )}
                                    {nivel === 3 && (
                                      <button
                                        type="button"
                                        onClick={() => abrirSubpartida(i)}
                                        title="Agregar subpartida (4.° nivel)"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                      >
                                        <CornerDownRight size={14} />
                                      </button>
                                    )}
                                    <Boton variante="peligro" onClick={() => borrarItem(i.id)}>
                                      Quitar
                                    </Boton>
                                  </div>
                                </td>
                              </tr>
                              {formAqui && (
                                <tr className="border-b border-line/60 bg-primary/5">
                                  <td className="px-5 py-2 pl-12">
                                    <Input value={nuevaSub.codigo} onChange={(e) => setNuevaSub({ ...nuevaSub, codigo: e.target.value })}
                                      className="py-1 font-mono text-xs" placeholder="01.01.01.01" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input autoFocus value={nuevaSub.nombre} onChange={(e) => setNuevaSub({ ...nuevaSub, nombre: e.target.value })}
                                      className="py-1 text-xs" placeholder="Descripción de la subpartida" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input value={nuevaSub.marca} onChange={(e) => setNuevaSub({ ...nuevaSub, marca: e.target.value })}
                                      className="py-1 text-xs" placeholder="-" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input value={nuevaSub.unidad} onChange={(e) => setNuevaSub({ ...nuevaSub, unidad: e.target.value })}
                                      className="py-1 text-xs" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input type="number" step="0.01" min="0" value={nuevaSub.metrado}
                                      onChange={(e) => setNuevaSub({ ...nuevaSub, metrado: e.target.value })} className="py-1 text-right text-xs" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input type="number" step="0.01" min="0" value={nuevaSub.precio_unitario}
                                      onChange={(e) => setNuevaSub({ ...nuevaSub, precio_unitario: e.target.value })} className="py-1 text-right text-xs" />
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold">
                                    {soles(Number(nuevaSub.metrado || 0) * Number(nuevaSub.precio_unitario || 0))}
                                  </td>
                                  <td className="px-5 py-2">
                                    <div className="flex items-center justify-end gap-1">
                                      <button type="button" onClick={() => void guardarSubpartida()} title="Guardar subpartida"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                                        <Check size={14} />
                                      </button>
                                      <button type="button" onClick={() => setNuevaSub(null)} title="Cancelar"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted">
                                        <X size={14} />
                                      </button>
                                    </div>
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
                );
              })}
            </table>
          )}

          <p className="border-t border-line px-5 py-3 text-[11px] leading-snug text-muted-foreground">
            {cot.condiciones || "Sin condiciones comerciales registradas."}
          </p>
        </Panel>
      )}
      {apu && (
        <ApuPartida
          origen="cotizacion"
          partida={{ ...apu, rendimiento: Number(apu.rendimiento ?? 1), jornada: Number(apu.jornada ?? 8), pct_herramientas: Number(apu.pct_herramientas ?? 3), metrado: Number(apu.metrado ?? 0) }}
          invalidar={[["cotizacion_items", seleccion]]}
          onCerrar={() => setApu(null)}
        />
      )}
    </>
  );
}
