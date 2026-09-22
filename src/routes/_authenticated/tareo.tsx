import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, mesActual, soles } from "@/lib/format";
import { clasificacionDeCargo, useCargos, useProyectos, useTareos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/tareo")({
  head: () => ({
    meta: [
      { title: "Tareo Diario — ERP TELXEN" },
      { name: "description", content: "Registro de asistencia diaria y costo de mano de obra en Soles por partida." },
      { property: "og:title", content: "Tareo Diario — ERP TELXEN" },
      { property: "og:description", content: "Asistencia diaria y costo de mano de obra en Soles." },
    ],
  }),
  component: TareoPage,
});

function cambiarMes(mes: string, delta: number) {
  const [y = 0, m = 1] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

type TipoDia = "dia" | "viaje" | "extras";

function colorDia(tipo: TipoDia | undefined): string {
  if (tipo === "dia") return "border-primary bg-primary text-primary-foreground";
  if (tipo === "viaje") return "border-good/50 bg-good/20 text-ink";
  if (tipo === "extras") return "border-sky-400/60 bg-sky-200/70 text-ink";
  return "border-line bg-card";
}

function tipoDeTareo(t: { tipo?: string; asistencia: number | string }): TipoDia {
  if (t.tipo === "viaje" || t.tipo === "extras" || t.tipo === "dia") return t.tipo;
  const a = Number(t.asistencia);
  if (a === 1) return "dia";
  if (a === 0.5) return "viaje";
  return "extras";
}

function TareoPage() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: tareos = [] } = useTareos();
  const { data: cargos = [] } = useCargos();

  const [diasSel, setDiasSel] = useState<Record<string, TipoDia>>({ [hoy()]: "dia" });
  const [mesCal, setMesCal] = useState(mesActual());
  const [form, setForm] = useState({ trabajador_id: "", proyecto_id: "", asistencia: "dia" });
  const [horasExtras, setHorasExtras] = useState("");
  const [mes, setMes] = useState(mesActual());
  const [error, setError] = useState("");
  const [trabajadorVisible, setTrabajadorVisible] = useState<string | null>(null);
  const [editandoCalendario, setEditandoCalendario] = useState(false);
  const [diasEditados, setDiasEditados] = useState<Record<string, TipoDia>>({});
  const [proyectoEdicion, setProyectoEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [anioCal = 2026, mesNumCal = 1] = mesCal.split("-").map(Number);
  const primerDia = (new Date(anioCal, mesNumCal - 1, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anioCal, mesNumCal, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array<string | null>(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => `${mesCal}-${String(i + 1).padStart(2, "0")}`),
  ];
  const alternarDia = (f: string) =>
    setDiasSel((actual) => {
      const copia = { ...actual };
      if (copia[f]) delete copia[f];
      else copia[f] = form.asistencia as TipoDia;
      return copia;
    });
  const fechasOrdenadas = Object.keys(diasSel).sort();
  const piso2 = (n: number) => Math.floor(n * 100) / 100;

  const nombreTrab = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";
  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";

  const consolidado = useMemo(() => {
    const delMes = tareos.filter((t) => t.fecha.slice(0, 7) === mes);
    const mapa = new Map<string, { dias: number; horas: number }>();
    delMes.forEach((t) => {
      const acc = mapa.get(t.trabajador_id) ?? { dias: 0, horas: 0 };
      if (tipoDeTareo(t) === "extras") acc.horas += Number(t.asistencia) * 10.5;
      else acc.dias += Number(t.asistencia);
      mapa.set(t.trabajador_id, acc);
    });
    return [...mapa.entries()].map(([id, v]) => {
      const trabajador = trabajadores.find((t) => t.id === id);
      const jornal = Number(trabajador?.jornal_diario ?? 0);
      const diasTotal = v.dias + piso2(v.horas / 10.5); // valor de cálculo, no se muestra
      return {
        id,
        nombre: nombreTrab(id),
        dias: v.dias,
        horas: v.horas,
        costo: diasTotal * jornal,
        clasificacion: clasificacionDeCargo(trabajador?.cargo ?? "", cargos),
      };
    });
  }, [tareos, mes, trabajadores, cargos]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trabajador = trabajadores.find((t) => t.id === form.trabajador_id);
    if (!trabajador || fechasOrdenadas.length === 0) return setError("Selecciona trabajador y al menos una fecha.");
    const filas = fechasOrdenadas.map((f) => {
      const tipo: TipoDia = diasSel[f] === "viaje" ? "viaje" : "dia";
      const asistencia = tipo === "viaje" ? 0.5 : 1;
      return {
        fecha: f,
        trabajador_id: form.trabajador_id,
        proyecto_id: form.proyecto_id,
        tipo,
        asistencia,
        costo_soles: asistencia * Number(trabajador.jornal_diario),
      };
    });
    const { error: err } = await supabase.from("tareos").insert(filas);
    if (err)
      return setError(
        err.code === "23505"
          ? "Ya existe un registro de este tipo para ese día. Elige otro tipo (por ejemplo Horas Extras) o corrige el día desde el consolidado."
          : err.message,
      );
    setDiasSel({ [hoy()]: "dia" });
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }

  async function registrarExtras() {
    setError("");
    const trabajador = trabajadores.find((t) => t.id === form.trabajador_id);
    const horas = Number(horasExtras);
    if (!trabajador || !form.proyecto_id) return setError("Selecciona trabajador y proyecto.");
    if (!horas || horas <= 0) return setError("Ingresa las horas extras.");
    if (fechasOrdenadas.length === 0) return setError("Marca al menos un día en el calendario.");
    const asistencia = piso2(horas / 10.5);
    const filas = fechasOrdenadas.map((f) => ({
      fecha: f,
      trabajador_id: form.trabajador_id,
      proyecto_id: form.proyecto_id,
      tipo: "extras" as TipoDia,
      asistencia,
      costo_soles: asistencia * Number(trabajador.jornal_diario),
    }));
    const { error: err } = await supabase.from("tareos").insert(filas);
    if (err)
      return setError(
        err.code === "23505"
          ? "Ya hay horas extras registradas en uno de esos días. Corrige el día desde el consolidado."
          : err.message,
      );
    setDiasSel({ [hoy()]: "dia" });
    setHorasExtras("");
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }

  async function eliminar(id: string) {
    await supabase.from("tareos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }

  function diasTrabajados(id: string) {
    const mapa: Record<string, TipoDia> = {};
    tareos
      .filter((t) => t.trabajador_id === id && t.fecha.slice(0, 7) === mes)
      .forEach((t) => {
        const tipo = tipoDeTareo(t);
        const previo = mapa[t.fecha];
        if (!previo || tipo === "extras" || (tipo === "viaje" && previo !== "extras")) mapa[t.fecha] = tipo;
      });
    return mapa;
  }

  function verCalendario(id: string) {
    const registros = tareos.filter((t) => t.trabajador_id === id && t.fecha.slice(0, 7) === mes);
    setTrabajadorVisible(id);
    setMesCal(mes);
    setDiasEditados(diasTrabajados(id));
    setProyectoEdicion(registros[0]?.proyecto_id ?? proyectos[0]?.id ?? "");
    setEditandoCalendario(false);
    setError("");
  }

  function iniciarEdicion(id: string) {
    verCalendario(id);
    setEditandoCalendario(true);
  }

  function alternarDiaEditado(f: string) {
    if (!editandoCalendario) return;
    setDiasEditados((actuales) => {
      const copia = { ...actuales };
      if (copia[f]) delete copia[f];
      else copia[f] = "dia";
      return copia;
    });
  }

  async function guardarCorreccion() {
    if (!trabajadorVisible || !proyectoEdicion) {
      setError("Selecciona un proyecto para guardar la corrección.");
      return;
    }
    const trabajador = trabajadores.find((t) => t.id === trabajadorVisible);
    if (!trabajador) return;

    setGuardandoEdicion(true);
    setError("");
    const actuales = diasTrabajados(trabajadorVisible);
    const fechasActuales = Object.keys(actuales);
    const quitar = fechasActuales.filter((f) => !diasEditados[f]);
    const agregar = Object.keys(diasEditados).filter((f) => !actuales[f]);

    if (quitar.length > 0) {
      const { error: err } = await supabase
        .from("tareos")
        .delete()
        .eq("trabajador_id", trabajadorVisible)
        .in("fecha", quitar);
      if (err) {
        setError(err.message);
        setGuardandoEdicion(false);
        return;
      }
    }

    if (agregar.length > 0) {
      const { error: err } = await supabase.from("tareos").insert(
        agregar.map((f) => ({
          fecha: f,
          trabajador_id: trabajadorVisible,
          proyecto_id: proyectoEdicion,
          tipo: "dia",
          asistencia: 1,
          costo_soles: Number(trabajador.jornal_diario),
        })),
      );
      if (err) {
        setError(err.message);
        setGuardandoEdicion(false);
        return;
      }
    }

    await qc.invalidateQueries({ queryKey: ["tareos"] });
    setEditandoCalendario(false);
    setGuardandoEdicion(false);
  }

  function exportar() {
    exportarExcel(`tareo-${mes}`, [
      {
        nombre: "Consolidado Mensual",
        filas: consolidado.map((c) => ({
          Trabajador: c.nombre,
          "Dias Laborados": c.dias,
          "Horas Extras": c.horas,
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
                <option value="dia">Día Trabajado</option>
                <option value="viaje">Viaje</option>
              </Select>
            </Campo>
            <Campo etiqueta="Horas extra">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={horasExtras}
                  onChange={(e) => setHorasExtras(e.target.value)}
                  placeholder="Ej. 4"
                />
                <Boton type="button" variante="linea" className="shrink-0" onClick={registrarExtras}>
                  Registrar
                </Boton>
              </div>
            </Campo>
          </div>

          <div className="rounded-md border border-line bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-mono">Calendario de asistencia</p>
              <div className="flex items-center gap-2">
                <Boton type="button" variante="linea" className="px-2" onClick={() => setMesCal(cambiarMes(mesCal, -1))}>
                  ‹
                </Boton>
                <Input
                  type="month"
                  className="w-40"
                  value={mesCal}
                  onChange={(e) => e.target.value && setMesCal(e.target.value)}
                />
                <Boton type="button" variante="linea" className="px-2" onClick={() => setMesCal(cambiarMes(mesCal, 1))}>
                  ›
                </Boton>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="label-mono py-1 text-center">
                  {d}
                </div>
              ))}
              {celdas.map((f, i) =>
                f ? (
                  <button
                    key={f}
                    type="button"
                    onClick={() => alternarDia(f)}
                    aria-pressed={Boolean(diasSel[f])}
                    className={`flex h-9 items-center justify-center rounded-md border font-mono text-xs transition-colors ${colorDia(
                      diasSel[f],
                    )} ${diasSel[f] ? "" : "hover:border-primary"}`}
                  >
                    {Number(f.slice(8))}
                  </button>
                ) : (
                  <div key={`vacio-${i}`} />
                ),
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {fechasOrdenadas.length} día(s) seleccionado(s) — verde: día trabajado; verde claro: viaje (medio día); azul
              claro: horas extras. Las horas extras se registran con su propio botón y se convierten a días: horas ÷
              10.5.
            </p>
          </div>

          {error && <p className="font-mono text-xs text-bad">{error}</p>}
          <Boton type="submit">Registrar tareo ({fechasOrdenadas.length} día(s))</Boton>
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
                <th className="px-3 py-2 text-right font-medium">Horas extras</th>
                <th className="px-5 py-2 text-right font-medium">Costo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {consolidado.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink">{c.nombre}</td>
                  <td className="px-3 py-2.5 text-right">{c.dias}</td>
                  <td className="px-3 py-2.5 text-right">{c.horas}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="mr-2">{soles(c.costo)}</span>
                      <button
                        type="button"
                        onClick={() => verCalendario(c.id)}
                        title="Ver días trabajados"
                        aria-label={`Ver días trabajados de ${c.nombre}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(c.id)}
                        title="Editar días trabajados"
                        aria-label={`Editar días trabajados de ${c.nombre}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {trabajadorVisible && (
        <Panel
          titulo={`Días trabajados — ${nombreTrab(trabajadorVisible)}`}
          className="mb-4"
          extra={
            <button
              type="button"
              onClick={() => {
                setTrabajadorVisible(null);
                setEditandoCalendario(false);
              }}
              title="Cerrar calendario"
              aria-label="Cerrar calendario"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-muted"
            >
              <X size={14} />
            </button>
          }
        >
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-mono">{editandoCalendario ? "Corrección de asistencia" : "Asistencia registrada"}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {editandoCalendario
                    ? "Marca o desmarca días y guarda los cambios. Verde: día trabajado; verde claro: viaje; azul claro: horas extras."
                    : "Verde: día trabajado; verde claro: viaje (medio día); azul claro: horas extras."}
                </p>
              </div>
              {editandoCalendario && (
                <div className="w-full sm:w-64">
                  <Campo etiqueta="Proyecto para nuevos días">
                    <Select value={proyectoEdicion} onChange={(e) => setProyectoEdicion(e.target.value)} required>
                      <option value="">Selecciona...</option>
                      {proyectos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </Select>
                  </Campo>
                </div>
              )}
            </div>

            <div className="rounded-md border border-line bg-muted/40 p-3">
              <div className="flex items-center justify-end">
                <Input type="month" className="w-40" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((d, i) => (
                  <div key={i} className="label-mono py-1 text-center">{d}</div>
                ))}
                {celdas.map((f, i) =>
                  f ? (
                    <button
                      key={f}
                      type="button"
                      disabled={!editandoCalendario}
                      onClick={() => alternarDiaEditado(f)}
                      aria-pressed={Boolean(diasEditados[f])}
                      className={`flex h-9 items-center justify-center rounded-md border font-mono text-xs transition-colors ${colorDia(
                        diasEditados[f],
                      )} ${editandoCalendario ? "hover:border-primary" : "cursor-default"}`}
                    >
                      {Number(f.slice(8))}
                    </button>
                  ) : <div key={`detalle-vacio-${i}`} />
                )}
              </div>
            </div>

            {error && <p className="font-mono text-xs text-bad">{error}</p>}
            {editandoCalendario && (
              <div className="flex justify-end gap-2">
                <Boton type="button" variante="linea" onClick={() => verCalendario(trabajadorVisible)}>
                  <X size={14} /> Cancelar
                </Boton>
                <Boton type="button" onClick={guardarCorreccion} disabled={guardandoEdicion}>
                  <Check size={14} /> {guardandoEdicion ? "Guardando..." : "Guardar corrección"}
                </Boton>
              </div>
            )}
          </div>
        </Panel>
      )}

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
