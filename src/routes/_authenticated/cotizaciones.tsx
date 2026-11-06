import { useServerFn } from "@tanstack/react-start";
import { consultarTipoCambio } from "@/lib/decolecta.functions";
import { enviarCotizacion } from "@/lib/cotizacion-envio.functions";
import { fechaLima } from "@/lib/tipo-cambio";
import { useRecordado } from "@/lib/recordado";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Buscador, Resaltar, coincide } from "@/components/Buscador";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { GrupoCinta } from "@/components/CintaOpciones";
import { BarraHerramientas, BotonBarra, ConmutadorModo, IndicadoresCotizacion, SeparadorBarra, type ModoCotizacion } from "@/components/cotizaciones/CintaCotizacion";
import { VistaPreviaCotizacion } from "@/routes/_authenticated/cotizacion-vista";
import { Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApuBanco, ORIGEN_COTIZACION } from "@/components/ApuCotizacion";
import { dbBanco } from "@/lib/banco-apu";
import { HojaNiveles } from "@/components/cotizaciones/HojaNiveles";
import { PanelApuCotizacion } from "@/components/cotizaciones/PanelApuCotizacion";
import { HojaCotizacion } from "@/components/cotizaciones/HojaCotizacion";
import { LienzoEscalado, PanelLateralApu } from "@/components/cotizaciones/EditorEscalado";

import { Boton, BotonIcono, Etiqueta, MenuFiltros, Panel, SinAcceso, TarjetaResumen, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useTipoCambioActual } from "@/lib/cotizaciones";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import {
  agruparPorCategoria,
  prefijosWBS,
  cambiosNumeracion,
} from "@/lib/categorias";
import { useUnidadesMedida } from "@/lib/unidades";
import { generarCodigoProyecto } from "@/lib/codificacion";
import { exportarExcel } from "@/lib/exportar";
import { PlantillasCotizacion } from "@/components/cotizaciones/PlantillasCotizacion";
import {
  aplicarPlantilla,
  crearRevision,
  puedeRetomar,
  retomarCotizacion,
  etiquetaRevision,
  guardarComoPlantilla,
  revisionesDeCodigo,
  ultimasRevisiones,
  usePlantillasCotizacion,
  ESTADOS_COTIZACION,
  generarCodigoCotizacion,
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
import { Check, Calculator, ChevronDown, CornerDownRight, Upload, FileSpreadsheet, Eye, EyeOff, Trash2, ArrowLeft, Library, Plus, Pencil, Copy, FileText, History, Receipt, RotateCcw } from "lucide-react";
import { GastosGeneralesCotizacion } from "@/components/cotizaciones/GastosGeneralesCotizacion";
import { totalesGGDeLista, useTotalGGHoja } from "@/lib/gastos-generales-total";

export const Route = createFileRoute("/_authenticated/cotizaciones")({
  validateSearch: (s: Record<string, unknown>): { abrir?: string; seccion?: string } => {
    const r: { abrir?: string; seccion?: string } = {};
    if (typeof s["abrir"] === "string" && s["abrir"]) r.abrir = s["abrir"];
    if (s["seccion"] === "plantillas") r.seccion = "plantillas";
    return r;
  },
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
  const { rol, nombre: nombreUsuario, email: correoUsuario } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cotizaciones = [] } = useCotizaciones();
  /** Una fila por código: la revisión más reciente de cada cotización. */
  const vigentes = ultimasRevisiones(cotizaciones);
  const { data: unidades = [] } = useUnidadesMedida();
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

  const { abrir, seccion: seccionQ } = Route.useSearch();
  const seccion: "cotizaciones" | "plantillas" = seccionQ === "plantillas" ? "plantillas" : "cotizaciones";
  const [seleccion, setSeleccion] = useState<string | null>(abrir ?? null);
  const { data: items = [] } = useCotizacionItems(seleccion);
  const { data: itemsHoja = [] } = useCotizacionItems(seleccion, true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useRecordado("cotizaciones:busqueda", "");
  /** Fila seleccionada en «Cotizaciones registradas»: activa la barra vertical de iconos. */
  const [filaSel, setFilaSel] = useState<string | null>(null);
  // La sección vive en la URL: así la cinta resalta la opción activa y F5 la conserva.
  useEffect(() => {
    if (!seccionQ) {
      void navigate({ to: "/cotizaciones", search: abrir ? { abrir, seccion: "cotizaciones" } : { seccion: "cotizaciones" }, replace: true });
    } else if (seccion === "plantillas") {
      setSeleccion(null);
    }
  }, [seccionQ, seccion, abrir, navigate]);
  /** Cotización de un año anterior que se va a retomar con código del año actual. */
  const [aRetomar, setARetomar] = useState<Cotizacion | null>(null);
  const [actualizarPrecios, setActualizarPrecios] = useState(false);
  const [retomando, setRetomando] = useState(false);
  const codigoDe = (id?: string | null) => {
    const c = cotizaciones.find((x) => x.id === id);
    return c ? `${c.codigo ?? ""} ${etiquetaRevision(c.revision)}` : "";
  };
  const retomadaPor = (id: string) => cotizaciones.find((x) => x.retoma_de_id === id) ?? null;
  /** Las retomadas quedan congeladas: se abren en la vista A4. */
  const abrirCotizacion = (c: Cotizacion) =>
    c.estado === "Retomada" ? void navigate({ to: "/cotizacion-vista", search: { id: c.id } }) : setSeleccion(c.id);
  async function confirmarRetoma() {
    if (!aRetomar) return;
    setRetomando(true);
    setError("");
    try {
      const { id, codigo } = await retomarCotizacion(aRetomar, actualizarPrecios);
      await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setAviso(`Cotización retomada como ${codigo} Rev. 00.`);
      setARetomar(null);
      setFilaSel(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo retomar la cotización.");
    } finally {
      setRetomando(false);
    }
  }

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
  const cot = cotizaciones.find((c) => c.id === seleccion) ?? null;
  const ggHoja = useTotalGGHoja(cot?.id);

  const totales = cot
    ? totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad), ggHoja)
    : null;
  /** Revisiones hermanas del mismo código (de la más antigua a la más reciente). */
  const hermanas = cot ? revisionesDeCodigo(cotizaciones, cot.codigo) : [];
  const esUltimaRevision = hermanas.length > 0 && hermanas.at(-1)?.id === cot?.id;

  const [partidaActiva, setPartidaActiva] = useState<string | null>(null);
  const [apuAbierto, setApuAbierto] = useState(false);
  const [cmdInsumo, setCmdInsumo] = useState<{ grupo: string; n: number } | null>(null);
  const [slotBarra, setSlotBarra] = useState<HTMLDivElement | null>(null);
  /** En edición la hoja arranca sin encabezado: solo se ve la tabla de partidas. */
  const [encabezado, setEncabezado] = useState(false);
  const [ventanaGG, setVentanaGG] = useState(false);
  const [modoVentana, setModoVentana] = useState<ModoCotizacion>("edicion");
  /** Al crear una cotización se exige elegir la moneda antes de generarla. */
  const [pidiendoMoneda, setPidiendoMoneda] = useState(false);
  const [monedaNueva, setMonedaNueva] = useState<"" | "PEN" | "USD">("");
  const { data: tcHoy = 0 } = useTipoCambioActual();
  const consultarCambio = useServerFn(consultarTipoCambio);
  const enviar = useServerFn(enviarCotizacion);
  const [apu, setApu] = useState<(typeof items)[number] | null>(null);

  const [pestana, setPestana] = useState<"Todas" | EstadoCotizacion | "En Obra">("Todas");
  const { data: totalesLista = {} } = useQuery({
    queryKey: ["cotizacion_items", "totales", cotizaciones.map((c) => `${c.id}:${c.pct_gastos_generales}:${c.pct_utilidad}`).join(",")],
    enabled: cotizaciones.length > 0,
    queryFn: async () => {
      const [{ data, error: err }, gg] = await Promise.all([
        supabase.from("cotizacion_items").select("cotizacion_id, metrado, precio_unitario").eq("tipo", "partida"),
        totalesGGDeLista(cotizaciones.map((c) => c.id)),
      ]);
      if (err) throw err;
      const res: Record<string, number> = {};
      for (const c of cotizaciones) {
        const its = (data ?? []).filter((i) => i.cotizacion_id === c.id);
        res[c.id] = totalesCotizacion(its, Number(c.pct_gastos_generales), Number(c.pct_utilidad), gg[c.id]).total;
      }
      return res;
    },
  });

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function crear() {
    setError("");
    setAviso("");
    if (!monedaNueva) {
      setError("Selecciona la moneda de la cotización (Soles o Dólares).");
      return;
    }
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
          moneda: monedaNueva,
          elaborado_por: nombreUsuario,
          correo_elaborado: correoUsuario,
          ...(monedaNueva === "USD" ? { tipo_cambio: tcHoy || 3.75 } : {}),
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
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setPidiendoMoneda(false);
      setMonedaNueva("");
      setSeleccion(data.id);
      setModoVentana("edicion");
      setEncabezado(true);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear la cotización.");
    }
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
    try {
      if (estado === "Enviada") {
        const resultado = await consultarCambio({ data: { fecha: fechaLima() } });
        if (!resultado.encontrado) throw new Error("No se obtuvo el tipo de cambio de hoy. Reintenta antes de enviar.");
        await enviar({ data: { id } });
      } else {
        const { error } = await supabase.from("cotizaciones").update({ estado }).eq("id", id);
        if (error) throw error;
      }
      setError("");
      await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar el estado."); }
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
          cliente_departamento: c.cliente_departamento ?? "",
          cliente_provincia: c.cliente_provincia ?? "",
          cliente_distrito: c.cliente_distrito ?? "",
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
              nivel: (i as { nivel?: string }).nivel ?? "partida",
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

  async function borrarCotizacion(c: Cotizacion) {
    const hermanasBorrar = revisionesDeCodigo(cotizaciones, c.codigo);
    const mensaje = hermanasBorrar.length > 1
      ? `¿Eliminar la cotización ${c.codigo ?? ""} y todas sus ${hermanasBorrar.length} revisiones?`
      : "¿Eliminar esta cotización y todas sus partidas?";
    if (!window.confirm(mensaje)) return;
    const ids = hermanasBorrar.length ? hermanasBorrar.map((h) => h.id) : [c.id];
    await supabase.from("cotizaciones").delete().in("id", ids);
    if (seleccion && ids.includes(seleccion)) setSeleccion(null);
    qc.invalidateQueries({ queryKey: ["cotizaciones"] });
  }

  async function nuevaRevision() {
    if (!cot) return;
    setError("");
    setAviso("");
    try {
      const id = await crearRevision(cot);
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
      setSeleccion(id);
      setAviso(`Nueva revisión de ${cot.codigo} creada como Borrador.`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear la revisión.");
    }
  }

  async function convertirEnObra() {
    if (!cot) return;
    setError("");
    setAviso("");
    if (cot.proyecto_id) return setError("Esta cotización ya generó una obra.");
    if (cot.estado !== "Aprobada") return setError("Solo una cotización aprobada puede convertirse en obra.");
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
        .select("cotizacion_item_id, material_id, mano_obra_id, equipo_id, subcontrato_id, cantidad_o_cuadrilla, orden")
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
            orden: (c as { orden?: number }).orden ?? 0,
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
    e === "Aprobada" ? "good" : e === "Rechazada" ? "bad" : e === "Retomada" ? "warn" : "neutro";

  const hoyStr = hoy();
  const mesActual = hoyStr.slice(0, 7);
  const diasRestantes = (c: (typeof cotizaciones)[number]) =>
    Math.round((new Date(`${vigenciaHasta(c.fecha_emision, Number(c.validez_dias))}T00:00:00`).getTime() - new Date(`${hoyStr}T00:00:00`).getTime()) / 86400000);
  const total = (id: string) => totalesLista[id] ?? 0;
  const filtradas = vigentes
    .filter((c) => coincide(busqueda, c.codigo, c.cliente, c.nombre, c.estado))
    .filter((c) => pestana === "Todas" || (pestana === "En Obra" ? Boolean(c.proyecto_id) : c.estado === pestana));
  const kpiMes = vigentes.filter((c) => c.fecha_emision.startsWith(mesActual));
  /** Suma separada por moneda: nunca mezcla soles con dólares. */
  const porMoneda = (lista: typeof vigentes) => {
    const fmt = (n: number) => n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pen = lista.filter((c) => c.moneda !== "USD").reduce((s, c) => s + total(c.id), 0);
    const usd = lista.filter((c) => c.moneda === "USD").reduce((s, c) => s + total(c.id), 0);
    return (
      <span className="flex flex-col leading-tight">
        <span>S/ {fmt(pen)}</span>
        <span>US$ {fmt(usd)}</span>
      </span>
    );
  };
  const kpiAprob = vigentes.filter((c) => c.estado === "Aprobada");
  const kpiPend = vigentes.filter((c) => c.estado === "Enviada");
  const PESTANAS = ["Todas", ...ESTADOS_COTIZACION, "En Obra"] as const;

  const Vigencia = ({ c }: { c: (typeof cotizaciones)[number] }) => {
    if (c.estado === "Aprobada" || c.estado === "Rechazada" || c.proyecto_id) return null;
    const d = diasRestantes(c);
    if (d < 0) return <Etiqueta tono="bad">Vencida</Etiqueta>;
    if (d <= 5) return <Etiqueta tono="bad">Vence en {d} d</Etiqueta>;
    return null;
  };

  /* ---------------- MODO EDITOR ---------------- */
  const cerrarEditor = () => { setSeleccion(null); setEncabezado(false); setModoVentana("edicion"); setError(""); setAviso(""); };
  const ventanaEditor = cot && totales ? (
    <VentanaFlotante titulo={cot.nombre || cot.codigo || "Cotización"}
      subtitulo={`Cotización ${cot.codigo ?? ""} · ${etiquetaRevision(cot.revision)}${cot.retoma_de_id ? ` · Retoma de ${codigoDe(cot.retoma_de_id)}` : ""}`}
      abierta onCerrar={cerrarEditor} ancho="max-w-none" ocultarBarra pantallaCompleta sinMargen
      acciones={<div className="flex items-center gap-3"><IndicadoresCotizacion id={cot.id} conIgv={cot.aplica_igv !== false} disabled={!esUltimaRevision} /><ConmutadorModo modo={modoVentana} sinEdicion={!esUltimaRevision} onCambiar={setModoVentana} /></div>}>
      {modoVentana === "vista" ? <VistaPreviaCotizacion id={cot.id} /> : (
      <div className="flex min-h-0 flex-1 flex-col bg-background lg:overflow-hidden">
        <BarraHerramientas>
          <span className="px-1 text-xs text-muted-foreground">Estado</span>
          <select value={cot.estado} onChange={(e) => cambiarEstado(cot.id, e.target.value as EstadoCotizacion)}
            className="h-7 w-32 rounded border border-line bg-card px-1 text-xs text-ink">
            {ESTADOS_COTIZACION.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          {hermanas.length > 1 && (
            <select value={cot.id} title="Revisiones de esta cotización"
              onChange={(e) => {
                const destino = hermanas.find((h) => h.id === e.target.value);
                if (!destino) return;
                setSeleccion(destino.id);
                if (destino.id !== hermanas.at(-1)?.id) setModoVentana("vista");
              }}
              className="ml-1 h-7 w-36 rounded border border-line bg-card px-1 font-mono text-xs text-ink">
              {hermanas.map((h) => (
                <option key={h.id} value={h.id}>{etiquetaRevision(h.revision)}{h.id === hermanas.at(-1)?.id ? " · actual" : " · histórica"}</option>
              ))}
            </select>
          )}
          <span className="ml-1 text-xs"><Vigencia c={cot} /></span>
          <SeparadorBarra />
          <BotonBarra icono={<Building2 />} texto={cot.proyecto_id ? "Obra generada" : "Convertir en obra"} onClick={() => void convertirEnObra()}
            disabled={Boolean(cot.proyecto_id) || cot.estado !== "Aprobada"}
            title={cot.estado !== "Aprobada" && !cot.proyecto_id ? "Solo disponible para cotizaciones aprobadas" : undefined} />
          <SeparadorBarra />
          <BotonBarra icono={<Calculator />} texto="Análisis APU" onClick={() => setApuAbierto((v) => !v)} />
          <BotonBarra icono={<Receipt />} texto="Gastos generales" onClick={() => setVentanaGG(true)} />
          <BotonBarra icono={<History />} texto="Nueva revisión" disabled={!esUltimaRevision || Boolean(cot.proyecto_id)}
            onClick={() => { if (confirm("¿Crear una nueva revisión clonando esta cotización?")) void nuevaRevision(); }} />
          <SeparadorBarra />
          <BotonBarra icono={<FileSpreadsheet />} texto="Exportar a Excel" onClick={exportarCotizacion} />
          <BotonBarra icono={<Library />} texto="Guardar como plantilla" onClick={() => void guardarPlantilla()} />
          <BotonBarra icono={<Calculator />} texto="Dossier APU" onClick={() => void navigate({ to: "/apu-vista", search: { id: cot.id, item: "" } })} />
        </BarraHerramientas>
        {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
        {aviso && <p className="mb-2 font-mono text-xs text-good">{aviso}</p>}


        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/60">
          <LienzoEscalado>
          <HojaCotizacion cot={cot} items={items} clientes={clientes}>
            <HojaNiveles
              cotizacionId={cot.id}
              items={itemsHoja}
              unidades={unidades}
              simbolo={simboloMoneda(cot.moneda)}
              moneda={cot.moneda}
              tipoCambio={Number(cot.tipo_cambio)}
              onSeleccionar={setPartidaActiva}
              barraEn={slotBarra}
              accionesDocumento={[]}
              onAgregarInsumo={() => {
                if (!partidaActiva) return setError("Selecciona una partida de la hoja para agregar un insumo a su APU.");
                setApuAbierto(true);
                setCmdInsumo({ grupo: "INSUMO", n: Date.now() });
              }}
            />
          </HojaCotizacion>
          </LienzoEscalado>
          <GastosGeneralesCotizacion abierta={ventanaGG} onCerrar={() => setVentanaGG(false)} cotizacionId={cot.id}
            costoDirecto={totales?.costoDirecto ?? 0} pctActual={Number(cot.pct_gastos_generales)} moneda={cot.moneda}
            soloLectura={!esUltimaRevision} pctUtilidad={Number(cot.pct_utilidad)} aplicaIgv={cot.aplica_igv ?? true}
            duracionMeses={Number((cot as { duracion_meses?: number }).duracion_meses ?? 1)} />
          {apuAbierto && (
            <PanelLateralApu onCerrar={() => setApuAbierto(false)}>
              <PanelApuCotizacion cot={cot} item={itemsHoja.find((i) => i.id === partidaActiva) ?? null} comando={cmdInsumo} />
            </PanelLateralApu>
          )}
          <div ref={setSlotBarra} className="shrink-0" />
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
      )}
    </VentanaFlotante>
  ) : null;

  /* ---------------- MODO LISTADO ---------------- */
  return (
    <>
      <Encabezado
        titulo="Cotizaciones"
        subtitulo="Propuestas comerciales a clientes"
        acciones={
          seccion === "cotizaciones" ? <div className="flex items-center gap-2">
            <GrupoCinta titulo="Crear">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-cinta-acento px-2.5 text-xs font-semibold text-cinta-acento-foreground transition-colors hover:brightness-95">
                    <Plus size={14} /> Nueva cotización <ChevronDown size={13} aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem onClick={() => { setPlantillaSel(""); setMonedaNueva(""); setError(""); setPidiendoMoneda(true); }}>
                    <FileText size={14} /> En blanco
                  </DropdownMenuItem>
                  {plantillas.length > 0 && <DropdownMenuSeparator />}
                  {plantillas.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => { setPlantillaSel(p.id); setMonedaNueva(""); setError(""); setPidiendoMoneda(true); }}>
                      <Library size={14} /> Plantilla: {p.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </GrupoCinta>
            <VentanaFlotante titulo="Nueva cotización" subtitulo="Elige la moneda; luego completarás el encabezado" abierta={pidiendoMoneda} onCerrar={() => setPidiendoMoneda(false)} ancho="max-w-md">
              <div className="space-y-4 p-5">
                <p className="text-xs font-semibold text-ink">Moneda de la cotización <span className="text-bad">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {(["PEN", "USD"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMonedaNueva(m)} aria-pressed={monedaNueva === m} className={cn("flex flex-col items-center gap-1 rounded-lg border-2 bg-card px-3 py-4 transition-colors", monedaNueva === m ? "border-primary bg-primary/10 text-primary" : "border-line text-ink hover:border-primary/50 hover:bg-muted")}>
                      <span className="text-2xl font-bold">{m === "PEN" ? "S/" : "US$"}</span>
                      <span className="text-xs font-semibold">{m === "PEN" ? "Soles" : "Dólares"}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="text-xs text-bad">{error}</p>}
                <div className="flex justify-end gap-2 border-t border-line pt-4">
                  <Boton variante="linea" onClick={() => setPidiendoMoneda(false)}>Cancelar</Boton>
                  <Boton disabled={!monedaNueva} onClick={() => void crear()}>Crear y completar encabezado</Boton>
                </div>
              </div>
            </VentanaFlotante>
          </div> : undefined
        }
      />

      {seccion === "plantillas" ? (
        <PlantillasCotizacion />
      ) : (
        <>
      {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
      <p className="mb-3 font-mono text-[10px] text-muted-foreground">
        Siguiente código: <strong className="text-ink">{codificacionCot ? previsualizarCodigoCotizacion(codificacionCot) : "—"}</strong>{" "}
        <Link to="/datos" search={{ pestana: undefined }} className="text-primary underline">configurar en Catálogos Maestros</Link>
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <TarjetaResumen etiqueta="Cotizado este mes" valor={porMoneda(kpiMes)} guia="Emitidas en el mes actual" />
        <TarjetaResumen etiqueta="Aprobadas" cantidad={kpiAprob.length} valor={porMoneda(kpiAprob)} guia="Aceptadas por el cliente" />
        <TarjetaResumen etiqueta="Pendientes de respuesta" cantidad={kpiPend.length} valor={porMoneda(kpiPend)} alerta={kpiPend.length > 0 ? "warn" : undefined} guia="Enviadas, sin respuesta" />
      </div>

      <div role="tablist" aria-label="Estado de cotizaciones" className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {PESTANAS.map((p) => {
          const n = p === "Todas" ? vigentes.length : p === "En Obra" ? vigentes.filter((c) => c.proyecto_id).length : vigentes.filter((c) => c.estado === p).length;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={pestana === p}
              onClick={() => setPestana(p)}
              className={`-mb-px min-h-9 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                pestana === p
                  ? "border-cinta-seleccion text-ink"
                  : "border-transparent text-muted-foreground hover:border-cinta-seleccion/50 hover:text-ink"
              }`}
            >
              {p} <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-start gap-3">
      <Panel titulo="Cotizaciones registradas" className="min-w-0 flex-1">
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
                <th className="px-5 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} onClick={() => setFilaSel(c.id)} onDoubleClick={() => abrirCotizacion(c)} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-primary/5 ${filaSel === c.id ? "bg-primary/8" : ""}`}>
                  <td className="px-5 py-2.5 font-semibold text-primary">
                    <div className="flex items-center gap-2">
                      <Resaltar texto={c.codigo ?? "—"} termino={busqueda} />
                      <span className="rounded border border-line px-1 py-0.5 text-[9px] font-semibold text-muted-foreground" title={`${revisionesDeCodigo(cotizaciones, c.codigo).length} revisión(es) guardada(s)`}>
                        {etiquetaRevision(c.revision)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={c.cliente || "—"} termino={busqueda} /></td>
                  <td className="px-3 py-2.5 font-semibold text-ink"><Resaltar texto={c.nombre || "—"} termino={busqueda} /></td>
                  <td className="px-3 py-2.5 text-muted-foreground">{fmtFecha(c.fecha_emision)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <div className="flex items-center gap-2">{fmtFecha(vigenciaHasta(c.fecha_emision, Number(c.validez_dias)))} <Vigencia c={c} /></div>
                  </td>
                  <td className="px-3 py-2.5 text-right">{simboloMoneda(c.moneda)} {total(c.id).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex gap-1">
                      <Etiqueta tono={tonoEstado(c.estado)}>{c.estado === "Retomada" && retomadaPor(c.id) ? `Retomada → ${retomadaPor(c.id)?.codigo}` : c.estado}</Etiqueta>
                      {c.retoma_de_id && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); const o = cotizaciones.find((x) => x.id === c.retoma_de_id); if (o) void navigate({ to: "/cotizacion-vista", search: { id: o.id } }); }} title="Abrir la cotización original" className="text-[10px] text-muted-foreground underline">
                          Retoma de {codigoDe(c.retoma_de_id)}
                        </button>
                      )}
                      {c.proyecto_id && <Etiqueta tono="good">En obra</Etiqueta>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {(() => {
        const sel = filtradas.find((c) => c.id === filaSel) ?? null;
        return (
          <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
            <MenuFiltros activos={busqueda ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={filtradas.length} placeholder="Buscar por código, cliente o trabajo..." /></MenuFiltros>
            <div className="mb-1 border-b" />
            <BotonIcono etiqueta="Vista previa" title="Vista previa" tono="primario" disabled={!sel} onClick={() => { if (sel) { setSeleccion(sel.id); setModoVentana("vista"); } }}><Eye size={15} /></BotonIcono>
            <BotonIcono etiqueta="Editar" title="Editar cotización" disabled={!sel} onClick={() => sel && abrirCotizacion(sel)}><Pencil size={15} /></BotonIcono>
            <BotonIcono etiqueta="Copiar" title="Copiar cotización" disabled={!sel} onClick={() => sel && void duplicar(sel)}><Copy size={15} /></BotonIcono>
            <BotonIcono etiqueta="Eliminar" title="Eliminar cotización" tono="peligro" disabled={!sel} onClick={() => sel && borrarCotizacion(sel)}><Trash2 size={15} /></BotonIcono>
            <BotonIcono etiqueta={`Retomar en ${new Date().getFullYear()}`} title={sel && puedeRetomar(sel) ? `Retomar en ${new Date().getFullYear()} con código nuevo` : "Solo para cotizaciones de años anteriores no aprobadas"} disabled={!sel || !puedeRetomar(sel)} onClick={() => { if (sel) { setActualizarPrecios(false); setARetomar(sel); } }}><RotateCcw size={15} /></BotonIcono>
          </div>
        );
      })()}
      </div>
      {aRetomar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => !retomando && setARetomar(null)}>
          <div className="w-full max-w-md rounded-lg border border-line bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink">Retomar en {new Date().getFullYear()}</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Se creará una cotización nueva con el código <span className="font-mono font-semibold text-primary">{codificacionCot ? previsualizarCodigoCotizacion(codificacionCot) : "—"}</span> (Rev. 00), copiando todo de <span className="font-mono">{aRetomar.codigo} {etiquetaRevision(aRetomar.revision)}</span>. La original quedará congelada como «Retomada».
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Fecha de emisión: hoy · validez: {aRetomar.validez_dias} días.</p>
            <label className="mt-3 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={actualizarPrecios} onChange={(e) => setActualizarPrecios(e.target.checked)} />
              Actualizar precios al Banco APU actual
            </label>
            {error && <p className="mt-2 text-xs text-bad">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Boton variante="linea" onClick={() => setARetomar(null)} disabled={retomando}>Cancelar</Boton>
              <Boton onClick={() => void confirmarRetoma()} disabled={retomando}>{retomando ? "Retomando…" : "Retomar"}</Boton>
            </div>
          </div>
        </div>
      )}
        </>
      )}
      {ventanaEditor}
    </>
  );
}
