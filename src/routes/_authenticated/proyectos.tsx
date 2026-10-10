import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Calculator, Copy, EllipsisVertical, Eye, Info, LayoutGrid, Plus, SquarePen, Table2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, BotonIcono, Input, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function estadoDe(situacion: string): "En Ejecucion" | "Finalizado" {
  return situacion.trim().toLowerCase().startsWith("finaliz") ? "Finalizado" : "En Ejecucion";
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-line bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
      {children}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</p>
      <div className="mt-0.5 text-sm text-ink">{valor}</div>
    </div>
  );
}

function CampoF({ etiqueta, requerido, children }: { etiqueta: string; requerido?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-bad">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Desglose({
  o,
  pctGG,
  pctUt,
}: {
  o: { costoDirecto: number; gastosGenerales: number; utilidad: number; ofertado: number };
  pctGG: number;
  pctUt: number;
}) {
  const fila = (k: string, v: number, fuerte = false) => (
    <div className={`flex justify-between gap-4 py-1 ${fuerte ? "border-t border-line pt-2 font-semibold text-ink" : "text-muted-foreground"}`}>
      <span>{k}</span>
      <span className="tabular-nums">{soles(v)}</span>
    </div>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <BotonIcono etiqueta="Ver desglose financiero">
          <Calculator size={17} strokeWidth={1.9} />
        </BotonIcono>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 font-mono text-xs">
        <p className="mb-2 text-sm font-semibold text-ink">Desglose financiero</p>
        {fila("Costo directo", o.costoDirecto)}
        {fila(`Gastos generales ${pctGG}%`, o.gastosGenerales)}
        {fila(`Utilidad ${pctUt}%`, o.utilidad)}
        {fila("Oferta", o.ofertado, true)}
      </PopoverContent>
    </Popover>
  );
}
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { InsigniaSituacion } from "@/components/estado-ui";
import { Kanban } from "@/components/Kanban";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { fecha, soles } from "@/lib/format";
import {
  type Proyecto,
  ofertaProyecto,
  useEstadosProyecto,
  nombresEstados,
  useTiposPresupuesto,
  presupuestoProyecto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
  useTerceros,
  useTrabajadores,
} from "@/lib/datos";
import { useTareoVehiculos } from "@/lib/vehiculos";
import { useCostoObras } from "@/lib/costo-obra";
import { generarCodigoProyecto, previsualizarCodigo, useCodificacion } from "@/lib/codificacion";

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — ERP TELXEN" },
      { name: "description", content: "Registro y estado de los proyectos de la empresa constructora." },
      { property: "og:title", content: "Proyectos — ERP TELXEN" },
      { property: "og:description", content: "Registro y estado de los proyectos de la empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Proyectos,
});

function Proyectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: todosProyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { costoDe } = useCostoObras();
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: terceros = [] } = useTerceros();
  const clientes = terceros.filter((t) => t.es_cliente && t.activo);
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const estadosQ = useEstadosProyecto();
  const { data: codificacion } = useCodificacion();
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
  const [busqueda, setBusqueda] = useState("");
  const [segmento, setSegmento] = useState<"Todos" | "Borradores" | "En Ejecución" | "Finalizados" | "Archivados">("Todos");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [viendoId, setViendoId] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const cerrarTrasGuardar = useRef(false);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    cliente: "",
    ubicacion: "",
    estado: "En Ejecucion",
    situacion: "No iniciado",
    responsable_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    avance_programado_pct: "",
    fecha_corte_programado: "",
    pct_gastos_generales: "10",
    pct_utilidad: "10",
    cd_base: "",
  });
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<Proyecto | null>(null);
  const [bajando, setBajando] = useState(false);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const pertenece = (situacion: string, nombre: typeof segmento) => {
    if (nombre === "Borradores") return situacion === "Borrador";
    if (nombre === "En Ejecución") return situacion === "En proceso" || situacion === "Retrasado";
    if (nombre === "Finalizados") return situacion === "Completado";
    return true;
  };
  const segmentos = ["Todos", "Borradores", "En Ejecución", "Finalizados", "Archivados"] as const;
  const proyectos = todosProyectos.filter((p) => {
    const archivado = Boolean(p.archivado_en);
    const visibleSegmento = segmento === "Archivados" ? archivado : !archivado && pertenece(p.situacion, segmento);
    return visibleSegmento && (!clienteFiltro || p.cliente === clienteFiltro) && coincide(busqueda, p.codigo, p.nombre, p.cliente, p.ubicacion);
  });
  const clientesFiltro = useMemo(() => [...new Set(todosProyectos.map((p) => p.cliente).filter(Boolean))].sort(), [todosProyectos]);
  const proyectoVisto = todosProyectos.find((p) => p.id === viendoId) ?? null;

  const camposForm = () => ({
    nombre: form.nombre.trim(),
    cliente: form.cliente.trim(),
    ubicacion: form.ubicacion.trim(),
    estado: estadoDe(form.situacion),
    situacion: form.situacion,
    responsable_id: form.responsable_id || null,
    fecha_inicio: form.fecha_inicio || null,
    fecha_fin: form.fecha_fin || null,
    avance_programado_pct: form.avance_programado_pct === "" ? null : Number(form.avance_programado_pct),
    fecha_corte_programado: form.fecha_corte_programado || null,
    pct_gastos_generales: Number(form.pct_gastos_generales) || 0,
    pct_utilidad: Number(form.pct_utilidad) || 0,
    cd_base: form.cd_base === "" ? null : Number(form.cd_base),
  });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if ((form.avance_programado_pct && !form.fecha_corte_programado) || (!form.avance_programado_pct && form.fecha_corte_programado)) {
      return setError("Registra juntos el avance programado y su fecha de corte.");
    }
    if (editandoId) {
      const { error: err } = await supabase
        .from("proyectos")
        .update({ ...camposForm(), codigo: form.codigo.trim().toUpperCase() || null } as never)
        .eq("id", editandoId);
      if (err)
        return setError(err.code === "23505" ? "Ese código ya está asignado a otra obra." : err.message);
      setEditandoId(null);
      setFormAbierto(false);
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      return;
    }
    let codigo = "";
    try {
      codigo = await generarCodigoProyecto();
    } catch (e2) {
      return setError(
        e2 instanceof Error ? e2.message : "No se pudo generar el código automático de la obra.",
      );
    }
    const { error: err } = await supabase.from("proyectos").insert({ codigo, ...camposForm() } as never);
    if (err)
      return setError(
        err.code === "23505" ? "Ese código ya está asignado a otra obra." : err.message,
      );
    setForm({
      codigo: "",
      nombre: "",
      cliente: "",
      ubicacion: "",
      estado: "En Ejecucion",
      situacion: "No iniciado",
      responsable_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      avance_programado_pct: "",
      fecha_corte_programado: "",
      pct_gastos_generales: "10",
      pct_utilidad: "10",
      cd_base: "",
    });
    if (cerrarTrasGuardar.current) setFormAbierto(false);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  function abrirEdicion(p: Proyecto) {
    setError("");
    setForm({
      codigo: p.codigo ?? "",
      nombre: p.nombre,
      cliente: p.cliente ?? "",
      ubicacion: p.ubicacion ?? "",
      estado: p.estado,
      situacion: p.situacion,
      responsable_id: p.responsable_id ?? "",
      fecha_inicio: p.fecha_inicio ?? "",
      fecha_fin: p.fecha_fin ?? "",
      avance_programado_pct: p.avance_programado_pct === null ? "" : String(p.avance_programado_pct),
      fecha_corte_programado: p.fecha_corte_programado ?? "",
      pct_gastos_generales: String(p.pct_gastos_generales ?? 0),
      pct_utilidad: String(p.pct_utilidad ?? 0),
      cd_base: p.cd_base == null ? "" : String(p.cd_base),
    });
    setEditandoId(p.id);
    setFormAbierto(true);
  }

  async function confirmarBaja() {
    if (!eliminando) return;
    setBajando(true);
    setError("");
    const { error: err } = await supabase.rpc("eliminar_proyecto", { _id: eliminando.id });
    setBajando(false);
    if (err) return setError(err.message);
    setEliminando(null);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function mover(id: string, situacion: string) {
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ situacion }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function cambiarArchivo(id: string, archivar: boolean) {
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ archivado_en: archivar ? new Date().toISOString() : null } as never).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function duplicar(id: string) {
    const original = todosProyectos.find((p) => p.id === id);
    if (!original) return;
    setError("");
    try {
      const codigo = await generarCodigoProyecto();
      const { error: err } = await supabase.from("proyectos").insert({
        codigo,
        nombre: `${original.nombre} (copia)`,
        cliente: original.cliente,
        ubicacion: original.ubicacion,
        estado: "En Ejecucion",
        situacion: "Borrador",
        responsable_id: original.responsable_id,
        fecha_inicio: original.fecha_inicio,
        fecha_fin: original.fecha_fin,
        avance_programado_pct: null,
        fecha_corte_programado: null,
        pct_gastos_generales: original.pct_gastos_generales,
        pct_utilidad: original.pct_utilidad,
      });
      if (err) return setError(err.message);
      setSegmento("Borradores");
      qc.invalidateQueries({ queryKey: ["proyectos"] });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo duplicar el proyecto.");
    }
  }

  return (
    <>
      <Encabezado
        titulo="Proyectos"
        subtitulo="Obras de la empresa"
        acciones={
          <div className="flex items-center gap-2">
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
          <Boton variante="accion" onClick={() => { setError(""); setFormAbierto(true); }}><Plus size={13} /> Nuevo proyecto</Boton>
          </div>
        }
      />

      <VentanaFlotante abierta={formAbierto} onCerrar={() => { setFormAbierto(false); setEditandoId(null); }} titulo={editandoId ? "Editar proyecto" : "Nuevo proyecto"} subtitulo={editandoId ? "Corrige los datos registrados de la obra." : "Registra una obra y continúa con otra sin cerrar la ventana."} ancho="max-w-6xl">
        <form id="form-proyecto" onSubmit={guardar} className="space-y-4 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Seccion titulo="Información General">
              <CampoF etiqueta="Código de la obra">
                {editandoId ? (
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} maxLength={30} title="Código asignado a la obra" />
                ) : (
                  <Input
                    disabled
                    value=""
                    placeholder={codificacion ? previsualizarCodigo(codificacion) : "Automático"}
                    title="Se asigna automáticamente al registrar"
                  />
                )}
              </CampoF>
              <CampoF etiqueta="Cliente">
                <Select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                  <option value="">Sin cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.razon_social}>{c.razon_social}</option>
                  ))}
                </Select>
              </CampoF>
              <CampoF etiqueta="Nombre de la obra" requerido>
                <Input autoFocus={formAbierto} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={120} />
              </CampoF>
              <CampoF etiqueta="Ubicación">
                <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
              </CampoF>
              <CampoF etiqueta="Responsable">
                <Select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {trabajadores.filter((t) => t.activo).map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre} · {t.cargo}</option>
                  ))}
                </Select>
              </CampoF>
            </Seccion>

            <Seccion titulo="Cronograma y Estado">
              <CampoF etiqueta="Estado del Proyecto" requerido>
                <Select value={form.situacion} onChange={(e) => setForm({ ...form, situacion: e.target.value })}>
                  {nombresEstados(estadosQ.data).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </CampoF>
              <div className="grid grid-cols-2 gap-3">
                <CampoF etiqueta="Fecha de Inicio">
                  <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                </CampoF>
                <CampoF etiqueta="Fecha de Fin Estimada">
                  <Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                </CampoF>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoF etiqueta="Fecha de Corte">
                  <Input type="date" value={form.fecha_corte_programado} onChange={(e) => setForm({ ...form, fecha_corte_programado: e.target.value })} />
                </CampoF>
                <CampoF etiqueta="Avance programado (%)">
                  <Input
                    type="number" min={0} max={100} step="0.01"
                    value={form.avance_programado_pct}
                    onChange={(e) => setForm({ ...form, avance_programado_pct: e.target.value })}
                    placeholder="Según cronograma"
                  />
                </CampoF>
              </div>
            </Seccion>

            <Seccion titulo="Costo Directo Base y Finanzas (%)">
              <CampoF etiqueta="Costo Directo Base (techo de obra, S/)">
                <Input type="number" min={0} step="0.01" value={form.cd_base} onChange={(e) => setForm({ ...form, cd_base: e.target.value })} placeholder="Opcional" />
              </CampoF>
              {form.cd_base !== "" && (() => {
                const cd = Number(form.cd_base) || 0;
                const gg = (cd * (Number(form.pct_gastos_generales) || 0)) / 100;
                const ut = (cd * (Number(form.pct_utilidad) || 0)) / 100;
                return (
                  <div className="grid grid-cols-4 gap-2 rounded-md border border-line bg-muted/40 p-2 text-center text-[11px]">
                    <div><p className="text-muted-foreground">C. Directo</p><p className="font-semibold tabular-nums">{soles(cd)}</p></div>
                    <div><p className="text-muted-foreground">+ G. Generales</p><p className="font-semibold tabular-nums">{soles(gg)}</p></div>
                    <div><p className="text-muted-foreground">+ Utilidad</p><p className="font-semibold tabular-nums">{soles(ut)}</p></div>
                    <div><p className="text-muted-foreground">= Contractual</p><p className="font-bold tabular-nums text-primary">{soles(cd + gg + ut)}</p></div>
                  </div>
                );
              })()}
              <p className="text-[10px] text-muted-foreground">Las partidas no podrán sumar más que el Costo Directo Base.</p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <CampoF etiqueta="% Gastos Generales">
                  <Input type="number" min={0} max={100} step="0.1" value={form.pct_gastos_generales} onChange={(e) => setForm({ ...form, pct_gastos_generales: e.target.value })} />
                </CampoF>
                <CampoF etiqueta="% Utilidad Prevista">
                  <Input type="number" min={0} max={100} step="0.1" value={form.pct_utilidad} onChange={(e) => setForm({ ...form, pct_utilidad: e.target.value })} />
                </CampoF>
              </div>
              <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-ink">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  Ambos porcentajes se aplican sobre el costo directo neto de las partidas:{" "}
                  <strong>Oferta = Costo Directo + Gastos Generales + Utilidad.</strong>
                </p>
              </div>
            </Seccion>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
            <Boton type="button" variante="linea" onClick={() => { setFormAbierto(false); setEditandoId(null); }}>Cancelar</Boton>
            {editandoId ? (
              <Boton type="submit" variante="accion" className="px-6 py-2.5 text-sm">Guardar cambios</Boton>
            ) : (
              <>
                <Boton type="submit" variante="linea" onClick={() => { cerrarTrasGuardar.current = false; }}>Registrar otro</Boton>
                <Boton type="submit" variante="accion" className="px-6 py-2.5 text-sm" onClick={() => { cerrarTrasGuardar.current = true; }}>Registrar y cerrar</Boton>
              </>
            )}
          </div>
          {error && <p className="font-mono text-xs text-bad">{error}</p>}
        </form>
      </VentanaFlotante>

      <Panel
        titulo={vista === "tabla" ? "Listado de proyectos" : "Tablero Kanban de proyectos"}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Buscador valor={busqueda} onChange={setBusqueda} total={proyectos.length} placeholder="Buscar proyecto..." />
            <Select aria-label="Filtrar por cliente" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)} className="w-52 py-1.5 text-xs">
              <option value="">Todos los clientes</option>
              {clientesFiltro.map((cliente) => <option key={cliente} value={cliente}>{cliente}</option>)}
            </Select>
          </div>
        }
      >
        <div className="flex overflow-x-auto border-b border-line px-4 pt-2" aria-label="Estados de proyectos">
          {segmentos.map((item) => {
            const cantidad = todosProyectos.filter((p) => item === "Archivados" ? Boolean(p.archivado_en) : !p.archivado_en && pertenece(p.situacion, item)).length;
            return (
              <Boton key={item} type="button" variante="linea" onClick={() => setSegmento(item)} className={`shrink-0 rounded-b-none border-b-0 ${segmento === item ? "bg-primary text-primary-foreground" : "border-transparent text-muted-foreground"}`}>
                {item}<span className="tabular-nums opacity-70">{cantidad}</span>
              </Boton>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 bg-primary/10 px-4 py-2 font-mono text-[11px] text-primary">
          <Info size={13} className="shrink-0" />
          El presupuesto del proyecto se completa automáticamente a partir de las partidas registradas.
        </p>
        {proyectos.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : "Aún no hay proyectos registrados."} />
        ) : vista === "kanban" ? (
          <Kanban
            onMover={mover}
            tarjetas={proyectos.map((p) => ({
              id: p.id,
              situacion: p.situacion,
              contenido: (
                <div className="space-y-1.5">
                  {p.codigo && (
                    <p className="font-mono text-[10px] font-semibold text-primary"><Resaltar texto={p.codigo} termino={busqueda} /></p>
                  )}
                  <p className="text-xs font-semibold leading-tight text-ink"><Resaltar texto={p.nombre} termino={busqueda} /></p>
                  <p className="font-mono text-[10px] text-muted-foreground"><Resaltar texto={p.cliente || "Sin cliente"} termino={busqueda} /></p>
                  <p className="font-mono text-[10px] text-muted-foreground"><Resaltar texto={p.ubicacion || "Sin ubicación"} termino={busqueda} /></p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {trabajadores.find((t) => t.id === p.responsable_id)?.nombre ?? "Sin responsable"}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {fecha(p.fecha_inicio)} — {fecha(p.fecha_fin)}
                  </p>
                </div>
              ),
            }))}
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed font-['Roboto'] text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[7%] px-5 py-2 font-medium">Código</th>
                <th className="w-[11%] px-3 py-2 font-medium">Cliente</th>
                <th className="w-[18%] px-3 py-2 font-medium">Nombre de la obra</th>
                <th className="w-[10%] px-3 py-2 font-medium">Responsable</th>
                <th className="w-[10%] px-3 py-2 font-medium">Plazo</th>
                <th className="w-[7%] px-3 py-2 font-medium">Avance</th>
                <th className="w-[7%] px-3 py-2 text-right font-medium">Presupuesto</th>
                <th className="w-[8%] px-3 py-2 text-right font-medium">Costo ejecutado</th>
                <th className="w-[7%] px-3 py-2 font-medium">ESTADO</th>
                <th className="w-[215px] px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => {
                const presupuesto = presupuestoProyecto(p.id, partidas);
                const costoReal = costoDe(p.id).costoReal;
                return (
                  <tr key={p.id} className="border-b border-line/60 transition-colors hover:bg-muted/50">
                        <td className="px-5 py-3 align-top font-bold text-ink break-words"><Resaltar texto={p.codigo || "—"} termino={busqueda} /></td>
                        <td className="px-3 py-3 align-top break-words whitespace-normal text-muted-foreground" title={p.cliente || ""}><Resaltar texto={p.cliente || "—"} termino={busqueda} /></td>
                        <td className="px-3 py-3 align-top text-[13px] font-semibold text-ink break-words whitespace-normal">
                          <Resaltar texto={p.nombre} termino={busqueda} />
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground break-words">
                          {trabajadores.find((t) => t.id === p.responsable_id)?.nombre ?? "Sin asignar"}
                        </td>
                        <td className="px-3 py-3 align-top text-ink">
                          <span className="block">{fecha(p.fecha_inicio)} — {fecha(p.fecha_fin)}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Programado</span><span className="tabular-nums">{p.avance_programado_pct === null ? "—" : `${Number(p.avance_programado_pct).toFixed(1)}%`}</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, Number(p.avance_programado_pct ?? 0)))}%` }} /></div>
                        </td>
                        <td className="px-3 py-3 align-top text-right whitespace-nowrap tabular-nums">{soles(presupuesto)}</td>
                        <td
                          className={`px-3 py-3 align-top text-right whitespace-nowrap tabular-nums ${costoReal > presupuesto && presupuesto > 0 ? "text-bad" : "text-ink"}`}
                        >
                          {soles(costoReal)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <InsigniaSituacion valor={p.situacion} />
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            <Desglose
                              o={ofertaProyecto(
                                partidas.filter((x) => x.proyecto_id === p.id),
                                tiposPresupuesto,
                                p.pct_gastos_generales,
                                p.pct_utilidad,
                              )}
                              pctGG={Number(p.pct_gastos_generales ?? 0)}
                              pctUt={Number(p.pct_utilidad ?? 0)}
                            />
                            <BotonIcono etiqueta="Ver datos de registro" onClick={() => setViendoId(p.id)}>
                              <Eye size={17} strokeWidth={1.9} />
                            </BotonIcono>
                            <BotonIcono etiqueta="Editar proyecto" tono="primario" onClick={() => abrirEdicion(p)}>
                              <SquarePen size={17} strokeWidth={1.9} />
                            </BotonIcono>
                            <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
                            <BotonIcono etiqueta="Eliminar proyecto" tono="peligro" onClick={() => { setError(""); setEliminando(p); }}>
                              <Trash2 size={17} strokeWidth={1.9} />
                            </BotonIcono>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <BotonIcono etiqueta="Más acciones">
                                  <EllipsisVertical size={17} strokeWidth={1.9} />
                                </BotonIcono>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => duplicar(p.id)}><Copy size={15} strokeWidth={1.9} /> Duplicar como borrador</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => cambiarArchivo(p.id, !p.archivado_en)}>{p.archivado_en ? <ArchiveRestore size={15} strokeWidth={1.9} /> : <Archive size={15} strokeWidth={1.9} />}{p.archivado_en ? "Restaurar" : "Archivar"}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Panel>
      <VentanaFlotante abierta={Boolean(proyectoVisto)} onCerrar={() => setViendoId(null)} titulo="Datos de registro de la obra" subtitulo={proyectoVisto?.codigo ?? ""} ancho="max-w-3xl">
        {proyectoVisto && (
          <div className="space-y-4 p-5 font-['Roboto']">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Dato etiqueta="Código" valor={proyectoVisto.codigo || "—"} />
              <Dato etiqueta="Cliente" valor={proyectoVisto.cliente || "Sin cliente"} />
              <Dato etiqueta="Nombre de la obra" valor={proyectoVisto.nombre} />
              <Dato etiqueta="Ubicación" valor={proyectoVisto.ubicacion || "Sin ubicación"} />
              <Dato etiqueta="Responsable" valor={trabajadores.find((t) => t.id === proyectoVisto.responsable_id)?.nombre ?? "Sin asignar"} />
              <Dato etiqueta="Situación" valor={<InsigniaSituacion valor={proyectoVisto.situacion} />} />
              <Dato etiqueta="Fecha de inicio" valor={fecha(proyectoVisto.fecha_inicio)} />
              <Dato etiqueta="Fecha de fin estimada" valor={fecha(proyectoVisto.fecha_fin)} />
              <Dato etiqueta="Fecha de corte programado" valor={fecha(proyectoVisto.fecha_corte_programado)} />
              <Dato etiqueta="Avance programado" valor={proyectoVisto.avance_programado_pct === null ? "—" : `${Number(proyectoVisto.avance_programado_pct).toFixed(1)}%`} />
              <Dato etiqueta="% Gastos Generales" valor={`${Number(proyectoVisto.pct_gastos_generales ?? 0)}%`} />
              <Dato etiqueta="% Utilidad Prevista" valor={`${Number(proyectoVisto.pct_utilidad ?? 0)}%`} />
              <Dato etiqueta="Costo Directo Base" valor={proyectoVisto.cd_base == null ? "Sin techo definido" : soles(proyectoVisto.cd_base)} />
              <Dato etiqueta="Registrada" valor={fecha(proyectoVisto.created_at?.slice(0, 10) ?? null)} />
            </div>
            {(() => {
              const o = ofertaProyecto(
                partidas.filter((x) => x.proyecto_id === proyectoVisto.id),
                tiposPresupuesto,
                proyectoVisto.pct_gastos_generales,
                proyectoVisto.pct_utilidad,
              );
              return (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-muted/40 p-3 text-center text-xs sm:grid-cols-4">
                  <div><p className="text-muted-foreground">C. Directo</p><p className="font-semibold tabular-nums text-ink">{soles(o.costoDirecto)}</p></div>
                  <div><p className="text-muted-foreground">+ G. Generales</p><p className="font-semibold tabular-nums text-ink">{soles(o.gastosGenerales)}</p></div>
                  <div><p className="text-muted-foreground">+ Utilidad</p><p className="font-semibold tabular-nums text-ink">{soles(o.utilidad)}</p></div>
                  <div><p className="text-muted-foreground">= Presupuesto</p><p className="font-bold tabular-nums text-primary">{soles(o.ofertado)}</p></div>
                </div>
              );
            })()}
            <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-xs">
              <span className="text-muted-foreground">Costo ejecutado a la fecha</span>
              <span className="font-semibold tabular-nums text-ink">{soles(costoDe(proyectoVisto.id).costoReal)}</span>
            </div>
          </div>
        )}
      </VentanaFlotante>

      <VentanaFlotante abierta={Boolean(eliminando)} onCerrar={() => { setEliminando(null); setError(""); }} titulo="Eliminar obra" subtitulo={eliminando?.codigo ?? ""} ancho="max-w-md">
        {eliminando && (
          <div className="space-y-4 p-5 font-['Roboto']">
            <p className="text-sm leading-relaxed text-ink">
              Se quitará <strong>{eliminando.nombre}</strong> de la lista y se borrarán sus{" "}
              <strong>{partidas.filter((x) => x.proyecto_id === eliminando.id).length}</strong> partida(s). Esta acción no se puede deshacer.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Si la obra ya tiene compras, facturas, tareos u otros registros, no se dejará eliminar: en ese caso archívela para quitarla de la lista sin perder historial.
            </p>
            {error && <p className="rounded-md border border-bad/30 bg-bad/10 p-3 text-xs leading-relaxed text-bad">{error}</p>}
            <div className="flex justify-end gap-3">
              <Boton type="button" variante="linea" onClick={() => { setEliminando(null); setError(""); }} disabled={bajando}>Cancelar</Boton>
              <Boton type="button" variante="peligro" onClick={() => void confirmarBaja()} disabled={bajando}>{bajando ? "Eliminando..." : "Eliminar definitivamente"}</Boton>
            </div>
          </div>
        )}
      </VentanaFlotante>
    </>
  );
}
