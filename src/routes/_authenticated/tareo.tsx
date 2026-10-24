import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { BotonIcono } from "@/components/ui-kit";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Pencil, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, mesActual, soles } from "@/lib/format";
import { clasificacionDeCargo, useCargos, useProyectos, useTareos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/tareo")({
  head: () => ({
    meta: [
      { title: "Tareo Diario — ERP TELXEN" },
      { name: "description", content: "Registro de asistencia diaria y costo de mano de obra en Soles por partida." },
      { property: "og:title", content: "Tareo Diario — ERP TELXEN" },
      { property: "og:description", content: "Asistencia diaria y costo de mano de obra en Soles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
const HORAS_JORNADA = 10.5;

type TipoDia = "dia" | "viaje" | "induccion" | "feriado" | "extras";
type Base = Exclude<TipoDia, "extras">;

const TIPOS: { id: TipoDia; sigla: string; nombre: string; factor: string; clase: string }[] = [
  { id: "dia", sigla: "T", nombre: "Día trabajado", factor: "1.00", clase: "border-primary bg-primary text-primary-foreground" },
  { id: "viaje", sigla: "V", nombre: "Viaje", factor: "0.50", clase: "border-good/50 bg-good/20 text-ink" },
  { id: "induccion", sigla: "IND", nombre: "Inducción", factor: "pactado", clase: "border-violet-400/60 bg-violet-200/70 text-ink" },
  { id: "feriado", sigla: "FER", nombre: "Feriado", factor: "2.00", clase: "border-orange-400/60 bg-orange-200/80 text-ink" },
  { id: "extras", sigla: "HE", nombre: "Horas extras", factor: `h ÷ ${HORAS_JORNADA}`, clase: "border-sky-400/60 bg-sky-200/70 text-ink" },
];
const infoTipo = (t: TipoDia) => TIPOS.find((x) => x.id === t)!;

type Marca = { base?: Base; extras?: number };

function tipoDeTareo(t: { tipo?: string; asistencia: number | string }): TipoDia {
  if (TIPOS.some((x) => x.id === t.tipo)) return t.tipo as TipoDia;
  const a = Number(t.asistencia);
  if (a === 1) return "dia";
  if (a === 0.5) return "viaje";
  return "extras";
}

function horasDe(t: { horas?: number | string; asistencia: number | string }) {
  const h = Number(t.horas ?? 0);
  return h > 0 ? h : Math.round(Number(t.asistencia) * HORAS_JORNADA * 100) / 100;
}

function Celda({ f, marca, onClick, disabled }: { f: string; marca?: Marca | undefined; onClick: () => void; disabled?: boolean }) {
  const base = marca?.base ? infoTipo(marca.base) : null;
  const soloExtras = !base && marca?.extras;
  const clase = base ? base.clase : soloExtras ? infoTipo("extras").clase : "border-line bg-card";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={Boolean(base || marca?.extras)}
      className={`relative flex h-9 flex-col items-center justify-center rounded-md border font-mono text-xs leading-none transition-colors ${clase} ${disabled ? "cursor-default" : "hover:border-primary"}`}
    >
      <span>{Number(f.slice(8))}</span>
      {(base || soloExtras) && (
        <span className="mt-0.5 text-[8px] opacity-80">{base ? base.sigla : "HE"}</span>
      )}
      {marca?.extras ? (
        <span className="absolute -right-1 -top-1 rounded-full border border-sky-400/60 bg-sky-200 px-1 text-[8px] text-ink">
          +{marca.extras}h
        </span>
      ) : null}
    </button>
  );
}

function aplicarSello(mapa: Record<string, Marca>, f: string, sello: TipoDia, horas: number) {
  const copia = { ...mapa };
  const actual = { ...(copia[f] ?? {}) };
  if (sello === "extras") {
    if (actual.extras) delete actual.extras;
    else if (horas > 0) actual.extras = horas;
  } else if (actual.base === sello) delete actual.base;
  else actual.base = sello;
  if (!actual.base && !actual.extras) delete copia[f];
  else copia[f] = actual;
  return copia;
}

function TareoPage() {
  const [sel, setSel] = useState("");
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: tareos = [] } = useTareos();
  const { data: cargos = [] } = useCargos();

  const [sello, setSello] = useState<TipoDia>("dia");
  const [factorInduccion, setFactorInduccion] = useState("1");
  const [horasExtras, setHorasExtras] = useState("2");
  const [diasSel, setDiasSel] = useState<Record<string, Marca>>({});
  const [mesCal, setMesCal] = useState(mesActual());
  const [form, setForm] = useState({ trabajador_id: "", proyecto_id: "" });
  const [mes, setMes] = useState(mesActual());
  const [error, setError] = useState("");
  const [trabajadorVisible, setTrabajadorVisible] = useState<string | null>(null);
  const [editandoCalendario, setEditandoCalendario] = useState(false);
  const [diasEditados, setDiasEditados] = useState<Record<string, Marca>>({});
  const [proyectoEdicion, setProyectoEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [anioCal = 2026, mesNumCal = 1] = mesCal.split("-").map(Number);
  const primerDia = (new Date(anioCal, mesNumCal - 1, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anioCal, mesNumCal, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array<string | null>(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => `${mesCal}-${String(i + 1).padStart(2, "0")}`),
  ];
  const [anioDet = 2026, mesNumDet = 1] = mes.split("-").map(Number);
  const primerDet = (new Date(anioDet, mesNumDet - 1, 1).getDay() + 6) % 7;
  const celdasDet: (string | null)[] = [
    ...Array<string | null>(primerDet).fill(null),
    ...Array.from({ length: new Date(anioDet, mesNumDet, 0).getDate() }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];

  const horasNum = Number(horasExtras) || 0;
  const factorInd = Number(factorInduccion) || 0;
  const fechasOrdenadas = Object.keys(diasSel).sort();
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const nombreTrab = (id: string) => trabajadores.find((t) => t.id === id)?.nombre ?? "—";
  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";

  function factor(tipo: TipoDia, horas = 0) {
    if (tipo === "dia") return 1;
    if (tipo === "viaje") return 0.5;
    if (tipo === "induccion") return factorInd;
    if (tipo === "feriado") return 2;
    return r2(horas / HORAS_JORNADA);
  }

  function filasDesde(mapa: Record<string, Marca>, fechas: string[], trabajadorId: string, proyectoId: string, jornal: number) {
    const filas: Record<string, unknown>[] = [];
    fechas.forEach((f) => {
      const m = mapa[f];
      if (!m) return;
      if (m.base) {
        const a = factor(m.base);
        filas.push({ fecha: f, trabajador_id: trabajadorId, proyecto_id: proyectoId, tipo: m.base, asistencia: a, horas: 0, costo_soles: r2(a * jornal) });
      }
      if (m.extras) {
        const a = factor("extras", m.extras);
        filas.push({ fecha: f, trabajador_id: trabajadorId, proyecto_id: proyectoId, tipo: "extras", asistencia: a, horas: m.extras, costo_soles: r2(a * jornal) });
      }
    });
    return filas;
  }

  const consolidado = useMemo(() => {
    const delMes = tareos.filter((t) => t.fecha.slice(0, 7) === mes);
    const mapa = new Map<string, { dia: number; viaje: number; induccion: number; feriado: number; horas: number; jornales: number; costo: number }>();
    delMes.forEach((t) => {
      const acc = mapa.get(t.trabajador_id) ?? { dia: 0, viaje: 0, induccion: 0, feriado: 0, horas: 0, jornales: 0, costo: 0 };
      const tipo = tipoDeTareo(t);
      if (tipo === "extras") acc.horas += horasDe(t);
      else acc[tipo] += 1;
      acc.jornales += Number(t.asistencia);
      acc.costo += Number(t.costo_soles);
      mapa.set(t.trabajador_id, acc);
    });
    return [...mapa.entries()].map(([id, v]) => {
      const trabajador = trabajadores.find((t) => t.id === id);
      return {
        id,
        nombre: nombreTrab(id),
        ...v,
        jornales: r2(v.jornales),
        horas: r2(v.horas),
        clasificacion: clasificacionDeCargo(trabajador?.cargo ?? "", cargos),
      };
    });
  }, [tareos, mes, trabajadores, cargos]);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  function estampar(f: string) {
    if (sello === "extras" && horasNum <= 0) return setError("Ingresa las horas extras antes de marcar.");
    setError("");
    setDiasSel((m) => aplicarSello(m, f, sello, horasNum));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trabajador = trabajadores.find((t) => t.id === form.trabajador_id);
    if (!trabajador || !form.proyecto_id || fechasOrdenadas.length === 0)
      return setError("Selecciona trabajador, proyecto y al menos un día.");
    if (Object.values(diasSel).some((m) => m.base === "induccion") && factorInd <= 0)
      return setError("Indica el factor pactado para la inducción.");
    const filas = filasDesde(diasSel, fechasOrdenadas, form.trabajador_id, form.proyecto_id, Number(trabajador.jornal_diario));
    const { error: err } = await supabase.from("tareos").insert(filas as never);
    if (err)
      return setError(
        err.code === "23505"
          ? "Uno de esos días ya tiene ese tipo registrado. Corrige el día desde el consolidado."
          : err.message,
      );
    setDiasSel({});
    qc.invalidateQueries({ queryKey: ["tareos"] });
  }


  function marcasDe(id: string) {
    const mapa: Record<string, Marca> = {};
    tareos
      .filter((t) => t.trabajador_id === id && t.fecha.slice(0, 7) === mes)
      .forEach((t) => {
        const tipo = tipoDeTareo(t);
        const m = (mapa[t.fecha] ??= {});
        if (tipo === "extras") m.extras = r2((m.extras ?? 0) + horasDe(t));
        else m.base = tipo;
      });
    return mapa;
  }

  function verCalendario(id: string) {
    const registros = tareos.filter((t) => t.trabajador_id === id && t.fecha.slice(0, 7) === mes);
    setTrabajadorVisible(id);
    setDiasEditados(marcasDe(id));
    setProyectoEdicion(registros[0]?.proyecto_id ?? proyectos[0]?.id ?? "");
    setEditandoCalendario(false);
    setError("");
  }

  function iniciarEdicion(id: string) {
    verCalendario(id);
    setEditandoCalendario(true);
  }

  function estamparEditado(f: string) {
    if (!editandoCalendario) return;
    if (sello === "extras" && horasNum <= 0) return setError("Ingresa las horas extras antes de marcar.");
    setDiasEditados((m) => aplicarSello(m, f, sello, horasNum));
  }

  async function guardarCorreccion() {
    if (!trabajadorVisible || !proyectoEdicion) return setError("Selecciona un proyecto para guardar la corrección.");
    const trabajador = trabajadores.find((t) => t.id === trabajadorVisible);
    if (!trabajador) return;
    setGuardandoEdicion(true);
    setError("");
    const actuales = marcasDe(trabajadorVisible);
    const fechas = [...new Set([...Object.keys(actuales), ...Object.keys(diasEditados)])];
    const cambiadas = fechas.filter((f) => JSON.stringify(actuales[f] ?? {}) !== JSON.stringify(diasEditados[f] ?? {}));
    if (cambiadas.length > 0) {
      const { error: errDel } = await supabase.from("tareos").delete().eq("trabajador_id", trabajadorVisible).in("fecha", cambiadas);
      if (errDel) {
        setError(errDel.message);
        setGuardandoEdicion(false);
        return;
      }
      const filas = filasDesde(diasEditados, cambiadas, trabajadorVisible, proyectoEdicion, Number(trabajador.jornal_diario));
      if (filas.length > 0) {
        const { error: err } = await supabase.from("tareos").insert(filas as never);
        if (err) {
          setError(err.message);
          setGuardandoEdicion(false);
          return;
        }
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
          Clasificación: c.clasificacion === "Indirecto" ? "Staff (Gasto general)" : "Mano de obra directa",
          "Días normales": c.dia,
          "Viaje (0.5)": c.viaje,
          Inducción: c.induccion,
          Feriados: c.feriado,
          "Horas extras": c.horas,
          "Total jornales eq.": c.jornales,
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
            Tipo: infoTipo(tipoDeTareo(t)).nombre,
            Horas: tipoDeTareo(t) === "extras" ? horasDe(t) : "",
            "Jornales eq.": Number(t.asistencia),
            "Costo (S/)": Number(t.costo_soles),
          })),
      },
    ]);
  }

  const totalMes = consolidado.reduce((s, c) => s + c.costo, 0);
  const totalDirecto = consolidado.filter((c) => c.clasificacion === "Directo").reduce((s, c) => s + c.costo, 0);
  const totalStaff = totalMes - totalDirecto;

  const selectorSello = (
    <div className="flex flex-wrap items-end gap-2">
      {TIPOS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setSello(t.id)}
          aria-pressed={sello === t.id}
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-all ${
            sello === t.id ? "border-primary ring-2 ring-cta/70" : "border-line hover:border-primary"
          } bg-card`}
        >
          <span className={`inline-flex h-5 min-w-7 items-center justify-center rounded border px-1 text-[9px] ${t.clase}`}>{t.sigla}</span>
          <span className="text-ink">{t.nombre}</span>
          <span className="text-muted-foreground">×{t.id === "induccion" ? factorInd.toFixed(2) : t.factor}</span>
        </button>
      ))}
      {sello === "induccion" && (
        <div className="w-32">
          <Campo etiqueta="Factor pactado">
            <Input type="number" min="0" step="0.05" value={factorInduccion} onChange={(e) => setFactorInduccion(e.target.value)} />
          </Campo>
        </div>
      )}
      {sello === "extras" && (
        <div className="w-32">
          <Campo etiqueta="Horas por día">
            <Input type="number" min="0" step="0.5" value={horasExtras} onChange={(e) => setHorasExtras(e.target.value)} />
          </Campo>
        </div>
      )}
    </div>
  );

  const leyenda = (
    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
      Elige un tipo y haz clic en los días para marcarlos; clic otra vez sobre el mismo tipo lo quita. Un día puede tener
      T, V, IND o FER y además horas extras. Horas extras: horas ÷ {HORAS_JORNADA} = jornal equivalente.
    </p>
  );

  return (
    <>
      <Encabezado
        titulo="Tareo Diario"
        subtitulo="Asistencia y mano de obra"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Registrar asistencia" className="mb-4">
        <form onSubmit={guardar} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Trabajador">
              <Select value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {trabajadores.filter((t) => t.activo).map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </Select>
            </Campo>
            <Campo etiqueta="Proyecto">
              <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
                <option value="">Selecciona...</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </Campo>
          </div>

          <div>
            <p className="label-mono mb-1.5">Tipo a marcar</p>
            {selectorSello}
          </div>

          <div className="rounded-md border border-line bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-mono">Calendario de asistencia</p>
              <div className="flex items-center gap-2">
                <Boton type="button" variante="linea" className="px-2" onClick={() => setMesCal(cambiarMes(mesCal, -1))}>‹</Boton>
                <Input type="month" className="w-40" value={mesCal} onChange={(e) => e.target.value && setMesCal(e.target.value)} />
                <Boton type="button" variante="linea" className="px-2" onClick={() => setMesCal(cambiarMes(mesCal, 1))}>›</Boton>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="label-mono py-1 text-center">{d}</div>
              ))}
              {celdas.map((f, i) =>
                f ? <Celda key={f} f={f} marca={diasSel[f]} onClick={() => estampar(f)} /> : <div key={`vacio-${i}`} />,
              )}
            </div>
            {leyenda}
          </div>

          {error && !trabajadorVisible && <p className="font-mono text-xs text-bad">{error}</p>}
          <div className="flex gap-2">
            <Boton type="submit">Registrar tareo ({fechasOrdenadas.length} día(s))</Boton>
            {fechasOrdenadas.length > 0 && (
              <Boton type="button" variante="linea" onClick={() => setDiasSel({})}>Limpiar</Boton>
            )}
          </div>
        </form>
      </Panel>

      <div className="flex items-start gap-3"><Panel className="min-w-0 flex-1"
        titulo="Consolidado mensual"
        extra={
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] text-muted-foreground">
              Mano de obra directa: <strong className="text-ink">{soles(totalDirecto)}</strong>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Staff (gasto general): <strong className="text-ink">{soles(totalStaff)}</strong>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">Total: {soles(totalMes)}</span>
            <Input type="month" className="w-40" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
        }
      >
        {consolidado.length === 0 ? (
          <Vacio texto="Sin tareos registrados en este mes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Trabajador</th>
                  <th className="px-3 py-2 font-medium">Clasificación</th>
                  <th className="px-3 py-2 text-right font-medium">Días normales</th>
                  <th className="px-3 py-2 text-right font-medium">Viaje (0.5)</th>
                  <th className="px-3 py-2 text-right font-medium">Inducción</th>
                  <th className="px-3 py-2 text-right font-medium">Feriados</th>
                  <th className="px-3 py-2 text-right font-medium">H. extras</th>
                  <th className="px-3 py-2 text-right font-medium">Jornales eq.</th>
                  <th className="px-5 py-2 text-right font-medium">Costo mano de obra</th>
                </tr>
              </thead>
              <tbody>
                {consolidado.map((c) => (
                  <tr key={c.id} onClick={() => setSel(c.id)} onDoubleClick={() => { iniciarEdicion(c.id); }} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === c.id ? "bg-primary/10" : ""}`}>
                    <td className="px-5 py-2.5 font-semibold text-ink">{c.nombre}</td>
                    <td className="px-3 py-2.5">
                      <span className={c.clasificacion === "Indirecto" ? "text-primary" : "text-muted-foreground"}>
                        {c.clasificacion === "Indirecto" ? "Staff · Gasto general" : "Mano de obra directa"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{c.dia}</td>
                    <td className="px-3 py-2.5 text-right">{c.viaje}</td>
                    <td className="px-3 py-2.5 text-right">{c.induccion}</td>
                    <td className="px-3 py-2.5 text-right">{c.feriado}</td>
                    <td className="px-3 py-2.5 text-right">{c.horas}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink">{c.jornales}</td>
                    <td className="px-5 py-2.5">
                      {soles(c.costo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel><BarraIconosHoja objeto="asistencia" haySeleccion={consolidado.some((c) => c.id === sel)} onEditar={() => { if (consolidado.some((c) => c.id === sel)) iniciarEdicion(sel); }} extras={<BotonIcono etiqueta="Ver días trabajados" disabled={!consolidado.some((c) => c.id === sel)} onClick={() => verCalendario(sel)}><Eye size={15} /></BotonIcono>} /></div>

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
              <p className="label-mono">{editandoCalendario ? "Corrección de asistencia" : "Asistencia registrada"}</p>
              {editandoCalendario && (
                <div className="w-full sm:w-64">
                  <Campo etiqueta="Proyecto para días corregidos">
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
            {editandoCalendario && selectorSello}

            <div className="rounded-md border border-line bg-muted/40 p-3">
              <div className="flex items-center justify-end">
                <Input type="month" className="w-40" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((d, i) => (
                  <div key={i} className="label-mono py-1 text-center">{d}</div>
                ))}
                {celdasDet.map((f, i) =>
                  f ? (
                    <Celda key={f} f={f} marca={diasEditados[f]} disabled={!editandoCalendario} onClick={() => estamparEditado(f)} />
                  ) : (
                    <div key={`detalle-vacio-${i}`} />
                  ),
                )}
              </div>
              {leyenda}
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

    </>
  );
}
