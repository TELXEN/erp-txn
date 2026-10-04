import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Eye, Info, LayoutGrid, Pencil, Table2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-primary hover:text-primary"
          title="Ver desglose financiero"
        >
          <Eye className="size-4" />
        </button>
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
  costoRealProyecto,
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
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: terceros = [] } = useTerceros();
  const clientes = terceros.filter((t) => t.es_cliente && t.activo);
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const estadosQ = useEstadosProyecto();
  const { data: codificacion } = useCodificacion();
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
  const [busqueda, setBusqueda] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
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
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    codigo: string;
    nombre: string;
    estado: "En Ejecucion" | "Finalizado";
    situacion: string;
    responsable_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    avance_programado_pct: string;
    fecha_corte_programado: string;
    pct_gastos_generales: string;
    pct_utilidad: string;
  } | null>(null);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const proyectos = todosProyectos.filter((p) =>
    coincide(busqueda, p.codigo, p.nombre, p.cliente, p.ubicacion),
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if ((form.avance_programado_pct && !form.fecha_corte_programado) || (!form.avance_programado_pct && form.fecha_corte_programado)) {
      return setError("Registra juntos el avance programado y su fecha de corte.");
    }
    let codigo = "";
    {
      try {
        codigo = await generarCodigoProyecto();
      } catch (e2) {
        return setError(
          e2 instanceof Error ? e2.message : "No se pudo generar el código automático de la obra.",
        );
      }
    }
    const { error: err } = await supabase.from("proyectos").insert({
      codigo,
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
    });
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
    });
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function actualizar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    if ((editando.avance_programado_pct && !editando.fecha_corte_programado) || (!editando.avance_programado_pct && editando.fecha_corte_programado)) {
      return setError("Registra juntos el avance programado y su fecha de corte.");
    }
    const { error: err } = await supabase
      .from("proyectos")
      .update({
        codigo: editando.codigo.trim().toUpperCase() || null,
        nombre: editando.nombre.trim(),
        estado: estadoDe(editando.situacion),
        situacion: editando.situacion,
        responsable_id: editando.responsable_id || null,
        fecha_inicio: editando.fecha_inicio || null,
        fecha_fin: editando.fecha_fin || null,
        avance_programado_pct: editando.avance_programado_pct === "" ? null : Number(editando.avance_programado_pct),
        fecha_corte_programado: editando.fecha_corte_programado || null,
        pct_gastos_generales: Number(editando.pct_gastos_generales) || 0,
        pct_utilidad: Number(editando.pct_utilidad) || 0,
      })
      .eq("id", editando.id);
    if (err)
      return setError(
        err.code === "23505" ? "Ese código ya está asignado a otra obra." : err.message,
      );
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function mover(id: string, situacion: string) {
    setError("");
    const { error: err } = await supabase.from("proyectos").update({ situacion }).eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este proyecto? Se perderán las partidas, tareos y gastos vinculados.")) return;
    await supabase.from("proyectos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  return (
    <>
      <Encabezado
        titulo="Proyectos"
        subtitulo="Obras de la empresa"
        acciones={
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
        }
      />

      <Panel titulo="Nuevo proyecto" className="mb-4">
        <form id="form-proyecto" onSubmit={guardar} className="space-y-4 p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Seccion titulo="Información General">
              <CampoF etiqueta="Código de la obra">
                <Input
                  disabled
                  value=""
                  placeholder={codificacion ? previsualizarCodigo(codificacion) : "Automático"}
                  title="Se asigna automáticamente al registrar"
                />
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
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={120} />
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

            <Seccion titulo="Finanzas (%)">
              <div className="grid grid-cols-2 gap-3">
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
          <div className="flex flex-wrap items-center justify-end gap-3">
            {error && <p className="mr-auto font-mono text-xs text-bad">{error}</p>}
            <Boton type="submit" variante="accion" className="px-6 py-2.5 text-sm">Registrar</Boton>
          </div>
        </form>
      </Panel>

      <Panel
        titulo={vista === "tabla" ? "Listado de proyectos" : "Tablero Kanban de proyectos"}
        extra={<Buscador valor={busqueda} onChange={setBusqueda} total={proyectos.length} placeholder="Buscar proyecto..." />}
      >
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
          <table className="w-full min-w-[1180px] table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[11%] px-5 py-2 font-medium">Código</th>
                <th className="w-[12%] px-3 py-2 font-medium">Cliente</th>
                <th className="w-[20%] px-3 py-2 font-medium">Nombre de la obra</th>
                <th className="w-[14%] px-3 py-2 font-medium">Responsable</th>
                <th className="w-[13%] px-3 py-2 font-medium">Plazo</th>
                <th className="w-[10%] px-3 py-2 text-right font-medium">Presupuesto</th>
                <th className="w-[10%] px-3 py-2 text-right font-medium">Costo ejecutado</th>
                <th className="w-[7%] px-3 py-2 font-medium">ESTADO</th>
                <th className="w-[7%] px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => {
                const enEdicion = editando?.id === p.id;
                const presupuesto = presupuestoProyecto(p.id, partidas);
                const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG, tareoVeh);
                return (
                  <tr key={p.id} className="border-b border-line/60 transition-colors hover:bg-muted/50">
                    {enEdicion ? (
                      <>
                        <td className="px-5 py-2 align-top">
                          <Input
                            className="py-1 text-[11px] uppercase"
                            value={editando.codigo}
                            onChange={(e) => setEditando({ ...editando, codigo: e.target.value })}
                            maxLength={30}
                            placeholder="Código"
                            title="Código de la obra"
                          />
                        </td>
                        <td className="truncate px-3 py-2.5 text-muted-foreground">{p.cliente || "—"}</td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            value={editando.nombre}
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                            maxLength={120}
                            autoFocus
                          />
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              className="py-1 text-[11px]"
                              value={editando.pct_gastos_generales}
                              onChange={(e) => setEditando({ ...editando, pct_gastos_generales: e.target.value })}
                              title="% Gastos Generales"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              className="py-1 text-[11px]"
                              value={editando.pct_utilidad}
                              onChange={(e) => setEditando({ ...editando, pct_utilidad: e.target.value })}
                              title="% Utilidad Prevista"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Select
                            value={editando.responsable_id}
                            onChange={(e) => setEditando({ ...editando, responsable_id: e.target.value })}
                            className="py-1 text-[11px]"
                          >
                            <option value="">Sin asignar</option>
                            {trabajadores.filter((t) => t.activo || t.id === editando.responsable_id).map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="grid gap-1.5">
                            <Input
                              type="date"
                              className="py-1 text-[11px]"
                              value={editando.fecha_inicio}
                              onChange={(e) => setEditando({ ...editando, fecha_inicio: e.target.value })}
                              title="Fecha de inicio"
                            />
                            <Input
                              type="date"
                              className="py-1 text-[11px]"
                              value={editando.fecha_fin}
                              onChange={(e) => setEditando({ ...editando, fecha_fin: e.target.value })}
                              title="Fecha de fin estimada"
                            />
                            <div className="grid grid-cols-2 gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                className="py-1 text-[11px]"
                                value={editando.avance_programado_pct}
                                onChange={(e) => setEditando({ ...editando, avance_programado_pct: e.target.value })}
                                placeholder="Prog. %"
                                title="Avance programado acumulado"
                              />
                              <Input
                                type="date"
                                className="py-1 text-[11px]"
                                value={editando.fecha_corte_programado}
                                onChange={(e) => setEditando({ ...editando, fecha_corte_programado: e.target.value })}
                                title="Fecha de corte programada"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{soles(presupuesto)}</td>
                        <td
                          className={`px-3 py-2.5 text-right whitespace-nowrap ${costoReal > presupuesto && presupuesto > 0 ? "text-bad" : "text-ink"}`}
                        >
                          {soles(costoReal)}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={editando.situacion}
                            onChange={(e) => setEditando({ ...editando, situacion: e.target.value })}
                            className="py-1 text-xs"
                          >
                            {nombresEstados(estadosQ.data).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => actualizar()}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-primary hover:text-primary"
                              title="Guardar"
                            >
                              <Check className="size-4" />
                            </button>
                            <button
                              onClick={() => setEditando(null)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-bad hover:text-bad"
                              title="Cancelar"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 align-top font-bold text-ink break-words"><Resaltar texto={p.codigo || "—"} termino={busqueda} /></td>
                        <td className="truncate px-3 py-3 align-top text-muted-foreground"><Resaltar texto={p.cliente || "—"} termino={busqueda} /></td>
                        <td className="px-3 py-3 align-top text-[13px] font-semibold text-ink break-words whitespace-normal">
                          <Resaltar texto={p.nombre} termino={busqueda} />
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground break-words">
                          {trabajadores.find((t) => t.id === p.responsable_id)?.nombre ?? "Sin asignar"}
                        </td>
                        <td className="px-3 py-3 align-top text-ink">
                          <span className="block">{fecha(p.fecha_inicio)} — {fecha(p.fecha_fin)}</span>
                          <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">
                            Programado {p.avance_programado_pct === null ? "—" : `${Number(p.avance_programado_pct).toFixed(2)}%`}
                          </span>
                          {p.fecha_corte_programado && (
                            <span className="block text-[10px] text-muted-foreground">Corte {fecha(p.fecha_corte_programado)}</span>
                          )}
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
                        <td className="px-5 py-3 align-top text-right">
                          <div className="inline-flex items-center gap-1.5">
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
                            <button
                              onClick={() =>
                                setEditando({
                                  id: p.id,
                                  codigo: p.codigo ?? "",
                                  nombre: p.nombre,
                                  estado: p.estado,
                                  situacion: p.situacion,
                                  responsable_id: p.responsable_id ?? "",
                                  fecha_inicio: p.fecha_inicio ?? "",
                                  fecha_fin: p.fecha_fin ?? "",
                                   avance_programado_pct: p.avance_programado_pct === null ? "" : String(p.avance_programado_pct),
                                   fecha_corte_programado: p.fecha_corte_programado ?? "",
                                  pct_gastos_generales: String(p.pct_gastos_generales ?? 0),
                                  pct_utilidad: String(p.pct_utilidad ?? 0),
                                })
                              }
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-primary hover:text-primary"
                              title="Editar"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              onClick={() => eliminar(p.id)}
                              className="grid h-7 w-7 place-items-center rounded-md border border-line hover:border-bad hover:text-bad"
                              title="Eliminar"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Panel>
    </>
  );
}
