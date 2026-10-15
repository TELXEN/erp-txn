import { createFileRoute, Link } from "@tanstack/react-router";
import { Buscador, Resaltar, coincide } from "@/components/Buscador";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { ApuBanco, ORIGEN_COTIZACION } from "@/components/ApuCotizacion";
import { dbBanco, useCatalogoCotizacion } from "@/lib/banco-apu";
import { AutoMaestra, CotizacionHoja } from "@/components/CotizacionHoja";
import { PanelApuCotizacion, ResumenCotizacion } from "@/components/cotizaciones/PanelApuCotizacion";
import { HojaCotizacion } from "@/components/cotizaciones/HojaCotizacion";

import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import {
  agruparPorCategoria,
  categoriasDe,
  codigoContextual,
  prefijosWBS,
  cambiosNumeracion,
  ordenarJerarquia,
  siguienteCodigoSubpartida,
  useCategoriasPartida,
} from "@/lib/categorias";
import { useUnidadesMedida } from "@/lib/unidades";
import { generarCodigoProyecto } from "@/lib/codificacion";
import { exportarExcel } from "@/lib/exportar";
import { PlantillasCotizacion } from "@/components/cotizaciones/PlantillasCotizacion";
import {
  aplicarPlantilla,
  guardarComoPlantilla,
  usePlantillasCotizacion,
  ESTADOS_COTIZACION,
  generarCodigoCotizacion,
  precioMaestroEnMoneda,
  previsualizarCodigoCotizacion,
  simboloMoneda,
  totalesCotizacion,
  useCodificacionCotizacion,
  useCotizacionItems,
  useCotizaciones,
  vigenciaHasta,
  type Cotizacion,
  type CotizacionItem,
  type EstadoCotizacion,
} from "@/lib/cotizaciones";
import { Check, Calculator, CornerDownRight, Upload, X, Eye, EyeOff, Trash2, ArrowLeft, Library, Plus, Pencil, Copy, FileText, LayoutTemplate } from "lucide-react";

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
  // Catálogo de la cotización: partidas del Banco APU con su P.U. calculado desde la receta.
  const maestras = useCatalogoCotizacion();
  const { data: categorias = [] } = useCategoriasPartida();
  const { data: clientes = [] } = useQuery({
    queryKey: ["terceros", "clientes-activos"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("terceros")
        .select("id, razon_social, numero_documento")
        .eq("es_cliente", true)
        .eq("activo", true)
        .order("razon_social");
      if (err) throw err;
      return data ?? [];
    },
  });
  const { data: codificacionCot } = useCodificacionCotizacion();
  const { data: plantillas = [] } = usePlantillasCotizacion();
  const [plantillaSel, setPlantillaSel] = useState("");

  const [seleccion, setSeleccion] = useState<string | null>(null);
  const { data: items = [] } = useCotizacionItems(seleccion);
  const { data: itemsHoja = [] } = useCotizacionItems(seleccion, true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState<"cotizaciones" | "plantillas">("cotizaciones");

  const [form, setForm] = useState({
    codigo: "",
    cliente_id: "",
    nombre: "",
    ubicacion: "",
    fecha_emision: hoy(),
    validez_dias: "15",
    pct_gastos_generales: "10",
    pct_utilidad: "10",
    condiciones: "Precios en Soles.",
    recursos_humanos: "",
    tiempo_ejecucion: "",
    condiciones_pago: "50% adelanto.\n50% contra entrega.",
    aplica_igv: "si",
  });

  const [maestraSel, setMaestraSel] = useState("");
  const [item, setItem] = useState({
    codigo: "",
    nombre: "",
    especialidad: "",
    categoria: "",
    marca: "",
    unidad: "GLB",
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

  const [partidaActiva, setPartidaActiva] = useState<string | null>(null);
  /** En edición la hoja arranca sin encabezado: solo se ve la tabla de partidas. */
  const [encabezado, setEncabezado] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("cotizaciones:encabezado") === "visible") setEncabezado(true);
  }, []);
  const alternarEncabezado = () => {
    const nuevo = !encabezado;
    setEncabezado(nuevo);
    localStorage.setItem("cotizaciones:encabezado", nuevo ? "visible" : "oculto");
  };
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

  const [pestana, setPestana] = useState<"Todas" | EstadoCotizacion | "En Obra">("Todas");
  const [verCatalogo, setVerCatalogo] = useState(false);
  const { data: totalesLista = {} } = useQuery({
    queryKey: ["cotizacion_items", "totales", cotizaciones.map((c) => `${c.id}:${c.pct_gastos_generales}:${c.pct_utilidad}`).join(",")],
    enabled: cotizaciones.length > 0,
    queryFn: async () => {
      const { data, error: err } = await supabase.from("cotizacion_items").select("cotizacion_id, metrado, precio_unitario").eq("tipo", "partida");
      if (err) throw err;
      const res: Record<string, number> = {};
      for (const c of cotizaciones) {
        const its = (data ?? []).filter((i) => i.cotizacion_id === c.id);
        res[c.id] = totalesCotizacion(its, Number(c.pct_gastos_generales), Number(c.pct_utilidad)).total;
      }
      return res;
    },
  });

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function crear() {
    setError("");
    setAviso("");
    try {
      const codigo = form.codigo.trim().toUpperCase() || (await generarCodigoCotizacion());
      const cliente = clientes.find((c) => c.id === form.cliente_id);
      const pl = plantillas.find((p) => p.id === plantillaSel);
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
          condiciones: form.condiciones.trim(),
          recursos_humanos: form.recursos_humanos.trim(),
          tiempo_ejecucion: form.tiempo_ejecucion.trim(),
          condiciones_pago: form.condiciones_pago.trim(),
          aplica_igv: form.aplica_igv === "si",
          estado: "Borrador",
          ...(pl
            ? {
                nombre: form.nombre.trim() || pl.nombre,
                pct_gastos_generales: pl.pct_gastos_generales,
                pct_utilidad: pl.pct_utilidad,
                condiciones: pl.condiciones || form.condiciones.trim(),
                condiciones_pago: pl.condiciones_pago || form.condiciones_pago.trim(),
                recursos_humanos: pl.recursos_humanos,
                tiempo_ejecucion: pl.tiempo_ejecucion,
                multidisciplinaria: pl.multidisciplinaria,
                alcance: pl.alcance,
              }
            : {}),
        } as never)
        .select("id")
        .single();
      if (!err && pl) await aplicarPlantilla(pl.id, data.id);
      if (err) {
        if (err.code === "23505") throw new Error("Ese código ya está asignado a otra cotización.");
        throw err;
      }
      setVerCatalogo(false);
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
      partida_apu_id: maestraSel && maestraSel !== "manual" ? maestraSel : null,
    });
    if (err) return setError(err.message);
    setMaestraSel("");
    setItem({ ...item, codigo: "", nombre: "", marca: "", metrado: "1", precio_unitario: "" });
    qc.invalidateQueries({ queryKey: ["cotizacion_items", cot.id] });
  }

  function cargarMaestraEnFormulario(m: { id: string; codigo: string; nombre: string; especialidad: string; categoria?: string; marca?: string; unidad: string; precio_unitario: number }, metrado: string) {
    if (!cot) return;
    setError("");
    try {
      setMaestraSel(m.id);
      setItem({
        codigo: sugerirCodigo(m.especialidad, m.categoria ?? ""),
        nombre: m.nombre,
        especialidad: m.especialidad,
        categoria: m.categoria ?? "",
        marca: m.marca ?? "",
        unidad: m.unidad,
        metrado,
        precio_unitario: String(precioMaestroEnMoneda(m.precio_unitario, cot.moneda, cot.tipo_cambio)),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo convertir el precio de la partida.");
    }
  }

  async function guardarEnBanco() {
    setError("");
    setAviso("");
    if (!item.nombre.trim()) return setError("Escribe la descripción antes de guardarla en el banco.");
    const { error: err } = await dbBanco.from("partidas_apu").insert({
      codigo_jerarquico: "",
      descripcion: item.nombre.trim(),
      especialidad: item.especialidad,
      unidad: item.unidad,
      rendimiento_diario: 1,
      estado: "activo",
    });
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["banco_apu"] });
    setAviso("Partida guardada en el Banco APU. Define su receta en Datos APU.");
  }


  function abrirSubpartida(padre: (typeof items)[number]) {
    setNuevaSub({
      padre_id: padre.id,
      codigo: siguienteCodigoSubpartida(padre.codigo, items.filter((x) => x.padre_id === padre.id)),
      nombre: "",
      marca: padre.marca ?? "",
      unidad: padre.unidad || "GLB",
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
    // Orden estable: primero el orden guardado y, en empates, el código actual.
    const cambios = cambiosNumeracion(itemsHoja, Boolean(cot.multidisciplinaria));
    if (!cambios.length) return window.alert("La numeración de esta cotización ya está ordenada.");
    if (
      !window.confirm(
        `Se reasignarán códigos correlativos (01 especialidad, 01.01 grupo, 01.01.01 categoría, 01.01.01.01 partida) a ${cambios.length} fila(s). ¿Continuar?`,
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
          [`Precio Unitario (${simboloMoneda(cot.moneda)})`]: Number(i.precio_unitario),
          [`Parcial (${simboloMoneda(cot.moneda)})`]: Number(i.metrado) * Number(i.precio_unitario),
        })),
      },
    ]);
  }

  async function cambiarEstado(id: string, estado: EstadoCotizacion) {
    await supabase.from("cotizaciones").update({ estado }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  }

  async function duplicar(c: Cotizacion) {
    setError("");
    setAviso("");
    try {
      const codigo = await generarCodigoCotizacion();
      const cliente = clientes.find((cl) => cl.id === c.cliente_id);
      const { data: nueva, error: errC } = await supabase
        .from("cotizaciones")
        .insert({
          codigo,
          cliente_id: c.cliente_id ?? null,
          cliente: cliente?.razon_social ?? c.cliente,
          nombre: c.nombre,
          ubicacion: c.ubicacion,
          fecha_emision: hoy(),
          validez_dias: c.validez_dias,
          pct_gastos_generales: c.pct_gastos_generales,
          pct_utilidad: c.pct_utilidad,
          condiciones: c.condiciones,
          recursos_humanos: c.recursos_humanos ?? "",
          tiempo_ejecucion: c.tiempo_ejecucion ?? "",
          condiciones_pago: c.condiciones_pago ?? "",
          aplica_igv: c.aplica_igv ?? true,
          moneda: c.moneda,
          tipo_cambio: c.tipo_cambio,
          orientacion: c.orientacion ?? "vertical",
          multidisciplinaria: c.multidisciplinaria ?? false,
          alcance: c.alcance ?? "ambos",
          estado: "Borrador",
        } as never)
        .select("id")
        .single();
      if (errC) throw errC;
      const { data: orig, error: errI } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", c.id)
        .order("orden");
      if (errI) throw errI;
      const mapa = new Map<string, string>();
      let pendientes = [...(orig ?? [])];
      while (pendientes.length) {
        const listos = pendientes.filter((i) => !i.padre_id || mapa.has(i.padre_id));
        if (!listos.length) break;
        const { data: nuevas, error: errN } = await supabase
          .from("cotizacion_items")
          .insert(
            listos.map((i) => ({
              cotizacion_id: nueva.id,
              padre_id: i.padre_id ? (mapa.get(i.padre_id) ?? null) : null,
              tipo: i.tipo,
              codigo: i.codigo,
              nombre: i.nombre,
              especialidad: i.especialidad,
              grupo: (i as { grupo?: string }).grupo ?? "",
              categoria: i.categoria,
              marca: i.marca,
              unidad: i.unidad,
              metrado: i.metrado,
              precio_unitario: i.precio_unitario,
              rendimiento: i.rendimiento,
              jornada: i.jornada,
              pct_herramientas: i.pct_herramientas,
              orden: i.orden,
            })),
          )
          .select("id");
        if (errN) throw errN;
        if (!nuevas) throw new Error("No se pudieron copiar las partidas.");
        (listos as CotizacionItem[]).forEach((i, idx) => {
          const nuevoId = nuevas[idx]?.id;
          if (nuevoId) mapa.set(i.id, nuevoId);
        });
        pendientes = pendientes.filter((i) => !mapa.has(i.id));
      }
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      qc.invalidateQueries({ queryKey: ["cotizacion_items", nueva.id] });
      setAviso(`Copia creada: ${codigo}.`);
      setSeleccion(nueva.id);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo duplicar la cotización.");
    }
  }

  async function guardarPlantilla() {
    if (!cot) return;
    const lista = plantillas.map((p, i) => `${i + 1}. ${p.nombre}`).join("\n");
    const r = window.prompt(`Escribe el número de la plantilla a reemplazar o un nombre nuevo:\n${lista}`, "");
    if (!r?.trim()) return;
    const n = Number(r.trim());
    const existente = Number.isInteger(n) && n >= 1 && n <= plantillas.length ? plantillas[n - 1] : null;
    if (existente && !window.confirm(`Se reemplazarán las partidas de la plantilla «${existente.nombre}». ¿Continuar?`)) return;
    try {
      await guardarComoPlantilla(cot, existente?.id ?? null, r.trim());
      qc.invalidateQueries({ queryKey: ["plantillas_cotizacion"] });
      setAviso(`Plantilla «${existente?.nombre ?? r.trim()}» guardada.`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo guardar la plantilla.");
    }
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
          partida_apu_id: (i as { partida_apu_id?: string | null }).partida_apu_id ?? null,
        });
      const { error: errP } = await supabase.from("partidas").insert(items.filter((i) => !i.padre_id).map(aFila));
      if (errP) throw errP;
      const hijos = items.filter((i) => i.padre_id);
      if (hijos.length) {
        const { error: errH } = await supabase.from("partidas").insert(hijos.map(aFila));
        if (errH) throw errH;
      }
      const { data: apuCot } = await dbBanco
        .from("cotizacion_apu_detalle")
        .select("cotizacion_item_id, material_id, mano_obra_id, equipo_id, subcontrato_id, cantidad_o_cuadrilla")
        .in("cotizacion_item_id", items.map((i) => i.id));
      if (apuCot?.length) {
        const { error: errA } = await dbBanco.from("partida_detalle").insert(
          apuCot.map((c: { cotizacion_item_id: string; material_id: string | null; mano_obra_id: string | null; equipo_id: string | null; subcontrato_id: string | null; cantidad_o_cuadrilla: number }) => ({
            partida_obra_id: nuevosIds.get(c.cotizacion_item_id),
            material_id: c.material_id,
            mano_obra_id: c.mano_obra_id,
            equipo_id: c.equipo_id,
            subcontrato_id: c.subcontrato_id,
            cantidad_o_cuadrilla: c.cantidad_o_cuadrilla,
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

  const hoyStr = hoy();
  const mesActual = hoyStr.slice(0, 7);
  const diasRestantes = (c: (typeof cotizaciones)[number]) =>
    Math.round((new Date(`${vigenciaHasta(c.fecha_emision, Number(c.validez_dias))}T00:00:00`).getTime() - new Date(`${hoyStr}T00:00:00`).getTime()) / 86400000);
  const total = (id: string) => totalesLista[id] ?? 0;
  const filtradas = cotizaciones
    .filter((c) => coincide(busqueda, c.codigo, c.cliente, c.nombre, c.estado))
    .filter((c) => pestana === "Todas" || (pestana === "En Obra" ? Boolean(c.proyecto_id) : c.estado === pestana));
  const kpiMes = cotizaciones.filter((c) => c.fecha_emision.startsWith(mesActual)).reduce((s, c) => s + total(c.id), 0);
  const kpiAprob = cotizaciones.filter((c) => c.estado === "Aprobada");
  const kpiPend = cotizaciones.filter((c) => c.estado === "Enviada" || c.estado === "Borrador");
  const PESTANAS = ["Todas", ...ESTADOS_COTIZACION, "En Obra"] as const;

  const Vigencia = ({ c }: { c: (typeof cotizaciones)[number] }) => {
    if (c.estado === "Aprobada" || c.estado === "Rechazada" || c.proyecto_id) return null;
    const d = diasRestantes(c);
    if (d < 0) return <Etiqueta tono="bad">Vencida</Etiqueta>;
    if (d <= 5) return <Etiqueta tono="bad">Vence en {d} d</Etiqueta>;
    return null;
  };

  /* ---------------- MODO EDITOR ---------------- */
  if (cot && totales) {
    return (
      <div className="-mx-4 -mb-6 flex h-[calc(100%+1.5rem)] min-h-full flex-col bg-background sm:-mx-6">
        <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-background px-4 py-2 sm:px-6">
          <Boton variante="linea" onClick={() => { setSeleccion(null); setError(""); setAviso(""); }}>
            <ArrowLeft size={13} /> Volver al listado
          </Boton>
          <span className="font-mono text-sm font-semibold text-primary">{cot.codigo ?? "Cotización"}</span>
          <span className="truncate text-sm text-ink">{cot.nombre || "Sin descripción"}</span>
          <Vigencia c={cot} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select className="w-36" value={cot.estado} onChange={(e) => cambiarEstado(cot.id, e.target.value as EstadoCotizacion)}>
              {ESTADOS_COTIZACION.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
            <Boton variante="linea" onClick={alternarEncabezado} title="Mostrar u ocultar el encabezado de la hoja">
              {encabezado ? <Eye size={13} /> : <EyeOff size={13} />} Encabezado
            </Boton>
            <Link to="/cotizacion-vista" search={{ id: cot.id }}>
              <Boton variante="linea"><Eye size={13} /> Vista previa A4</Boton>
            </Link>
            <Link to="/apu-vista" search={{ id: cot.id, item: "" }}>
              <Boton variante="linea"><Calculator size={13} /> Dossier APU</Boton>
            </Link>
            <Boton variante="linea" onClick={() => void guardarPlantilla()} title="Guardar la estructura como plantilla">
              <Library size={13} /> Guardar como plantilla
            </Boton>
            <Boton variante="linea" onClick={exportarCotizacion} title="Exportar Excel">
              <Upload size={13} /> Excel
            </Boton>
            <Boton onClick={convertirEnObra} disabled={Boolean(cot.proyecto_id)}>
              {cot.proyecto_id ? "Obra generada" : "Convertir en obra"}
            </Boton>
          </div>
        </div>
        {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
        {aviso && <p className="mb-2 font-mono text-xs text-good">{aviso}</p>}

        {verCatalogo && (
          <Panel titulo="Insertar partida desde el catálogo maestro" className="mb-3">
            <form onSubmit={agregarItem} className="grid gap-3 p-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <Campo etiqueta="Partida del catálogo">
                  <Select
                    value={maestraSel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMaestraSel(v);
                      const m = maestras.find((x) => x.id === v);
                      if (!m) {
                        setItem({ codigo: "", nombre: "", especialidad: "", categoria: "", marca: "", unidad: item.unidad, metrado: "1", precio_unitario: "" });
                        return;
                      }
                      cargarMaestraEnFormulario(m, "1");
                    }}
                  >
                    <option value="">Elige una partida...</option>
                    <option value="manual">Partida libre</option>
                    {maestras.filter((m) => m.activo).map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre} · {m.unidad} · {soles(Number(m.precio_unitario))}</option>
                    ))}
                  </Select>
                </Campo>
              </div>
              <div className="sm:col-span-3">
                <Campo etiqueta="Descripción">
                  <AutoMaestra
                    value={item.nombre}
                    maestras={maestras}
                    onChange={(v) => setItem({ ...item, nombre: v })}
                    onElegir={(m) => {
                      cargarMaestraEnFormulario(m, item.metrado);
                    }}
                    placeholder="Escribe o elige una partida del banco…"
                    className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
                  />
                </Campo>
              </div>
              <Campo etiqueta="Especialidad">
                <Select value={item.especialidad} onChange={(e) => setItem({ ...item, especialidad: e.target.value, categoria: "", codigo: sugerirCodigo(e.target.value) })}>
                  <option value="">Selecciona...</option>
                  {especialidades.filter((e) => e.activo).map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Categoría">
                <Select value={item.categoria} onChange={(e) => setItem({ ...item, categoria: e.target.value, codigo: sugerirCodigo(item.especialidad, e.target.value) })}>
                  <option value="">Sin categoría</option>
                  {categoriasDe(item.especialidad, categorias).map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Código">
                <Input value={item.codigo} onChange={(e) => setItem({ ...item, codigo: e.target.value })} maxLength={20} />
              </Campo>
              <Campo etiqueta="Unidad">
                <Select value={item.unidad} onChange={(e) => setItem({ ...item, unidad: e.target.value })}>
                  {item.unidad && !unidades.some((u) => u.activo && u.simbolo === item.unidad) && (
                    <option value={item.unidad}>{item.unidad}</option>
                  )}
                  {unidades.filter((u) => u.activo).map((u) => <option key={u.id} value={u.simbolo}>{u.simbolo} · {u.descripcion}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Metrado">
                <Input type="number" step="0.01" min="0" value={item.metrado} onChange={(e) => setItem({ ...item, metrado: e.target.value })} required />
              </Campo>
              <Campo etiqueta={`P. unitario (${simboloMoneda(cot?.moneda)})`}>
                <Input type="number" step="0.01" min="0" value={item.precio_unitario} onChange={(e) => setItem({ ...item, precio_unitario: e.target.value })} required />
              </Campo>
              <div className="flex items-end gap-2 sm:col-span-6">
                <Boton type="submit">Insertar en la hoja</Boton>
                <Boton type="button" variante="linea" onClick={guardarEnBanco}>Guardar en el banco</Boton>
                <Boton type="button" variante="linea" onClick={() => setVerCatalogo(false)}><X size={13} /> Cerrar</Boton>
              </div>
            </form>
          </Panel>
        )}

        <div className="flex flex-col gap-2 bg-muted/60 px-2 py-2 lg:h-[calc(100dvh-226px)] lg:min-h-[24rem] lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <div className="flex min-h-0 flex-col lg:w-[60%]">
          <div className="min-h-0 flex-1 overflow-auto">
          <HojaCotizacion cot={cot} items={items} clientes={clientes} mostrarEncabezado={encabezado}>
            <CotizacionHoja
              cotizacionId={cot.id}
              items={itemsHoja}
              unidades={unidades}
              simbolo={simboloMoneda(cot.moneda)}
              moneda={cot.moneda}
              tipoCambio={Number(cot.tipo_cambio)}
              multi={Boolean(cot.multidisciplinaria)}
              alcance={cot.alcance ?? "ambos"}
              onSeleccionar={setPartidaActiva}
              compacta
            />
          </HojaCotizacion>
          </div>
          <ResumenCotizacion cot={cot} items={itemsHoja} />
          </div>
          <aside className="min-h-[24rem] overflow-hidden rounded-md border border-line bg-card lg:h-full lg:min-h-0 lg:w-[40%]">
            <PanelApuCotizacion cot={cot} item={itemsHoja.find((i) => i.id === partidaActiva) ?? null} />
          </aside>
        </div>
        {apu && (
          <ApuBanco
            origen={ORIGEN_COTIZACION}
            item={{ ...apu, rendimiento: Number(apu.rendimiento ?? 1), jornada: Number(apu.jornada ?? 8), metrado: Number(apu.metrado ?? 0), partida_apu_id: (apu as { partida_apu_id?: string | null }).partida_apu_id ?? null }}
            invalidar={[["cotizacion_items", seleccion]]}
            onCerrar={() => setApu(null)}
          />
        )}
      </div>
    );
  }

  /* ---------------- MODO LISTADO ---------------- */
  return (
    <>
      <Encabezado
        titulo="Cotizaciones"
        subtitulo="Propuestas comerciales a clientes"
        acciones={
          seccion === "cotizaciones" ? <div className="flex items-center gap-2">
            <select
              value={plantillaSel}
              onChange={(e) => setPlantillaSel(e.target.value)}
              title="Plantilla por tipo de obra"
              className="h-9 rounded-md border border-line bg-card px-2 text-xs"
            >
              <option value="">En blanco</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>Plantilla: {p.nombre}</option>
              ))}
            </select>
            <Boton onClick={() => void crear()}>
              <Plus size={14} /> Nueva cotización
            </Boton>
          </div> : undefined
        }
      />
      <div className="mb-3 flex flex-wrap gap-1">
        <Boton variante={seccion === "cotizaciones" ? "primario" : "linea"} onClick={() => setSeccion("cotizaciones")}><FileText size={13} />Cotizaciones</Boton>
        <Boton variante={seccion === "plantillas" ? "primario" : "linea"} onClick={() => setSeccion("plantillas")}><LayoutTemplate size={13} />Plantillas</Boton>
      </div>

      {seccion === "plantillas" ? (
        <PlantillasCotizacion />
      ) : (
        <>
      {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
      <p className="mb-3 font-mono text-[10px] text-muted-foreground">
        Siguiente código: <strong className="text-ink">{codificacionCot ? previsualizarCodigoCotizacion(codificacionCot) : "—"}</strong>{" "}
        <Link to="/datos" className="text-primary underline">configurar en Catálogos Maestros</Link>
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Cotizado este mes", soles(kpiMes)],
          ["Aprobadas", `${kpiAprob.length} · ${soles(kpiAprob.reduce((s, c) => s + total(c.id), 0))}`],
          ["Pendientes de respuesta", `${kpiPend.length} · ${soles(kpiPend.reduce((s, c) => s + total(c.id), 0))}`],
        ].map(([t, v]) => (
          <div key={t} className="rounded-lg border border-line bg-card px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{t}</div>
            <div className="mt-1 font-mono text-base font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {PESTANAS.map((p) => {
          const n = p === "Todas" ? cotizaciones.length : p === "En Obra" ? cotizaciones.filter((c) => c.proyecto_id).length : cotizaciones.filter((c) => c.estado === p).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPestana(p)}
              className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${
                pestana === p
                  ? "border-cta bg-primary/10 font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"
              }`}
            >
              {p} <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>

      <Panel titulo="Cotizaciones registradas" className="mb-4" extra={<Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por código, cliente o trabajo..." total={filtradas.length} />}>
        {cotizaciones.length === 0 ? (
          <Vacio texto="Aún no hay cotizaciones. Pulsa «Nueva cotización»." />
        ) : filtradas.length === 0 ? (
          <Vacio texto="Sin coincidencias." />
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
              {filtradas.map((c) => (
                <tr key={c.id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-primary/5" onDoubleClick={() => setSeleccion(c.id)}>
                  <td className="px-5 py-2.5 font-semibold text-primary"><Resaltar texto={c.codigo ?? "—"} termino={busqueda} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={c.cliente || "—"} termino={busqueda} /></td>
                  <td className="px-3 py-2.5 font-semibold text-ink"><Resaltar texto={c.nombre || "—"} termino={busqueda} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtFecha(c.fecha_emision)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <div className="flex items-center gap-2">{fmtFecha(vigenciaHasta(c.fecha_emision, Number(c.validez_dias)))} <Vigencia c={c} /></div>
                  </td>
                  <td className="px-3 py-2.5 text-right">{simboloMoneda(c.moneda)} {total(c.id).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Etiqueta tono={tonoEstado(c.estado)}>{c.estado}</Etiqueta>
                      {c.proyecto_id && <Etiqueta tono="good">En obra</Etiqueta>}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/cotizacion-vista" search={{ id: c.id }} title="Vista previa" aria-label="Vista previa" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-primary/10 hover:text-primary">
                        <Eye size={15} />
                      </Link>
                      <button type="button" title="Copiar" aria-label="Copiar" onClick={() => void duplicar(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-primary/10 hover:text-primary">
                        <Copy size={14} />
                      </button>
                      <button type="button" title="Editar" aria-label="Editar" onClick={() => setSeleccion(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-primary/10 hover:text-primary">
                        <Pencil size={14} />
                      </button>
                      <button type="button" title="Eliminar" aria-label="Eliminar" onClick={() => borrarCotizacion(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
        </>
      )}
    </>
  );
}
