import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LayoutGrid, Pencil, Table2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { InsigniaSituacion } from "@/components/estado-ui";
import { Kanban } from "@/components/Kanban";
import { SITUACIONES, type Situacion } from "@/lib/configuracion";
import { useAuth, puedeVerDinero } from "@/lib/auth";
import { fecha, soles } from "@/lib/format";
import {
  costoRealProyecto,
  ofertaProyecto,
  useTiposPresupuesto,
  presupuestoProyecto,
  useGastosDirectos,
  useGastosGenerales,
  usePartidas,
  useProyectos,
  useTareos,
  useTrabajadores,
} from "@/lib/datos";
import { generarCodigoProyecto, previsualizarCodigo, useCodificacion } from "@/lib/codificacion";

export const Route = createFileRoute("/_authenticated/proyectos")({
  head: () => ({
    meta: [
      { title: "Proyectos — ERP TELXEN" },
      { name: "description", content: "Registro y estado de los proyectos de la empresa constructora." },
      { property: "og:title", content: "Proyectos — ERP TELXEN" },
      { property: "og:description", content: "Registro y estado de los proyectos de la empresa." },
    ],
  }),
  component: Proyectos,
});

function Proyectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: tiposPresupuesto = [] } = useTiposPresupuesto();
  const { data: codificacion } = useCodificacion();
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");
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
    pct_gastos_generales: string;
    pct_utilidad: string;
  } | null>(null);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let codigo = form.codigo.trim().toUpperCase();
    if (!codigo) {
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
      estado: form.estado as "En Ejecucion" | "Finalizado",
      situacion: form.situacion,
      responsable_id: form.responsable_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
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
      pct_gastos_generales: "10",
      pct_utilidad: "10",
    });
    qc.invalidateQueries({ queryKey: ["proyectos"] });
  }

  async function actualizar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const { error: err } = await supabase
      .from("proyectos")
      .update({
        codigo: editando.codigo.trim().toUpperCase() || null,
        nombre: editando.nombre.trim(),
        estado: editando.estado,
        situacion: editando.situacion,
        responsable_id: editando.responsable_id || null,
        fecha_inicio: editando.fecha_inicio || null,
        fecha_fin: editando.fecha_fin || null,
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

  async function mover(id: string, situacion: Situacion) {
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

      <Panel
        titulo="Nuevo proyecto"
        className="mb-4"
        extra={<Boton type="submit" form="form-proyecto">Registrar</Boton>}
      >
        <form id="form-proyecto" onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-6">
          <Campo etiqueta="Código de la obra">
            <Input
              className="uppercase"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              maxLength={30}
              placeholder={codificacion ? previsualizarCodigo(codificacion) : "Automático"}
              title="Déjalo vacío para asignar el código automático"
            />
          </Campo>
          <Campo etiqueta="Cliente">
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Nombre de la obra">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={120} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Estado">
            <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="En Ejecucion">En Ejecución</option>
              <option value="Finalizado">Finalizado</option>
            </Select>
          </Campo>
          <Campo etiqueta="Status">
            <Select value={form.situacion} onChange={(e) => setForm({ ...form, situacion: e.target.value })}>
              {SITUACIONES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Responsable">
            <Select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}>
              <option value="">Sin asignar</option>
              {trabajadores.filter((t) => t.activo).map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} · {t.cargo}</option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Fecha de inicio">
            <Input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Fecha de fin estimada">
            <Input
              type="date"
              value={form.fecha_fin}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="% Gastos Generales">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.pct_gastos_generales}
              onChange={(e) => setForm({ ...form, pct_gastos_generales: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="% Utilidad Prevista">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.pct_utilidad}
              onChange={(e) => setForm({ ...form, pct_utilidad: e.target.value })}
            />
          </Campo>
          <p className="font-mono text-[11px] text-muted-foreground sm:col-span-6">
            Ambos porcentajes se aplican sobre el costo directo neto de las partidas: Oferta = Costo Directo + Gastos
            Generales + Utilidad.
          </p>
          {error && <p className="font-mono text-xs text-bad sm:col-span-6">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo={vista === "tabla" ? "Listado de proyectos" : "Tablero Kanban de proyectos"}
        extra={<span className="font-mono text-[11px] text-muted-foreground">{proyectos.length} proyectos</span>}
      >
        {proyectos.length === 0 ? (
          <Vacio texto="Aún no hay proyectos registrados." />
        ) : vista === "kanban" ? (
          <Kanban
            onMover={mover}
            tarjetas={proyectos.map((p) => ({
              id: p.id,
              situacion: p.situacion,
              contenido: (
                <div className="space-y-1.5">
                  {p.codigo && (
                    <p className="font-mono text-[10px] font-semibold text-primary">{p.codigo}</p>
                  )}
                  <p className="text-xs font-semibold leading-tight text-ink">{p.nombre}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.cliente || "Sin cliente"}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.ubicacion || "Sin ubicación"}</p>
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
                const costoReal = costoRealProyecto(p.id, gastosD, tareos, gastosG);
                return (
                  <tr key={p.id} className="border-b border-line/60">
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
                            {SITUACIONES.map((s) => (
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
                        <td className="px-5 py-2.5 align-top font-semibold text-primary break-words">{p.codigo || "—"}</td>
                        <td className="truncate px-3 py-2.5 text-muted-foreground">{p.cliente || "—"}</td>
                        <td className="px-3 py-2.5 align-top font-semibold text-ink break-words whitespace-normal">
                          {p.nombre}
                          <span className="mt-1 block font-mono text-[10px] font-normal text-muted-foreground">
                            GG {Number(p.pct_gastos_generales ?? 0)}% · Utilidad {Number(p.pct_utilidad ?? 0)}% · Oferta{" "}
                            {soles(
                              ofertaProyecto(
                                partidas.filter((x) => x.proyecto_id === p.id),
                                tiposPresupuesto,
                                p.pct_gastos_generales,
                                p.pct_utilidad,
                              ).ofertado,
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top text-muted-foreground break-words">
                          {trabajadores.find((t) => t.id === p.responsable_id)?.nombre ?? "Sin asignar"}
                        </td>
                        <td className="px-3 py-2.5 align-top text-muted-foreground">
                          <span className="block">{fecha(p.fecha_inicio)}</span>
                          <span className="block">{fecha(p.fecha_fin)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{soles(presupuesto)}</td>
                        <td
                          className={`px-3 py-2.5 text-right whitespace-nowrap ${costoReal > presupuesto && presupuesto > 0 ? "text-bad" : "text-ink"}`}
                        >
                          {soles(costoReal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <InsigniaSituacion valor={p.situacion} />
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
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
