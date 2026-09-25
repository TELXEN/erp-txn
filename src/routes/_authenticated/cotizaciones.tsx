import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { ApuPartida } from "@/components/ApuPartida";
import { apuDb } from "@/lib/apu";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
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
import { Check, Calculator, CornerDownRight, ListOrdered, Upload, X } from "lucide-react";

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
  const { data: todasCotizaciones = [] } = useCotizaciones();
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

  const cotizaciones = todasCotizaciones.filter((c) =>
    coincide(busqueda, c.codigo, c.nombre, c.cliente, c.ubicacion),
  );

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

  const cot = todasCotizaciones.find((c) => c.id === seleccion) ?? null;
  const totales = cot
    ? totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad))
    : null;

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const totalDe = (id: string) => {
    const c = todasCotizaciones.find((x) => x.id === id);
    if (!c) return null;
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

  const [apu, setApu] = useState<(typeof items)[number] | null>(null);
  const [nuevaSub, setNuevaSub] = useState<{
    padre_id: string;
    codigo: string;
    nombre: string;
    unidad: string;
    metrado: string;
    precio_unitario: string;
  } | null>(null);

  function abrirSubpartida(padre: (typeof items)[number]) {
    setNuevaSub({
      padre_id: padre.id,
      codigo: siguienteCodigoSubpartida(padre.codigo, items.filter((x) => x.padre_id === padre.id)),
      nombre: "",
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
            <Campo etiqueta="Condiciones comerciales (notas al pie)">
              <textarea
                className="w-full rounded-md border border-line bg-card p-2 text-xs outline-none focus:border-primary"
                rows={2}
                value={form.condiciones}
                onChange={(e) => setForm({ ...form, condiciones: e.target.value })}
              />
            </Campo>
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Boton type="submit">Crear borrador</Boton>
          </div>
        </form>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel
          titulo="Listado de cotizaciones"
          className="lg:col-span-4"
          extra={<Buscador valor={busqueda} onChange={setBusqueda} total={cotizaciones.length} placeholder="Buscar cotización..." />}
        >
          {cotizaciones.length === 0 ? (
            <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay cotizaciones registradas."} />
          ) : (
            <div className="space-y-1 p-2">
              {cotizaciones.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSeleccion(c.id)}
                  className={`w-full rounded-md border p-3 text-left transition-all ${
                    seleccion === c.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-line bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-primary"><Resaltar texto={c.codigo} termino={busqueda} /></span>
                    <Etiqueta tono={tonoEstado(c.estado as EstadoCotizacion)}>{c.estado}</Etiqueta>
                  </div>
                  <p className="line-clamp-2 text-xs font-semibold text-ink"><Resaltar texto={c.nombre} termino={busqueda} /></p>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground"><Resaltar texto={c.cliente} termino={busqueda} /></p>
                  <div className="mt-2 flex items-center justify-between border-t border-line/40 pt-2 font-mono text-[10px]">
                    <span className="text-muted-foreground">{fmtFecha(c.fecha_emision)}</span>
                    <span className="font-bold text-ink">{soles(totalDe(c.id) ?? 0)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <div className="lg:col-span-8">
          {!cot ? (
            <Vacio texto="Selecciona una cotización del listado para ver su detalle y gestionar sus partidas." />
          ) : (
            <div className="space-y-4">
              {error && <p className="font-mono text-xs text-bad">{error}</p>}
              {aviso && <p className="font-mono text-xs text-good">{aviso}</p>}

              <Panel
                titulo={`Detalle: ${cot.codigo}`}
                extra={
                  <div className="flex items-center gap-2">
                    <Select
                      className="py-1 text-[10px]"
                      value={cot.estado}
                      onChange={(e) => cambiarEstado(cot.id, e.target.value as EstadoCotizacion)}
                    >
                      {ESTADOS_COTIZACION.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </Select>
                    <Boton variante="linea" onClick={convertirEnObra} deshabilitado={cot.estado === "Aprobada" || !!cot.proyecto_id}>
                      Convertir en Obra
                    </Boton>
                    <button
                      onClick={() => borrarCotizacion(cot.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                      title="Eliminar cotización"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                }
              >
                <div className="grid gap-4 border-b border-line bg-muted/20 p-4 text-[11px] sm:grid-cols-3">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Cliente</span>
                    <span className="font-semibold">{cot.cliente}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Ubicación</span>
                    <span className="font-semibold"><Resaltar texto={cot.ubicacion} termino={busqueda} /></span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Validez</span>
                    <span className="font-semibold">
                      Hasta el {fmtFecha(vigenciaHasta(cot.fecha_emision, Number(cot.validez_dias)))} ({cot.validez_dias} días)
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                    Agregar partida a la propuesta
                  </h4>
                  <form onSubmit={agregarItem} className="grid gap-3 sm:grid-cols-6">
                    <Campo etiqueta="Banco maestro">
                      <Select
                        className="py-1.5"
                        value={maestraSel}
                        onChange={(e) => {
                          const m = maestras.find((x) => x.id === e.target.value);
                          setMaestraSel(e.target.value);
                          if (m) {
                            setItem({
                              ...item,
                              nombre: m.nombre,
                              especialidad: m.especialidad || "",
                              categoria: m.categoria || "",
                              unidad: m.unidad,
                              precio_unitario: String(m.precio_unitario),
                            });
                          }
                        }}
                      >
                        <option value="">(Nueva partida libre)</option>
                        {maestras
                          .filter((m) => m.activo)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre}
                            </option>
                          ))}
                      </Select>
                    </Campo>
                    <div className="sm:col-span-2">
                      <Campo etiqueta="Descripción de partida">
                        <Input
                          value={item.nombre}
                          onChange={(e) => setItem({ ...item, nombre: e.target.value })}
                          required
                          maxLength={160}
                        />
                      </Campo>
                    </div>
                    <Campo etiqueta="Especialidad">
                      <Select
                        value={item.especialidad}
                        onChange={(e) => setItem({ ...item, especialidad: e.target.value, categoria: "" })}
                      >
                        <option value="">Otros/Varios</option>
                        {especialidades.filter((e) => e.activo).map((e) => (
                          <option key={e.id} value={e.nombre}>
                            {e.nombre}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                    <Campo etiqueta="Categoría">
                      <Select
                        value={item.categoria}
                        onChange={(e) => setItem({ ...item, categoria: e.target.value })}
                      >
                        <option value="">Sin categoría</option>
                        {categoriasDe(item.especialidad, categorias).map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                    <Campo etiqueta="Código WBS">
                      <Input
                        className="font-mono"
                        placeholder={sugerirCodigo(item.especialidad, item.categoria)}
                        value={item.codigo}
                        onChange={(e) => setItem({ ...item, codigo: e.target.value })}
                      />
                    </Campo>
                    <Campo etiqueta="Unidad">
                      <Select value={item.unidad} onChange={(e) => setItem({ ...item, unidad: e.target.value })}>
                        {unidades.filter((u) => u.activo).map((u) => (
                          <option key={u.id} value={u.simbolo}>
                            {u.simbolo}
                          </option>
                        ))}
                      </Select>
                    </Campo>
                    <Campo etiqueta="Metrado">
                      <Input
                        type="number"
                        step="any"
                        value={item.metrado}
                        onChange={(e) => setItem({ ...item, metrado: e.target.value })}
                      />
                    </Campo>
                    <Campo etiqueta="Precio Unitario (S/)">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => setItem({ ...item, precio_unitario: e.target.value })}
                      />
                    </Campo>
                    <div className="flex items-end gap-2 sm:col-span-2">
                      <Boton type="submit" className="w-full">
                        Agregar partida
                      </Boton>
                      <button
                        type="button"
                        onClick={guardarEnBanco}
                        title="Guardar esta descripción y precio en el banco maestro"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:bg-muted"
                      >
                        <Upload size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              </Panel>

              <Panel
                titulo="Cuerpo de la cotización"
                extra={
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <button
                      onClick={renumerarCotizacion}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                    >
                      <ListOrdered size={13} /> Renumerar WBS
                    </button>
                    <span className="text-muted-foreground">Total partidas: {items.length}</span>
                  </div>
                }
              >
                {items.length === 0 ? (
                  <Vacio texto="No hay partidas en esta cotización. Agrega una arriba para comenzar." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] table-fixed font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-line bg-muted/10 text-left text-[9px] uppercase tracking-wider text-muted-foreground">
                          <th className="w-[8%] px-4 py-2 font-medium">Ítem</th>
                          <th className="w-[38%] px-2 py-2 font-medium">Descripción</th>
                          <th className="w-[8%] px-2 py-2 font-medium">Unidad</th>
                          <th className="w-[10%] px-2 py-2 text-right font-medium">Metrado</th>
                          <th className="w-[12%] px-2 py-2 text-right font-medium">P. Unitario</th>
                          <th className="w-[12%] px-2 py-2 text-right font-medium">Parcial</th>
                          <th className="w-[12%] px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {agruparPorCategoria(items).map((g) => (
                          <React.Fragment key={g.titulo}>
                            <tr className="bg-muted/30 font-bold text-primary">
                              <td colSpan={7} className="px-4 py-1.5 uppercase tracking-wide">
                                {g.titulo}
                              </td>
                            </tr>
                            {ordenarJerarquia(g.items).map((i) => {
                              const esPadre = items.some((x) => x.padre_id === i.id);
                              const sangria = i.padre_id ? "pl-8" : "pl-4";
                              return (
                                <tr key={i.id} className="group border-b border-line/50 hover:bg-muted/20">
                                  <td className={`py-2 pr-2 font-bold text-muted-foreground ${sangria}`}>
                                    {i.codigo}
                                  </td>
                                  <td className="px-2 py-2 text-ink">
                                    <div className="flex items-start gap-1.5">
                                      {i.padre_id && <CornerDownRight size={10} className="mt-1 flex-shrink-0 text-muted-foreground/50" />}
                                      <span className={esPadre ? "font-bold" : ""}>{i.nombre}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-muted-foreground">{i.unidad}</td>
                                  <td className="px-2 py-2 text-right">
                                    {esPadre ? "—" : cantidad(i.metrado)}
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    {esPadre ? "—" : soles(Number(i.precio_unitario))}
                                  </td>
                                  <td className="px-2 py-2 text-right font-bold">
                                    {soles(Number(i.metrado) * Number(i.precio_unitario))}
                                  </td>
                                  <td className="px-4 py-2 text-right opacity-0 transition-opacity group-hover:opacity-100">
                                    <div className="flex justify-end gap-1.5">
                                      {!i.padre_id && (
                                        <button
                                          onClick={() => abrirSubpartida(i)}
                                          className="flex h-6 w-6 items-center justify-center rounded border border-line bg-card hover:border-primary hover:text-primary"
                                          title="Añadir subpartida"
                                        >
                                          <CornerDownRight size={12} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setApu(i)}
                                        className="flex h-6 w-6 items-center justify-center rounded border border-line bg-card hover:border-primary hover:text-primary"
                                        title="Análisis de Precios Unitarios (APU)"
                                      >
                                        <Calculator size={12} />
                                      </button>
                                      <button
                                        onClick={() => borrarItem(i.id)}
                                        className="flex h-6 w-6 items-center justify-center rounded border border-line bg-card hover:border-bad hover:text-bad"
                                        title="Quitar"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/20 bg-muted/5 font-mono text-[11px]">
                          <td colSpan={5} className="px-4 py-2 text-right font-bold uppercase tracking-wider text-muted-foreground">
                            Costo Directo Total
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-ink">
                            {soles(totales?.costoDirecto ?? 0)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="border-b border-line bg-card text-[10px]">
                          <td colSpan={5} className="px-4 py-1.5 text-right text-muted-foreground">
                            Gastos Generales ({cot.pct_gastos_generales}%)
                          </td>
                          <td className="px-2 py-1.5 text-right text-ink">
                            {soles(totales?.gastosGenerales ?? 0)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="border-b border-line bg-card text-[10px]">
                          <td colSpan={5} className="px-4 py-1.5 text-right text-muted-foreground">
                            Utilidad ({cot.pct_utilidad}%)
                          </td>
                          <td className="px-2 py-1.5 text-right text-ink">{soles(totales?.utilidad ?? 0)}</td>
                          <td></td>
                        </tr>
                        <tr className="bg-primary/5 text-xs font-bold">
                          <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-widest text-primary">
                            Total Presupuesto (Soles, sin IGV)
                          </td>
                          <td className="px-2 py-3 text-right text-primary">{soles(totales?.total ?? 0)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                {cot.condiciones && (
                  <div className="mt-4 border-t border-line p-4">
                    <h5 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Condiciones comerciales
                    </h5>
                    <p className="whitespace-pre-wrap text-[10px] text-muted-foreground">
                      {cot.condiciones}
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>

      {apu && <ApuPartida partida={apu} cotizacionId={cot?.id} onCerrar={() => setApu(null)} />}

      {nuevaSub && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <Panel titulo="Nueva subpartida" className="w-full max-w-md shadow-2xl">
            <div className="grid gap-3 p-4">
              <Campo etiqueta="Código WBS">
                <Input
                  className="font-mono"
                  value={nuevaSub.codigo}
                  onChange={(e) => setNuevaSub({ ...nuevaSub, codigo: e.target.value })}
                />
              </Campo>
              <Campo etiqueta="Descripción">
                <Input
                  value={nuevaSub.nombre}
                  onChange={(e) => setNuevaSub({ ...nuevaSub, nombre: e.target.value })}
                  autoFocus
                />
              </Campo>
              <div className="grid grid-cols-3 gap-3">
                <Campo etiqueta="Und.">
                  <Input
                    value={nuevaSub.unidad}
                    onChange={(e) => setNuevaSub({ ...nuevaSub, unidad: e.target.value })}
                  />
                </Campo>
                <Campo etiqueta="Metrado">
                  <Input
                    type="number"
                    step="any"
                    value={nuevaSub.metrado}
                    onChange={(e) => setNuevaSub({ ...nuevaSub, metrado: e.target.value })}
                  />
                </Campo>
                <Campo etiqueta="P.U. (S/)">
                  <Input
                    type="number"
                    step="0.01"
                    value={nuevaSub.precio_unitario}
                    onChange={(e) => setNuevaSub({ ...nuevaSub, precio_unitario: e.target.value })}
                  />
                </Campo>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Boton variante="linea" onClick={() => setNuevaSub(null)}>
                  Cancelar
                </Boton>
                <Boton onClick={guardarSubpartida}>Agregar subpartida</Boton>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
