import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, mesActual, soles } from "@/lib/format";
import { usePartidas, useProyectos, useTareos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/tareo")({
  head: () => ({
    meta: [
      { title: "Tareo Diario — Control de Proyectos" },
      { name: "description", content: "Registro de asistencia diaria y costo de mano de obra en Soles por partida." },
      { property: "og:title", content: "Tareo Diario — Control de Proyectos" },
      { property: "og:description", content: "Asistencia diaria y costo de mano de obra en Soles." },
    ],
  }),
  component: TareoPage,
});

function TareoPage() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: tareos = [] } = useTareos();

  const [fechas, setFechas] = useState<string[]>([hoy()]);
  const [nuevaFecha, setNuevaFecha] = useState(hoy());
  const [form, setForm] = useState({ trabajador_id: "", proyecto_id: "", asistencia: "1" });
  const [mes, setMes] = useState(mesActual());
  const [error, setError] = useState("");

  const partidasProyecto = partidas.filter((p) => p.proyecto_id === form.proyecto_id);
  const nombreTrab = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";
  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";

  const consolidado = useMemo(() => {
    const delMes = tareos.filter((t) => t.fecha.slice(0, 7) === mes);
    const mapa = new Map<string, { dias: number; costo: number }>();
    delMes.forEach((t) => {
      const acc = mapa.get(t.trabajador_id) ?? { dias: 0, costo: 0 };
      acc.dias += Number(t.asistencia);
      acc.costo += Number(t.costo_soles);
      mapa.set(t.trabajador_id, acc);
    });
    return [...mapa.entries()].map(([id, v]) => ({ id, nombre: nombreTrab(id), ...v }));
  }, [tareos, mes, trabajadores]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trabajador = trabajadores.find((t) => t.id === form.trabajador_id);
    if (!trabajador || fechas.length === 0) return setError("Selecciona trabajador y al menos una fecha.");
    const asistencia = Number(form.asistencia);
    const filas = fechas.map((f) => ({
      fecha: f,
      trabajador_id: form.trabajador_id,
      proyecto_id: form.proyecto_id,
      asistencia,
      costo_soles: asistencia * Number(trabajador.jornal_diario),
    }));
    const { error: err } = await supabase.from("tareos").insert(filas);
    if (err) return setError(err.message);
    setFechas([hoy()]);
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }

  async function eliminar(id: string) {
    await supabase.from("tareos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }

  function exportar() {
    exportarExcel(`tareo-${mes}`, [
      {
        nombre: "Consolidado Mensual",
        filas: consolidado.map((c) => ({
          Trabajador: c.nombre,
          "Dias Laborados": c.dias,
          "Costo Mano de Obra (S/)": c.costo,
        })),
      },
      {
        nombre: "Detalle",
        filas: tareos
          .filter((t) => t.fecha.slice(0, 7) === mes)
          .map((t) => ({
            Fecha: t.fecha,
            Trabajador: nombreTrab(t.trabajador_id),
            Proyecto: nombreProy(t.proyecto_id),
            Asistencia: Number(t.asistencia),
            "Costo (S/)": Number(t.costo_soles),
          })),
      },
    ]);
  }

  const totalMes = consolidado.reduce((s, c) => s + c.costo, 0);

  return (
    <>
      <Encabezado
        titulo="Tareo Diario"
        subtitulo="Asistencia y mano de obra"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Registrar asistencia" className="mb-4">
        <form onSubmit={guardar} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Campo etiqueta="Trabajador">
              <Select value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {trabajadores.filter((t) => t.activo).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Proyecto">
              <Select
                value={form.proyecto_id}
                onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })}
                required
              >
                <option value="">Selecciona...</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Asistencia">
              <Select value={form.asistencia} onChange={(e) => setForm({ ...form, asistencia: e.target.value })}>
                <option value="1">Día Completo (1)</option>
                <option value="0.5">Medio Día (0.5)</option>
              </Select>
            </Campo>
          </div>

          <div className="rounded-md border border-line bg-muted/40 p-3">
            <p className="label-mono">Fechas del registro</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {fechas.map((f) => (
                <span key={f} className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 font-mono text-[11px] ring-1 ring-line">
                  {fmtFecha(f)}
                  <button type="button" onClick={() => setFechas(fechas.filter((x) => x !== f))} className="text-bad">
                    ×
                  </button>
                </span>
              ))}
              <Input type="date" className="w-40" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
              <Boton
                type="button"
                variante="linea"
                onClick={() => !fechas.includes(nuevaFecha) && setFechas([...fechas, nuevaFecha])}
              >
                Añadir fecha
              </Boton>
            </div>
          </div>

          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          <Boton type="submit">Registrar tareo ({fechas.length} día(s))</Boton>
        </form>
      </Panel>

      <Panel
        titulo="Consolidado mensual"
        className="mb-4"
        extra={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">Total: {soles(totalMes)}</span>
            <Input type="month" className="w-40" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
        }
      >
        {consolidado.length === 0 ? (
          <Vacio texto="Sin tareos registrados en este mes." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Trabajador</th>
                <th className="px-3 py-2 text-right font-medium">Días laborados</th>
                <th className="px-5 py-2 text-right font-medium">Costo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {consolidado.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink">{c.nombre}</td>
                  <td className="px-3 py-2.5 text-right">{c.dias}</td>
                  <td className="px-5 py-2.5 text-right">{soles(c.costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel titulo="Últimos registros">
        {tareos.length === 0 ? (
          <Vacio texto="Aún no hay tareos." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Trabajador</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 text-right font-medium">Asist.</th>
                <th className="px-3 py-2 text-right font-medium">Costo</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tareos.slice(0, 40).map((t) => (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5">{fmtFecha(t.fecha)}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{nombreTrab(t.trabajador_id)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{nombreProy(t.proyecto_id)}</td>
                  <td className="px-3 py-2.5 text-right">{Number(t.asistencia)}</td>
                  <td className="px-3 py-2.5 text-right">{soles(Number(t.costo_soles))}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button onClick={() => eliminar(t.id)} className="font-mono text-[11px] text-bad">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
