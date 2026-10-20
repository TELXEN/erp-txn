import { codigoContextual } from "@/lib/categorias";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { pct, soles } from "@/lib/format";
import {
  agruparPorProyectoYEspecialidad,
  costoRealPartida,
  esContractual,
  cobraGG,
  cobraUtilidad,
  resumenPresupuesto,
  useGastosDirectos,
  usePartidas,
  useProyectos,
  useTiposPresupuesto,
  usePrioridades,
  nombresPrioridades,
} from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { Pencil, Trash2, Check, X, LayoutGrid, Table2, Upload, ListOrdered, Calculator, ChevronDown, ChevronUp, FolderKanban } from "lucide-react";
import { Kanban } from "@/components/Kanban";
import { InsigniaPrioridad, InsigniaTipoPresupuesto } from "@/components/estado-ui";
import { PRIORIDADES } from "@/lib/configuracion";
import { siguienteCodigoPartida, useEspecialidadesPartida } from "@/lib/especialidades";
import {
  agruparSoloPorCategoria,
  categoriasDe,
  prefijosWBS,
  renumerarWBS,
  siguienteCodigoEnCategoria,
  useCategoriasPartida,
} from "@/lib/categorias";
import { montoPartida, useUnidadesMedida } from "@/lib/unidades";
import { ImportarExcel } from "@/components/ImportarExcel";
import { ApuBanco, ORIGEN_OBRA } from "@/components/ApuCotizacion";
import { usePartidasMaestras } from "@/lib/cotizaciones";

const cantidad = (n: number) =>
  Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const Route = createFileRoute("/_authenticated/partidas")({
  head: () => ({
    meta: [
      { title: "Partidas — ERP TELXEN" },
      { name: "description", content: "Partidas organizadas por proyecto y especialidad, con presupuesto y costo real." },
      { property: "og:title", content: "Partidas — ERP TELXEN" },
      { property: "og:description", content: "Partidas por proyecto y especialidad con presupuesto y costo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Partidas,
});

function Partidas() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastos = [] } = useGastosDirectos();

  const { data: tipos = [] } = useTiposPresupuesto();
  const { data: prioridadesData } = usePrioridades();
  const prioridadesLista = nombresPrioridades(prioridadesData);
  const { data: capitulos = [] } = useEspecialidadesPartida();
  const { data: categorias = [] } = useCategoriasPartida();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: maestras = [] } = usePartidasMaestras();

  const [filtroProyecto, setFiltroProyecto] = useState(() => localStorage.getItem("partidas:proyecto") ?? "");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");

  useEffect(() => {
    localStorage.setItem("partidas:proyecto", filtroProyecto);
  }, [filtroProyecto]);

  // Si el proyecto recordado ya no existe, vuelve a «Todos»
  useEffect(() => {
    if (filtroProyecto && proyectos.length > 0 && !proyectos.some((p) => p.id === filtroProyecto)) {
      setFiltroProyecto("");
    }
  }, [filtroProyecto, proyectos]);
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
  const [modalNueva, setModalNueva] = useState(false);
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const alternar = (clave: string) =>
    setColapsados((prev) => {
      const nx = new Set(prev);
      if (nx.has(clave)) nx.delete(clave);
      else nx.add(clave);
      return nx;
    });
  const accionRef = React.useRef<"volver" | "otra">("volver");
  const [form, setForm] = useState({
    proyecto_id: "",
    codigo: "",
    nombre: "",
    especialidad: "",
    categoria: "",
    marca: "",
    unidad: "GLB",
    metrado: "1",
    precio_unitario: "",
    prioridad: "Media",
    tipo_presupuesto: "Contractual",
    aplica_gg: true,
    aplica_utilidad: true,
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    codigo: string;
    nombre: string;
    especialidad: string;
    categoria: string;
    marca: string;
    unidad: string;
    metrado: string;
    precio_unitario: string;
    tipo_presupuesto: string;
    aplica_gg: boolean;
    aplica_utilidad: boolean;
  } | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const [apu, setApu] = useState<(typeof partidas)[number] | null>(null);
  const [nuevaSub, setNuevaSub] = useState<{
    padre_id: string;
    codigo: string;
    nombre: string;
    marca: string;
    unidad: string;
    metrado: string;
    precio_unitario: string;
  } | null>(null);

  const nombreProyecto = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    if (!p) return "—";
    return p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre;
  };

  const coincidentes = useMemo(() => {
    const match = new Set<string>();
    const check = (id: string) => {
      if (match.has(id)) return true;
      const p = partidas.find((x) => x.id === id);
      if (!p) return false;
      if (coincide(busqueda, p.nombre, p.codigo)) {
        match.add(id);
        return true;
      }
      const hijos = partidas.filter((x) => x.padre_id === id);
      if (hijos.some((h) => check(h.id))) {
        match.add(id);
        return true;
      }
      return false;
    };
    partidas.forEach((p) => check(p.id));
    return match;
  }, [partidas, busqueda]);

  const visibles = useMemo(
    () =>
      partidas.filter(
        (p) =>
          (!filtroProyecto || p.proyecto_id === filtroProyecto) &&
          (!filtroEsp || p.especialidad === filtroEsp) &&
          (!filtroTipo || (p.tipo_presupuesto ?? "Contractual") === filtroTipo) && (!busqueda || coincidentes.has(p.id)),
      ),
    [partidas, filtroProyecto, filtroEsp, filtroTipo, busqueda, coincidentes],
  );
  const resumen = useMemo(() => resumenPresupuesto(visibles, tipos), [visibles, tipos]);
  const resumenPartidas = useMemo(() => {
    const total = visibles.length;
    const promedio = total > 0 ? visibles.reduce((s, p) => s + Number(p.avance_pct), 0) / total : 0;
    return { total, promedio };
  }, [visibles]);
  const nombresTipos = useMemo(() => {
    const activos = tipos.filter((t) => t.activo).map((t) => t.nombre);
    const usados = partidas.map((p) => p.tipo_presupuesto ?? "Contractual");
    return [...new Set(["Contractual", ...activos, ...usados])];
  }, [tipos, partidas]);
  const nombresEspecialidades = useMemo(() => {
    const activos = capitulos.filter((c) => c.activo).map((c) => c.nombre);
    const usados = partidas.map((p) => p.especialidad).filter(Boolean);
    return [...new Set([...activos, ...usados])];
  }, [capitulos, partidas]);
  /** Código contextual de la obra: capítulo y categoría según lo ya cargado en ese proyecto. */
  const sugerir = (proyectoId: string, especialidad: string, categoria = "") =>
    codigoContextual(
      especialidad,
      categoria,
      partidas.filter((p) => p.proyecto_id === proyectoId),
    );
  const grupos = useMemo(() => agruparPorProyectoYEspecialidad(visibles, nombreProyecto), [visibles, nombreProyecto]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.from("partidas").insert({
      proyecto_id: form.proyecto_id,
      codigo: (form.codigo || sugerir(form.proyecto_id, form.especialidad, form.categoria)).trim(),
      nombre: form.nombre.trim(),
      especialidad: form.especialidad,
      categoria: form.categoria,
      prioridad: form.prioridad,
      tipo_presupuesto: form.tipo_presupuesto,
      aplica_gg: esContractual(form.tipo_presupuesto, tipos) ? true : form.aplica_gg,
      aplica_utilidad: esContractual(form.tipo_presupuesto, tipos) ? true : form.aplica_utilidad,
      aplica_gg_utilidad: esContractual(form.tipo_presupuesto, tipos)
        ? true
        : form.aplica_gg || form.aplica_utilidad,
      marca: form.marca.trim(),
      unidad: form.unidad,
      metrado: Number(form.metrado || 0),
      precio_unitario: Number(form.precio_unitario || 0),
      presupuesto_inicial: montoPartida(form.metrado, form.precio_unitario),
    });
    if (err) return setError(err.message);
    setForm({ ...form, codigo: "", nombre: "", marca: "", metrado: "1", precio_unitario: "" });
    qc.invalidateQueries({ queryKey: ["partidas"] });
    if (accionRef.current === "volver") setModalNueva(false);
  }

  function abrirNueva() {
    if (filtroProyecto && !form.proyecto_id) {
      setForm((f) => ({ ...f, proyecto_id: filtroProyecto }));
    }
    setError("");
    setModalNueva(true);
  }

  async function actualizar(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("partidas")
      .update({
        codigo: editando.codigo.trim(),
        nombre: editando.nombre.trim(),
        especialidad: editando.especialidad,
        categoria: editando.categoria,
        tipo_presupuesto: editando.tipo_presupuesto,
        aplica_gg: esContractual(editando.tipo_presupuesto, tipos) ? true : editando.aplica_gg,
        aplica_utilidad: esContractual(editando.tipo_presupuesto, tipos) ? true : editando.aplica_utilidad,
        aplica_gg_utilidad: esContractual(editando.tipo_presupuesto, tipos)
          ? true
          : editando.aplica_gg || editando.aplica_utilidad,
        marca: editando.marca ?? "",
        unidad: editando.unidad,
        metrado: Number(editando.metrado || 0),
        precio_unitario: Number(editando.precio_unitario || 0),
        presupuesto_inicial: montoPartida(editando.metrado, editando.precio_unitario),
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta partida? Se perderán los gastos directos vinculados.")) return;
    setError("");
    const { error: err } = await supabase.from("partidas").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  function abrirSubpartida(padre: (typeof partidas)[number]) {
    setNuevaSub({
      padre_id: padre.id,
      codigo: siguienteCodigoSubpartida(padre.codigo, partidas.filter((x) => x.padre_id === padre.id)),
      nombre: "",
      marca: padre.marca ?? "",
      unidad: padre.unidad || "GLB",
      metrado: "1",
      precio_unitario: "",
    });
  }

  async function guardarSubpartida() {
    if (!nuevaSub) return;
    const padre = partidas.find((x) => x.id === nuevaSub.padre_id);
    if (!padre) return;
    if (!nuevaSub.nombre.trim()) return setError("Escribe la descripción de la subpartida.");
    const primera = !partidas.some((x) => x.padre_id === padre.id);
    if (
      primera &&
      Number(padre.presupuesto_inicial) > 0 &&
      !window.confirm(
        `"${padre.nombre}" pasará a ser partida agrupadora: su presupuesto será la suma de sus subpartidas y su metrado/P.U. propios (${soles(Number(padre.presupuesto_inicial))}) se pondrán en cero. ¿Continuar?`,
      )
    )
      return;
    setError("");
    const { error: err } = await supabase.from("partidas").insert({
      proyecto_id: padre.proyecto_id,
      padre_id: padre.id,
      codigo: nuevaSub.codigo.trim(),
      nombre: nuevaSub.nombre.trim(),
      especialidad: padre.especialidad,
      categoria: padre.categoria ?? "",
      prioridad: padre.prioridad,
      tipo_presupuesto: padre.tipo_presupuesto ?? "Contractual",
      aplica_gg: padre.aplica_gg,
      aplica_utilidad: padre.aplica_utilidad,
      aplica_gg_utilidad: padre.aplica_gg_utilidad,
      marca: nuevaSub.marca.trim(),
      unidad: nuevaSub.unidad,
      metrado: Number(nuevaSub.metrado || 0),
      precio_unitario: Number(nuevaSub.precio_unitario || 0),
      presupuesto_inicial: montoPartida(nuevaSub.metrado, nuevaSub.precio_unitario),
    });
    if (err) return setError(err.message);
    if (primera) {
      await supabase
        .from("partidas")
        .update({ metrado: 1, precio_unitario: 0, presupuesto_inicial: 0 })
        .eq("id", padre.id);
    }
    setNuevaSub(null);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  async function renumerar(proyectoId: string, etiqueta: string) {
    const lista = partidas.filter((p) => p.proyecto_id === proyectoId);
    const cambios = renumerarWBS(lista);
    if (!cambios.length) return window.alert(`La numeración de ${etiqueta} ya está ordenada.`);
    if (
      !window.confirm(
        `Se reasignarán códigos correlativos (01, 01.01, 01.01.01, 01.01.01.01) a ${cambios.length} partida(s) de ${etiqueta}. ¿Continuar?`,
      )
    )
      return;
    setError("");
    for (const c of cambios) {
      const { error: err } = await supabase.from("partidas").update({ codigo: c.codigo }).eq("id", c.id);
      if (err) return setError(err.message);
    }
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  function exportar() {
    exportarExcel("partidas", [
      {
        nombre: "Partidas",
        filas: visibles.map((p) => {
          const wbs = prefijosWBS(partidas.filter((x) => x.proyecto_id === p.proyecto_id));
          return {
            Proyecto: nombreProyecto(p.proyecto_id),
            "Cód. Especialidad": wbs.capitulo(p.especialidad),
            Especialidad: p.especialidad,
            "Cód. Categoría": wbs.categoria(p.especialidad, p.categoria),
            Categoría: p.categoria ?? "",
            Código: p.codigo ?? "",
            Partida: p.nombre,
            Marca: p.marca || "-",
            Unidad: p.unidad ?? "",
            Metrado: Number(p.metrado ?? 0),
            "Precio Unitario (S/)": Number(p.precio_unitario ?? 0),
            "Tipo de Presupuesto": p.tipo_presupuesto ?? "Contractual",
            Prioridad: p.prioridad,
            "Presupuesto (S/)": Number(p.presupuesto_inicial),
            "Avance Fisico %": Number(p.avance_pct),
            "Aplica GG": cobraGG(p, tipos) ? "Si" : "No",
            "Aplica Utilidad": cobraUtilidad(p, tipos) ? "Si" : "No",
          };
        }),
      },
    ]);
  }

  async function crearTipo() {
    const nombre = window.prompt("Nombre del nuevo tipo de presupuesto (ej. Adicional 04)")?.trim();
    if (!nombre) return;
    setError("");
    const { error: err } = await supabase
      .from("tipos_presupuesto")
      .insert({ nombre, es_contractual: false, orden: tipos.length + 1 });
    if (err && !err.message.includes("duplicate")) return setError(err.message);
    await qc.invalidateQueries({ queryKey: ["tipos_presupuesto"] });
    setForm((f) => ({ ...f, tipo_presupuesto: nombre }));
  }

  async function mover(id: string, situacion: string) {
    setError("");
    const { error: err } = await supabase.from("partidas").update({ situacion }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["partidas"] });
  }

  return (
    <>
      <Encabezado
        titulo="Partidas"
        subtitulo="Organizadas por proyecto y especialidad"
        acciones={
          <div className="flex items-center gap-2">
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              total={visibles.length}
              placeholder="Buscar partidas o códigos..."
            />
            <div className="flex items-center gap-1 rounded-md border border-line bg-card p-1">
              <button
                type="button"
                onClick={() => setVista("tabla")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] ${vista === "tabla" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-ink"}`}
              >
                <Table2 size={13} /> Tabla
              </button>
              <button
                type="button"
                onClick={() => setVista("kanban")}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[11px] ${vista === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-ink"}`}
              >
                <LayoutGrid size={13} /> Kanban
              </button>
            </div>
            <ImportarExcel />
            <Boton variante="linea" onClick={exportar}>
              <Upload size={13} /> Exportar a Excel
            </Boton>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        <Boton variante="primario"><FolderKanban size={13} />Gestión de partidas</Boton>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 border-b border-line pb-3">
        <Boton onClick={abrirNueva} className="mb-1">+ Nueva partida</Boton>
      </div>

      <VentanaFlotante abierta={modalNueva} onCerrar={() => setModalNueva(false)} titulo="Registrar nueva partida" subtitulo="Registra varias partidas consecutivamente y cierra cuando termines." ancho="max-w-6xl">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <Campo etiqueta="Cargar desde el registro maestro">
              <Select
                autoFocus
                value=""
                onChange={(e) => {
                  const m = maestras.find((x) => x.id === e.target.value);
                  if (!m) return;
                  setForm({
                    ...form,
                    nombre: m.nombre,
                    especialidad: m.especialidad,
                    categoria: m.categoria ?? "",
                    marca: m.marca ?? "",
                    unidad: m.unidad,
                    precio_unitario: String(m.precio_unitario ?? 0),
                    codigo: sugerir(form.proyecto_id, m.especialidad, m.categoria ?? ""),
                  });
                }}
              >
                <option value="">Elige una partida del registro maestro (opcional)...</option>
                {maestras
                  .filter((m) => m.activo)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} · {m.especialidad || "—"} · {m.unidad}
                    </option>
                  ))}
              </Select>
            </Campo>
          </div>
          <Campo etiqueta="Proyecto">
            <Select
              value={form.proyecto_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  proyecto_id: e.target.value,
                  codigo: sugerir(e.target.value, form.especialidad, form.categoria),
                })
              }
              required
            >
              <option value="">Selecciona...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  <Resaltar texto={p.nombre} termino={busqueda}/>
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Capítulo / Especialidad">
            <Select
              value={form.especialidad}
              onChange={(e) =>
                setForm({
                  ...form,
                  especialidad: e.target.value,
                  categoria: "",
                  codigo: sugerir(form.proyecto_id, e.target.value),
                })
              }
              required
            >
              <option value="">Selecciona...</option>
              {nombresEspecialidades.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Categoría">
            <Select
              value={form.categoria}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoria: e.target.value,
                  codigo: sugerir(form.proyecto_id, form.especialidad, e.target.value),
                })
              }
            >
              <option value="">Sin categoría</option>
              {categoriasDe(form.especialidad, categorias).map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.codigo} {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Código de partida">
            <Input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              maxLength={20}
              placeholder={sugerir(form.proyecto_id, form.especialidad) || "05.01"}
              className="font-mono"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Sugerido automáticamente, puedes editarlo.</p>
          </Campo>
          <Campo etiqueta="Descripción de partida">
            <Input value={form.nombre} data-formato="oracion" onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={140} />
          </Campo>
          <Campo etiqueta="Marca">
            <Input value={form.marca} data-formato="titulo" onChange={(e) => setForm({ ...form, marca: e.target.value })} maxLength={60} placeholder="Sin marca" />
          </Campo>
          <Campo etiqueta="Unidad">
            <Select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} required>
              {[...new Set([...unidades.filter((u) => u.activo).map((u) => u.simbolo), form.unidad])].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Metrado (cantidad)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.metrado}
              onChange={(e) => setForm({ ...form, metrado: e.target.value })}
              required
              className="text-right"
            />
          </Campo>
          <Campo etiqueta="Precio unitario (S/)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.precio_unitario}
              onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
              required
              className="text-right"
            />
          </Campo>
          <Campo etiqueta="Presupuesto (S/)">
            <div className="rounded-md border border-line bg-muted/40 px-3 py-2 text-right font-mono text-sm font-semibold text-ink">
              {soles(montoPartida(form.metrado, form.precio_unitario))}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Metrado × precio unitario.</p>
          </Campo>
          <Campo etiqueta="Tipo de presupuesto">
            <Select
              value={form.tipo_presupuesto}
              onChange={(e) => {
                if (e.target.value === "__nuevo__") void crearTipo();
                else setForm({ ...form, tipo_presupuesto: e.target.value });
              }}
            >
              {nombresTipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__nuevo__">+ Agregar tipo…</option>
            </Select>
            {!esContractual(form.tipo_presupuesto, tipos) && (
              <div className="mt-1.5 space-y-1">
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.aplica_gg}
                    onChange={(e) => setForm({ ...form, aplica_gg: e.target.checked })}
                    className="size-3.5 accent-[var(--color-primary)]"
                  />
                  Cobrar gastos generales en este adicional
                </label>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.aplica_utilidad}
                    onChange={(e) => setForm({ ...form, aplica_utilidad: e.target.checked })}
                    className="size-3.5 accent-[var(--color-primary)]"
                  />
                  Cobrar utilidad en este adicional
                </label>
              </div>
            )}
          </Campo>
          <Campo etiqueta="Prioridad">
            <Select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
              {prioridadesLista.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="flex flex-col justify-end sm:col-span-6 sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-line pt-3">
            <p className="font-mono text-sm">
              Monto parcial:{" "}
              <span className="font-semibold text-ink">{soles(montoPartida(form.metrado, form.precio_unitario))}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Boton type="button" variante="linea" onClick={() => setModalNueva(false)}>
                Cancelar
              </Boton>
              <Boton type="submit" variante="linea" onClick={() => (accionRef.current = "otra")}>
                Registrar otra
              </Boton>
              <Boton type="submit" onClick={() => (accionRef.current = "volver")}>
                Registrar y cerrar
              </Boton>
            </div>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-6">{error}</p>}
        </form>
      </VentanaFlotante>

      <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { etiqueta: "Presupuesto contractual", valor: soles(resumen.contractual) },
          { etiqueta: "Total adicionales", valor: soles(resumen.adicionales) },
          { etiqueta: "Presupuesto vigente", valor: soles(resumen.vigente) },
          { etiqueta: "Partidas", valor: String(resumenPartidas.total) },
          { etiqueta: "Avance promedio", valor: `${resumenPartidas.promedio.toFixed(1)}%` },
        ].map((d) => (
          <div key={d.etiqueta} className="rounded-lg border border-line bg-card px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d.etiqueta}</p>
            <p className="text-lg font-bold tabular-nums">{d.valor}</p>
          </div>
        ))}
      </div>

      <Panel
        titulo={vista === "kanban" ? "Tablero Kanban de partidas" : "Listado por proyecto y tipos"}
        extra={
          <div className="flex flex-wrap gap-2">
            <Select className="w-52" value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  <Resaltar texto={p.nombre} termino={busqueda}/>
                </option>
              ))}
            </Select>
            <Select className="w-56" value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
              <option value="">Todas las especialidades</option>
              {nombresEspecialidades.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
            <Select className="w-52" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {nombresTipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {grupos.length === 0 ? (
          <Vacio texto="No hay partidas con estos filtros." />
        ) : vista === "kanban" ? (
          <Kanban
            onMover={mover}
            tarjetas={visibles.map((p) => {
              const costo = costoRealPartida(p.id, gastos);
              const presu = Number(p.presupuesto_inicial);
              const gastoPct = presu > 0 ? (costo / presu) * 100 : 0;
              const sano = gastoPct <= Number(p.avance_pct);
              return {
                id: p.id,
                situacion: p.situacion,
                contenido: (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold leading-tight text-ink">
                      {p.codigo && <span className="mr-1 font-mono text-[10px] text-primary"><Resaltar texto={p.codigo} termino={busqueda}/></span>}
                      <Resaltar texto={p.nombre} termino={busqueda}/>
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">{nombreProyecto(p.proyecto_id)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.especialidad}</p>
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Number(p.avance_pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{pct(Number(p.avance_pct))}</span>
                      <span className={`font-mono text-[10px] font-semibold ${sano ? "text-good" : "text-bad"}`}>
                        {soles(costo)} / {soles(presu)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <InsigniaPrioridad valor={p.prioridad} />
                      <InsigniaTipoPresupuesto valor={p.tipo_presupuesto ?? "Contractual"} />
                    </div>
                  </div>
                ),
              };
            })}
          />
        ) : (
           grupos.map(({ proyecto, grupos: espGrupos }) => {
            const proyectoId = espGrupos[0]?.[1]?.[0]?.proyecto_id ?? "";
            const wbs = prefijosWBS(partidas.filter((x) => x.proyecto_id === proyectoId));
            const claveProy = `proy:${proyectoId}`;
            const proyAbierto = !colapsados.has(claveProy);
            const nPartidas = espGrupos.reduce((s, [, l]) => s + l.length, 0);
            return (
            <div key={proyecto} className="border-b border-line last:border-0">
              <div className="flex items-center justify-between gap-3 border-b-2 border-primary/40 bg-primary px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => alternar(claveProy)}
                  title={proyAbierto ? "Colapsar proyecto" : "Expandir proyecto"}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {proyAbierto ? (
                    <ChevronUp size={14} className="shrink-0 text-primary-foreground/80" />
                  ) : (
                    <ChevronDown size={14} className="shrink-0 text-primary-foreground/80" />
                  )}
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-primary-foreground">{proyecto}</p>
                  <span className="shrink-0 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/90">
                    Proyecto
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-primary-foreground/80">
                    {nPartidas} partida{nPartidas === 1 ? "" : "s"} · {soles(espGrupos.reduce((s, [, l]) => s + l.reduce((a, x) => a + Number(x.presupuesto_inicial), 0), 0))}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void renumerar(proyectoId, proyecto)}
                  className="inline-flex items-center gap-1.5 rounded border border-primary-foreground/25 px-2 py-1 font-mono text-[10px] text-primary-foreground/85 transition-colors hover:border-primary-foreground/50 hover:text-primary-foreground"
                >
                  <ListOrdered size={12} /> Renumerar WBS
                </button>
              </div>
              {proyAbierto && (
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-line bg-card text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th style={{ width: "8%" }} className="whitespace-nowrap bg-card px-5 py-2 font-medium">Código</th>
                    <th style={{ width: "22%" }} className="whitespace-nowrap bg-card px-3 py-2 font-medium">Partida</th>
                    <th style={{ width: "6%" }} className="whitespace-nowrap bg-card px-2 py-2 font-medium">Marca</th>
                    <th style={{ width: "4%" }} className="whitespace-nowrap bg-card px-2 py-2 font-medium">Und.</th>
                    <th style={{ width: "6%" }} className="whitespace-nowrap bg-card px-2 py-2 text-right font-medium">Metrado</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap bg-card px-2 py-2 text-right font-medium">P.U. (S/)</th>
                    <th style={{ width: "10%" }} className="whitespace-nowrap bg-card px-3 py-2 text-right font-medium">Presupuesto</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap bg-card px-3 py-2 font-medium">Avance</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap bg-card px-3 py-2 font-medium">Tipo</th>
                    <th style={{ width: "8%" }} className="whitespace-nowrap bg-card px-3 py-2 font-medium">Prioridad</th>
                    <th style={{ width: "9%" }} className="whitespace-nowrap bg-card px-5 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {espGrupos.map(([esp, lista]) => {
                    const claveEsp = `esp:${proyectoId}:${esp}`;
                    const espAbierta = !colapsados.has(claveEsp);
                    return (
                    <React.Fragment key={esp}>
                      <tr className="border-b border-line/40 bg-muted/60">
                        <td className="px-5 py-1.5 font-bold text-ink">
                          <button
                            type="button"
                            onClick={() => alternar(claveEsp)}
                            title={espAbierta ? "Colapsar especialidad" : "Expandir especialidad"}
                            className="inline-flex items-center gap-1"
                          >
                            {espAbierta ? (
                              <ChevronUp size={12} className="text-muted-foreground" />
                            ) : (
                              <ChevronDown size={12} className="text-muted-foreground" />
                            )}
                            {wbs.capitulo(esp)}
                          </button>
                        </td>
                        <td colSpan={5} className="px-3 py-1.5 label-mono font-semibold text-ink">{esp}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right font-bold text-ink">
                          {soles(lista.reduce((s, x) => s + Number(x.presupuesto_inicial), 0))}
                        </td>
                        <td colSpan={4} />
                      </tr>
                      {espAbierta && agruparSoloPorCategoria(lista).map((sub) => (
                      <React.Fragment key={`${esp}-${sub.categoria}`}>
                      {sub.categoria !== "Sin categoría" && (
                        <tr className="border-b border-line/30 bg-muted/30">
                          <td className="px-5 py-1.5 pl-8 text-[10px] font-bold text-ink">
                            {wbs.categoria(esp, sub.categoria)}
                          </td>
                          <td colSpan={5} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/70">
                            {sub.categoria}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-ink">
                            {soles(sub.items.reduce((s, x) => s + Number(x.presupuesto_inicial), 0))}
                          </td>
                          <td colSpan={4} />
                        </tr>
                      )}
                      {ordenarJerarquia(sub.items).map(({ fila: p, nivel, agrupadora, hijos }) => {
                        const enEdicion = editando?.id === p.id;
                        const presuFila = agrupadora
                          ? hijos.reduce((s, h) => s + Number(h.presupuesto_inicial), 0)
                          : Number(p.presupuesto_inicial);
                        const ultimoHijo =
                          nivel === 4 && sub.items.filter((x) => x.padre_id === p.padre_id).at(-1)?.id === p.id;
                        const formSubAqui =
                          nuevaSub &&
                          ((nivel === 4 && ultimoHijo && nuevaSub.padre_id === p.padre_id) ||
                            (nivel === 3 && !agrupadora && nuevaSub.padre_id === p.id));
                        const filaNueva = formSubAqui ? (
                          <tr key={`nueva-${p.id}`} className="border-b border-line/40 bg-primary/5">
                            <td className="px-5 py-2 pl-8">
                              <Input
                                value={nuevaSub.codigo}
                                onChange={(e) => setNuevaSub({ ...nuevaSub, codigo: e.target.value })}
                                className="py-1 font-mono text-xs"
                                placeholder="01.01.01.01"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                autoFocus
                                value={nuevaSub.nombre} data-formato="oracion"
                                onChange={(e) => setNuevaSub({ ...nuevaSub, nombre: e.target.value })}
                                className="py-1 text-xs"
                                placeholder="Descripción de la subpartida"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input value={nuevaSub.marca} data-formato="titulo" onChange={(e) => setNuevaSub({ ...nuevaSub, marca: e.target.value })}
                                className="py-1 text-xs" placeholder="-" />
                            </td>
                            <td className="px-2 py-2">
                              <Select
                                value={nuevaSub.unidad}
                                onChange={(e) => setNuevaSub({ ...nuevaSub, unidad: e.target.value })}
                                className="py-1 text-xs"
                              >
                                {[...new Set([...unidades.filter((u) => u.activo).map((u) => u.simbolo), nuevaSub.unidad])].map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" step="0.01" min="0" value={nuevaSub.metrado}
                                onChange={(e) => setNuevaSub({ ...nuevaSub, metrado: e.target.value })}
                                className="py-1 text-right text-xs" />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" step="0.01" min="0" value={nuevaSub.precio_unitario}
                                onChange={(e) => setNuevaSub({ ...nuevaSub, precio_unitario: e.target.value })}
                                className="py-1 text-right text-xs" />
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-ink">
                              {soles(montoPartida(nuevaSub.metrado, nuevaSub.precio_unitario))}
                            </td>
                            <td colSpan={3} className="px-3 py-2 text-[10px] text-muted-foreground">Nueva subpartida</td>
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
                        ) : null;
                        if (enEdicion) {
                          return (
                            <tr key={p.id} className="border-b border-line/40 last:border-0">
                              <td className="px-5 py-2">
                                <Input
                                  value={editando.codigo}
                                  onChange={(e) => setEditando({ ...editando, codigo: e.target.value })}
                                  className="py-1 font-mono text-xs"
                                  placeholder="05.01"
                                  maxLength={20}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  value={editando.nombre} data-formato="oracion"
                                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                                  className="py-1 text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  value={editando.marca ?? ""} data-formato="titulo"
                                  onChange={(e) => setEditando({ ...editando, marca: e.target.value })}
                                  className="py-1 text-xs"
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Select
                                  value={editando.unidad}
                                  onChange={(e) => setEditando({ ...editando, unidad: e.target.value })}
                                  className="py-1 text-xs"
                                >
                                  {[
                                    ...new Set([
                                      ...unidades.filter((u) => u.activo).map((u) => u.simbolo),
                                      editando.unidad,
                                    ]),
                                  ].map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editando.metrado}
                                  onChange={(e) => setEditando({ ...editando, metrado: e.target.value })}
                                  className="py-1 text-right text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editando.precio_unitario}
                                  onChange={(e) => setEditando({ ...editando, precio_unitario: e.target.value })}
                                  className="py-1 text-right text-xs"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-ink">
                                {soles(montoPartida(editando.metrado, editando.precio_unitario))}
                              </td>
                              <td className="px-3 py-2.5 text-right">{pct(Number(p.avance_pct))}</td>
                              <td className="px-3 py-2">
                                <Select
                                  value={editando.tipo_presupuesto}
                                  onChange={(e) => setEditando({ ...editando, tipo_presupuesto: e.target.value })}
                                  className="py-1 text-xs"
                                >
                                  {nombresTipos.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </Select>
                                {!esContractual(editando.tipo_presupuesto, tipos) && (
                                  <div className="mt-1 space-y-0.5">
                                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <input
                                        type="checkbox"
                                        checked={editando.aplica_gg}
                                        onChange={(e) => setEditando({ ...editando, aplica_gg: e.target.checked })}
                                        className="size-3 accent-[var(--color-primary)]"
                                      />
                                      Con GG
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                      <input
                                        type="checkbox"
                                        checked={editando.aplica_utilidad}
                                        onChange={(e) => setEditando({ ...editando, aplica_utilidad: e.target.checked })}
                                        className="size-3 accent-[var(--color-primary)]"
                                      />
                                      Con utilidad
                                    </label>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <InsigniaPrioridad valor={p.prioridad} />
                              </td>
                              <td className="px-5 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={actualizar}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                    title="Guardar"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditando(null)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                                    title="Cancelar"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <React.Fragment key={p.id}>
                          <tr className={`group border-b border-line/40 last:border-0 ${agrupadora ? "bg-muted/10" : ""}`}>
                            <td className={`py-2.5 pr-2 ${nivel === 4 ? "pl-9" : "pl-5"}`}>
                              {p.codigo ? (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-primary">
                                  <Resaltar texto={p.codigo} termino={busqueda}/>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-ink ${nivel === 4 ? "pl-6 font-normal" : "font-semibold"}`}>
                              {nivel === 4 && <CornerDownRight size={11} className="mr-1 inline text-muted-foreground" />}
                              <Resaltar texto={p.nombre} termino={busqueda}/>
                              {agrupadora && (
                                <span className="ml-1.5 font-mono text-[9px] uppercase text-muted-foreground">
                                  ({hijos.length} subpartidas)
                                </span>
                              )}
                            </td>
                            <td className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-muted-foreground" title={p.marca || undefined}>{agrupadora ? "—" : p.marca || "-"}</td>
                            <td className="px-2 py-2.5 text-muted-foreground">{agrupadora ? "—" : p.unidad || "—"}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right">{agrupadora ? "—" : cantidad(Number(p.metrado ?? 0))}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-right">{agrupadora ? "—" : soles(Number(p.precio_unitario ?? 0))}</td>
                            <td className={`whitespace-nowrap px-3 py-2.5 text-right ${agrupadora ? "font-semibold text-ink" : ""}`}>{soles(presuFila)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right">
                              {(() => {
                                const av = Math.min(100, Math.max(0, Number(p.avance_pct)));
                                const color = av >= 100 ? "bg-good" : av > 0 ? "bg-warn" : "bg-muted-foreground/30";
                                return (
                                  <span className="inline-flex items-center justify-end gap-1.5">
                                    <span className="flex h-3.5 w-16 items-center overflow-hidden rounded-full bg-muted">
                                      <span
                                        className={`flex h-full items-center justify-end rounded-full ${color}`}
                                        style={{ width: `${Math.max(av, 14)}%` }}
                                      >
                                        <span className="pr-0.5 text-[8px] font-bold tabular-nums text-primary-foreground">{Math.round(av)}%</span>
                                      </span>
                                    </span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2.5">
                              <InsigniaTipoPresupuesto valor={p.tipo_presupuesto ?? "Contractual"} />
                              {(() => {
                                const gg = cobraGG(p, tipos);
                                const ut = cobraUtilidad(p, tipos);
                                if (gg && ut) return null;
                                const texto = !gg && !ut ? "Costo neto" : !gg ? "Sin GG" : "Sin utilidad";
                                return (
                                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{texto}</span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2.5">
                              <InsigniaPrioridad valor={p.prioridad} />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                {!agrupadora && (
                                  <button
                                    type="button"
                                    onClick={() => setApu(p)}
                                    title="Análisis de precios unitarios"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                  >
                                    <Calculator size={14} />
                                  </button>
                                )}
                                {nivel === 3 && (
                                  <button
                                    type="button"
                                    onClick={() => abrirSubpartida(p)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                    title="Agregar subpartida (4.° nivel)"
                                  >
                                    <CornerDownRight size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditando({
                                      id: p.id,
                                      codigo: p.codigo ?? "",
                                      nombre: p.nombre,
                                      especialidad: p.especialidad,
                                      categoria: p.categoria ?? "",
                                      marca: p.marca ?? "",
                                      unidad: p.unidad || "GLB",
                                      metrado: String(p.metrado ?? 1),
                                      precio_unitario: String(p.precio_unitario ?? p.presupuesto_inicial),
                                      tipo_presupuesto: p.tipo_presupuesto ?? "Contractual",
                                      aplica_gg: cobraGG({ ...p, tipo_presupuesto: "__adicional__" }, tipos),
                                      aplica_utilidad: cobraUtilidad({ ...p, tipo_presupuesto: "__adicional__" }, tipos),
                                    })
                                  }
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminar(p.id)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {filaNueva}
                          </React.Fragment>
                        );
                      })}
                      </React.Fragment>
                      ))}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
            );
          })
        )}
      </Panel>
      </>
      {apu && (
        <ApuBanco
          origen={ORIGEN_OBRA}
          item={{ ...apu, rendimiento: Number(apu.rendimiento ?? 1), jornada: Number(apu.jornada ?? 8), metrado: Number(apu.metrado ?? 0), partida_apu_id: (apu as { partida_apu_id?: string | null }).partida_apu_id ?? null }}
          invalidar={[["partidas"]]}
          onCerrar={() => setApu(null)}
        />
      )}
    </>
  );
}
