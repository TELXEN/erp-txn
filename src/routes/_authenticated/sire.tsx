import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, KeyRound, ShieldCheck, Download, Send, LibraryBig, Settings,
  FileSpreadsheet, ShoppingBag, ReceiptText, Plus, ChevronRight, ChevronLeft, Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Encabezado } from "@/components/AppShell";
import { Panel, Campo, Input, Select, Boton, SinAcceso, Vacio } from "@/components/ui-kit";
import { MESES, fecha as fmtFecha, soles } from "@/lib/format";
import { guardarConfigSire, validarConexionSire, sincronizarSire, aceptarSire } from "@/lib/sire.functions";

export const Route = createFileRoute("/_authenticated/sire")({
  head: () => ({
    meta: [
      { title: "SIRE SUNAT — ERP TELXEN" },
      { name: "description", content: "Registro de Ventas (RVIE) y Compras (RCE) del SIRE de SUNAT con conciliación contra el ERP." },
      { property: "og:title", content: "SIRE SUNAT — ERP TELXEN" },
      { property: "og:description", content: "Sincronización, conciliación y cierre de los registros RVIE y RCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SirePage,
});

import type { Item, ItemSunat, Libro, Estado } from "@/lib/sire-tipos";
import { cargarErp, conciliar } from "@/lib/sire-conciliar";
const r2 = (n: number) => Math.round(n * 100) / 100;

function SirePage() {
  const { rol } = useAuth();
  const [tab, setTab] = useState<"config" | Libro>("RVIE");
  const [periodo, setPeriodo] = useState(periodoDefecto());
  if (rol !== "gerente" && rol !== "administrador") return <SinAcceso />;
  const grupos: { titulo: string; icono: React.ElementType; items: { k: "config" | Libro; t: string; i: React.ElementType }[] }[] = [
    { titulo: "Registros", icono: LibraryBig, items: [{ k: "RVIE", t: "Ventas (RVIE)", i: ReceiptText }, { k: "RCE", t: "Compras (RCE)", i: ShoppingBag }] },
    ...(rol === "gerente" ? [{ titulo: "Configuración", icono: Settings, items: [{ k: "config" as const, t: "API SOL", i: KeyRound }] }] : []),
  ];
  const grupoActivo = grupos.find((g) => g.items.some((x) => x.k === tab)) ?? grupos[0];
  return (
    <div>
      <Encabezado titulo="SIRE SUNAT" subtitulo="FINANZAS Y CONTABILIDAD · REGISTROS ELECTRÓNICOS" />
      <div className="sticky top-0 z-30 -mx-1 bg-background px-1 pb-1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {grupos.map((g) => { const Icono = g.icono; return <Boton key={g.titulo} variante={g === grupoActivo ? "primario" : "linea"} onClick={() => { const primero = g.items[0]; if (primero) setTab(primero.k); }}><Icono size={13} />{g.titulo}</Boton>; })}
          </div>
          <SincronizacionGlobal periodo={periodo} onPeriodoChange={setPeriodo} />
        </div>
        <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
          {grupoActivo?.items.map(({ k, t, i: I }) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${tab === k ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}><I className="size-3.5" />{t}</button>
          ))}
        </div>
        {tab !== "config" && <div className="mb-4"><ResumenOperaciones periodo={periodo} libro={tab} /></div>}
      </div>
      {tab === "config" ? <ConfigSol /> : <PanelLibro key={tab} libro={tab} periodo={periodo} />}
    </div>
  );
}

type EstadoSincronizacion = "esperando" | "procesando" | "sincronizado" | "pendiente" | "error";

function SincronizacionGlobal({ periodo, onPeriodoChange }: { periodo: string; onPeriodoChange: (periodo: string) => void }) {
  const qc = useQueryClient();
  const sincronizar$ = useServerFn(sincronizarSire);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [estados, setEstados] = useState<Record<Libro, EstadoSincronizacion>>({ RVIE: "esperando", RCE: "esperando" });
  const { data: registros = [] } = useQuery({
    queryKey: ["sire-global", periodo],
    queryFn: async () => (await supabase.from("sire_periodos").select("*").eq("periodo", periodo)).data ?? [],
  });
  const [y = 2026, m = 1] = periodo.split("-").map(Number);
  const anios = [y - 1, y, y + 1].filter((a, i, arr) => arr.indexOf(a) === i);
  const registro = (libro: Libro) => registros.find((r) => r.libro === libro);

  async function sincronizarLibro(libro: Libro) {
    const reg = registro(libro);
    setEstados((actual) => ({ ...actual, [libro]: "procesando" }));
    try {
      const r = await sincronizar$({ data: { libro, periodo, ticket: reg?.estado === "Pendiente" ? reg.ticket : null } });
      if (r.estado === "error") {
        setEstados((actual) => ({ ...actual, [libro]: "error" }));
        return { libro, estado: "error" as const, mensaje: r.mensaje };
      }
      if (r.estado === "pendiente") {
        const { error } = await supabase.from("sire_periodos").upsert(
          { libro, periodo, estado: "Pendiente", ticket: r.ticket, origen: "sunat" },
          { onConflict: "libro,periodo" },
        );
        if (error) throw error;
        setEstados((actual) => ({ ...actual, [libro]: "pendiente" }));
        return { libro, estado: "pendiente" as const, mensaje: r.mensaje };
      }
      const its = conciliar(r.items as ItemSunat[], await cargarErp(libro, periodo));
      const { error } = await supabase.from("sire_periodos").upsert({
        libro,
        periodo,
        estado: "Sincronizado",
        items: its as any,
        ticket: r.ticket,
        origen: "sunat",
        total_base: r2(its.reduce((s, i) => s + i.base, 0)),
        total_igv: r2(its.reduce((s, i) => s + i.igv, 0)),
        total_docs: its.length,
        sincronizado_en: new Date().toISOString(),
        aceptado_por: null,
        aceptado_en: null,
      }, { onConflict: "libro,periodo" });
      if (error) throw error;
      setEstados((actual) => ({ ...actual, [libro]: "sincronizado" }));
      return { libro, estado: "sincronizado" as const, cantidad: its.length };
    } catch (e) {
      setEstados((actual) => ({ ...actual, [libro]: "error" }));
      return { libro, estado: "error" as const, mensaje: e instanceof Error ? e.message : "Error al sincronizar" };
    }
  }

  async function sincronizarTodo() {
    setEstados({ RVIE: "esperando", RCE: "esperando" });
    setProgreso(10);
    let completados = 0;
    const ejecutar = async (libro: Libro) => {
      const resultado = await sincronizarLibro(libro);
      completados += 1;
      setProgreso(10 + completados * 45);
      return resultado;
    };
    const resultados = await Promise.all([ejecutar("RVIE"), ejecutar("RCE")]);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sire-global", periodo] }),
      qc.invalidateQueries({ queryKey: ["sire-resumen", periodo] }),
      qc.invalidateQueries({ queryKey: ["sire", "RVIE", periodo] }),
      qc.invalidateQueries({ queryKey: ["sire", "RCE", periodo] }),
    ]);
    const exitosos = resultados.filter((r) => r.estado === "sincronizado");
    const pendientes = resultados.filter((r) => r.estado === "pendiente");
    const errores = resultados.filter((r) => r.estado === "error");
    if (errores.length === 0 && pendientes.length === 0) toast.success("Compras y ventas sincronizadas con SUNAT");
    else if (exitosos.length > 0 || pendientes.length > 0) toast.warning("Sincronización parcial: revisa el estado de cada libro");
    else toast.error("No se pudo sincronizar Compras ni Ventas");
    setTimeout(() => setProgreso(null), 500);
  }

  const estadoLibro = (libro: Libro) => {
    const estadoLocal = estados[libro];
    if (progreso !== null && estadoLocal !== "esperando") return estadoLocal;
    const reg = registro(libro);
    if (!reg) return "esperando";
    return reg.estado === "Pendiente" ? "pendiente" : "sincronizado";
  };
  const etiquetaEstado = (libro: Libro) => {
    const estado = estadoLibro(libro);
    const textos: Record<EstadoSincronizacion, string> = {
      esperando: "Sin sincronizar",
      procesando: "Procesando…",
      sincronizado: "Sincronizado",
      pendiente: "Pendiente SUNAT",
      error: "Error",
    };
    const reg = registro(libro);
    const fecha = reg?.sincronizado_en ?? reg?.updated_at;
    let cuando = "";
    if (fecha && estado === "sincronizado") {
      const d = new Date(fecha);
      cuando = ` · ${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return `${libro}: ${textos[estado]}${cuando}`;
  };

  return (
    <div className="relative flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <div className="hidden items-center gap-x-4 font-mono text-[11px] text-muted-foreground min-[1100px]:flex">
        {(["RVIE", "RCE"] as Libro[]).map((libro) => {
          const estado = estadoLibro(libro);
          return <span key={libro} className={estado === "error" ? "text-bad" : estado === "sincronizado" ? "text-good" : estado === "pendiente" ? "text-amber-700 dark:text-amber-400" : ""}>{etiquetaEstado(libro)}</span>;
        })}
      </div>
      <Campo etiqueta="Mes"><Select value={m} onChange={(e) => onPeriodoChange(`${y}-${String(e.target.value).padStart(2, "0")}`)}>{MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</Select></Campo>
      <Campo etiqueta="Año"><Select value={y} onChange={(e) => onPeriodoChange(`${e.target.value}-${String(m).padStart(2, "0")}`)}>{anios.map((a) => <option key={a}>{a}</option>)}</Select></Campo>
      <Boton onClick={sincronizarTodo} disabled={progreso !== null}><RefreshCw className={`size-3.5 ${progreso !== null ? "animate-spin" : ""}`} />Sincronizar Compras y Ventas</Boton>
      {progreso !== null && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-muted"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progreso}%` }} /></div>
      )}
    </div>
  );
}

function ConfigSol() {
  const guardar = useServerFn(guardarConfigSire);
  const validar = useServerFn(validarConexionSire);
  const [f, setF] = useState({ ruc: "", client_id: "", usuario_sol: "", client_secret: "", clave_sol: "" });
  const [tiene, setTiene] = useState({ s: false, c: false });
  const [ocupado, setOcupado] = useState<"" | "g" | "v">("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sire_config").select("*").limit(1).maybeSingle();
      if (data) {
        setF((x) => ({ ...x, ruc: data.ruc, client_id: data.client_id, usuario_sol: data.usuario_sol }));
        setTiene({ s: data.tiene_secret, c: data.tiene_clave });
      } else {
        const { data: emp } = await supabase.from("empresa_config").select("ruc").limit(1).maybeSingle();
        if (emp?.ruc) setF((x) => ({ ...x, ruc: emp.ruc ?? "" }));
      }
    })();
  }, []);

  async function onGuardar() {
    setOcupado("g");
    try {
      await guardar({ data: f });
      setTiene({ s: tiene.s || !!f.client_secret, c: tiene.c || !!f.clave_sol });
      setF({ ...f, client_secret: "", clave_sol: "" });
      toast.success("Credenciales guardadas de forma segura");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally { setOcupado(""); }
  }
  async function onValidar() {
    setOcupado("v");
    try {
      const r = await validar();
      r.ok ? toast.success(r.mensaje) : toast.error(r.mensaje);
    } finally { setOcupado(""); }
  }

  return (
    <Panel titulo="CONFIGURACIÓN API SOL" extra={<span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5" />Acceso restringido a Gerencia</span>}>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <Campo etiqueta="RUC de la empresa"><Input value={f.ruc} maxLength={11} onChange={(e) => setF({ ...f, ruc: e.target.value.replace(/\D/g, "") })} /></Campo>
        <Campo etiqueta="Client ID"><Input value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} /></Campo>
        <Campo etiqueta="Client Secret"><Input type="password" placeholder={tiene.s ? "••••••• guardado" : ""} value={f.client_secret} onChange={(e) => setF({ ...f, client_secret: e.target.value })} /></Campo>
        <Campo etiqueta="Usuario SOL"><Input value={f.usuario_sol} onChange={(e) => setF({ ...f, usuario_sol: e.target.value.toUpperCase() })} /></Campo>
        <Campo etiqueta="Clave SOL"><Input type="password" placeholder={tiene.c ? "••••••• guardado" : ""} value={f.clave_sol} onChange={(e) => setF({ ...f, clave_sol: e.target.value })} /></Campo>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Boton variante="linea" onClick={onValidar} disabled={!!ocupado}><RefreshCw className={`size-3.5 ${ocupado === "v" ? "animate-spin" : ""}`} />Validar Conexión</Boton>
        <Boton onClick={onGuardar} disabled={!!ocupado}>{ocupado === "g" ? "Guardando…" : "Guardar credenciales"}</Boton>
      </div>
    </Panel>
  );
}

function periodoDefecto() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
const ESTADO_UI: Record<Estado, { t: string; c: string; I: React.ElementType }> = {
  match: { t: "Match perfecto", c: "text-good bg-good/10 ring-good/20", I: CheckCircle2 },
  discrepancia: { t: "Discrepancia monto/IGV", c: "text-amber-700 bg-amber-500/10 ring-amber-500/25 dark:text-amber-400", I: AlertTriangle },
  faltante: { t: "Faltante en ERP", c: "text-bad bg-bad/10 ring-bad/20", I: XCircle },
  solo_erp: { t: "Solo en ERP", c: "text-muted-foreground bg-muted ring-line", I: XCircle },
};

function PanelLibro({ libro, periodo }: { libro: Libro; periodo: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [paso, setPaso] = useState(1);
  const [detalle, setDetalle] = useState<Item | null>(null);
  const aceptar$ = useServerFn(aceptarSire);
  const { data: rucEmpresa } = useQuery({ queryKey: ["sire-ruc"], queryFn: async () => (await supabase.from("empresa_config").select("ruc").limit(1).maybeSingle()).data?.ruc ?? "" });
  const [filtro, setFiltro] = useState<"todos" | "ok" | "disc" | "sunat">("todos");
  const [vinculando, setVinculando] = useState<Item | null>(null);

  const { data: reg } = useQuery({
    queryKey: ["sire", libro, periodo],
    queryFn: async () => (await supabase.from("sire_periodos").select("*").eq("libro", libro).eq("periodo", periodo).maybeSingle()).data,
  });
  const items = (reg?.items as Item[] | undefined) ?? [];
  useEffect(() => { setPaso(reg && reg.estado !== "Pendiente" ? (reg.estado === "Aceptado" ? 3 : 2) : 1); }, [reg?.id, reg?.estado]);

  const cuenta = useMemo(() => ({
    todos: items.length,
    ok: items.filter((i) => i.estado === "match").length,
    disc: items.filter((i) => i.estado === "discrepancia").length,
    sunat: items.filter((i) => i.estado === "faltante").length,
  }), [items]);
  const visibles = items.filter((i) => filtro === "todos" || (filtro === "ok" && i.estado === "match") || (filtro === "disc" && i.estado === "discrepancia") || (filtro === "sunat" && i.estado === "faltante"));

  // IGV de compras: separar comprobantes sin IGV (ámbar) y con tasa parcial entre 10% y 18% (azul).
  const tasaIgv = (i: Item) => (i.base > 0 ? i.igv / i.base : 0);
  const sinIgv = useMemo(() => items.filter((i) => (i.igv ?? 0) === 0), [items]);
  const sumaSinIgv = useMemo(() => r2(sinIgv.reduce((s, i) => s + (i.total_sunat ?? i.base + i.igv), 0)), [sinIgv]);
  const igvParcial = useMemo(() => items.filter((i) => { const t = tasaIgv(i); return t >= 0.10 && t < 0.1795; }), [items]);
  const sumaIgvParcial = useMemo(() => r2(igvParcial.reduce((s, i) => s + (i.total_sunat ?? i.base + i.igv), 0)), [igvParcial]);

  function generarTxt() {
    const ruc = rucEmpresa ?? "";
    const lineas = items.map((i, n) => [periodo.replace("-", ""), String(n + 1).padStart(6, "0"), fmtFecha(i.fecha), i.tipo, ...i.serie_numero.split("-"), "6", i.ruc, i.razon, i.base.toFixed(2), i.igv.toFixed(2), (i.total_sunat ?? 0).toFixed(2), "PEN"].join("|"));
    const blob = new Blob([lineas.join("\r\n") + "\r\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `LE${ruc || "RUC"}${periodo.replace("-", "")}00${libro === "RVIE" ? "140400" : "080400"}021112.txt`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("Archivo de reemplazo generado");
  }
  async function enviar() {
    if (!reg) return;
    const r = await aceptar$({ data: { libro, periodo } });
    if (!r.ok) { toast.error(r.mensaje); return; }
    const { error } = await supabase.from("sire_periodos").update({ estado: "Aceptado", aceptado_por: session?.user.id ?? null, aceptado_en: new Date().toISOString() }).eq("id", reg.id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["sire", libro, periodo] });
    toast.success(r.mensaje);
  }

  const [y = 2026, m = 1] = periodo.split("-").map(Number);
  const pasos = ["SINCRONIZACIÓN", "CONCILIACIÓN", "CIERRE Y ENVÍO"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {pasos.map((p, i) => {
          const n = i + 1; const act = paso === n; const hecho = paso > n;
          const habil = n === 1 || !!reg;
          return (
            <div key={p} className="flex items-center gap-2">
              <button disabled={!habil} onClick={() => setPaso(n)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wider transition-colors disabled:opacity-40 ${act ? "bg-primary text-primary-foreground" : hecho ? "bg-good/10 text-good" : "bg-card text-muted-foreground ring-1 ring-line"}`}>
                <span className="grid size-4 place-items-center rounded-full bg-current/10 text-[10px]">{hecho ? "✓" : n}</span>{p}
              </button>
              {i < 2 && <ChevronRight className="size-3.5 text-muted-foreground" />}
            </div>
          );
        })}
        {reg && <span className="ml-auto font-mono text-[11px] text-muted-foreground">Estado: <b className={reg.estado === "Aceptado" ? "text-good" : "text-ink"}>{reg.estado}</b></span>}
      </div>

      {vinculando && reg && <VincularManual item={vinculando} libro={libro} periodo={periodo} items={items} onCerrar={() => setVinculando(null)}
        onVincular={async (d) => {
          const nuevos = items.map((x) => x.clave !== vinculando.clave ? x : { ...x, total_erp: d.total, igv_erp: d.igv, vinculado: d.serie_numero, estado: (Math.abs((x.moneda && x.moneda !== "PEN" ? (x.total_sunat ?? 0) * (x.tipo_cambio || 1) : (x.total_sunat ?? 0)) - d.total) > 0.01 ? "discrepancia" : "match") as Estado });
          const { error } = await supabase.from("sire_periodos").update({ items: nuevos as never }).eq("id", reg.id);
          if (error) { toast.error(error.message); return; }
          await qc.invalidateQueries({ queryKey: ["sire", libro, periodo] });
          toast.success(`${vinculando.serie_numero} vinculado con ${d.serie_numero} del ERP`); setVinculando(null);
        }} />}
      {detalle && <DetalleDoc item={detalle} onCerrar={() => setDetalle(null)} />}
      <div key={paso} className="rise">
        {paso === 1 && (
          <Panel titulo={`PASO 1 · SINCRONIZAR PROPUESTA ${libro}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold">{reg ? `Propuesta ${libro} disponible para ${MESES[m - 1]} ${y}` : `Aún no hay una propuesta ${libro} para ${MESES[m - 1]} ${y}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">La sincronización de Compras y Ventas se controla desde la línea principal superior.</p>
              </div>
              {reg && reg.estado !== "Pendiente" && <Boton onClick={() => setPaso(2)}>Revisar conciliación<ChevronRight className="size-3.5" /></Boton>}
            </div>
          </Panel>
        )}

        {paso === 2 && (
          <Panel titulo={`PASO 2 · CONCILIACIÓN SUNAT vs ERP · ${(MESES[m - 1] ?? "").toUpperCase()} ${y}`}>
            {visibles.length === 0 ? <Vacio texto="Sin documentos en este filtro" /> : (
              <div className="max-h-[calc(100vh-560px)] min-h-[260px] overflow-auto" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
                <div className="sticky top-0 z-20 flex h-[42px] flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-line bg-card px-3 py-1">
                  {libro === "RCE" && (
                    <>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-500/10 px-2.5 py-1 font-mono text-[11px] text-sky-700 ring-1 ring-sky-500/25 dark:text-sky-400">
                        <AlertTriangle className="size-3" />IGV 10–18%: {igvParcial.length} comp. · {soles(sumaIgvParcial)}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400">
                        <AlertTriangle className="size-3" />Sin IGV: {sinIgv.length} comp. · {soles(sumaSinIgv)}
                      </span>
                    </>
                  )}
                  {([["todos", "Todos"], ["ok", "Conciliados"], ["disc", "Con Discrepancias"], ["sunat", "Solo en SUNAT"]] as const).map(([k, t]) => (
                    <button key={k} onClick={() => setFiltro(k)} className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] ${k === "disc" && cuenta.disc > 0 ? (filtro === k ? "bg-amber-500 font-semibold text-white ring-1 ring-amber-600" : "bg-amber-500/15 font-semibold text-amber-700 ring-1 ring-amber-500/40 hover:bg-amber-500/25 dark:text-amber-400") : filtro === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{k === "disc" && cuenta.disc > 0 && <AlertTriangle className="size-3" />}{t} <span className={k === "disc" && cuenta.disc > 0 ? "" : "opacity-70"}>({cuenta[k]})</span></button>
                  ))}
                </div>
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>{["Fecha", "Tipo", "Serie-Número", "RUC / Razón social", "Base", "IGV", "Total SUNAT", "Total ERP", "Estado", ""].map((h, i) => <th key={i} className={`sticky top-[42px] z-10 whitespace-nowrap bg-muted px-3 py-2 ${i >= 4 && i <= 7 ? "text-right" : "text-left"} ${i === 3 ? "w-[30%] min-w-[260px]" : ""}`}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visibles.map((i) => {
                      const e = ESTADO_UI[i.estado];
                      const t = tasaIgv(i);
                      const parcial = t >= 0.10 && t < 0.1795;
                      const sin = (i.igv ?? 0) === 0;
                      return (
                        <tr key={i.clave} onClick={() => setDetalle(i)} className={`cursor-pointer border-t border-line ${parcial ? "bg-sky-500/[0.07] hover:bg-sky-500/[0.13]" : sin ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.13]" : "hover:bg-muted/30"}`}>
                          <td className="px-3 py-2 font-mono text-xs">{fmtFecha(i.fecha)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{i.tipo}</td>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{i.serie_numero}</td>
                          <td className="px-3 py-2"><p className="font-mono text-[11px] text-muted-foreground">{i.ruc || "—"}</p><p className="line-clamp-2 break-words text-xs leading-snug" title={i.razon}>{i.razon}</p>{i.vinculado && <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary"><Link2 className="size-3" />Vinculado a {i.vinculado}</p>}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{soles(i.base)}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                            {soles(i.igv)}
                            {parcial && (
                              <span className="ml-1 rounded bg-sky-500/15 px-1 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                                {(t * 100).toFixed(1)}%
                              </span>
                            )}
                            {sin && (
                              <span className="ml-1 rounded bg-amber-500/15 px-1 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                SIN IGV
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{i.total_sunat == null ? "—" : soles(i.total_sunat)}</td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                            {i.total_erp == null ? "—" : soles(i.total_erp)}
                            {i.estado === "discrepancia" && <p className="text-[10px] text-amber-700 dark:text-amber-400">Δ {soles((i.total_sunat ?? 0) - (i.total_erp ?? 0))}</p>}
                          </td>
                          <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] ring-1 ${e.c}`}><e.I className="size-3" />{e.t}</span></td>
                          <td className="px-3 py-2 text-right">
                            {i.estado === "faltante" && (
                              <div className="flex items-center justify-end gap-1">
                              <Boton variante="linea" className="whitespace-nowrap !py-1" onClick={(ev) => { ev.stopPropagation();
                                if (libro === "RVIE") {
                                  sessionStorage.setItem("sire-prefill-cpe", JSON.stringify({ fecha: i.fecha, tipo: i.tipo, serie_numero: i.serie_numero, ruc: i.ruc, razon: i.razon, base: i.base, igv: i.igv, total: i.total_sunat, moneda: i.moneda ?? "PEN", tipo_cambio: i.tipo_cambio ?? 0, vencimiento: i.vencimiento ?? "" }));
                                  navigate({ to: "/facturacion-electronica", search: { preliquidacion: "" } });
                                } else {
                                  toast.info(`Registra ${i.serie_numero} · ${i.razon} · ${soles(i.total_sunat ?? 0)}`);
                                  navigate({ to: "/gastos-generales" });
                                }
                              }}><Plus className="size-3" />{libro === "RCE" ? "Registrar en Gasto" : "Emitir"}</Boton>
                              <button title="Vincular manualmente con un documento del ERP" aria-label="Vincular manualmente" onClick={(ev) => { ev.stopPropagation(); setVinculando(i); }}
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-line hover:bg-muted hover:text-primary"><Link2 className="size-3" />Vincular</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {libro === "RCE" && (
              <p className="border-t border-line px-5 py-2 font-mono text-[10px] text-muted-foreground">
                <span className="mr-1 inline-block size-2 rounded-sm bg-sky-500/40 align-middle" />
                Azul: IGV entre 10% y 18% (tasas parciales) — {igvParcial.length} comp. por {soles(sumaIgvParcial)}.{" "}
                <span className="ml-1 inline-block size-2 rounded-sm bg-amber-500/40 align-middle" />
                Ámbar: comprobantes sin IGV (exonerados) — {sinIgv.length} comp. por {soles(sumaSinIgv)}.
              </p>
            )}
            <div className="flex justify-between border-t border-line px-5 py-3">
              <Boton variante="linea" onClick={() => setPaso(1)}><ChevronLeft className="size-3.5" />Volver</Boton>
              <Boton onClick={() => setPaso(3)}>Continuar al cierre<ChevronRight className="size-3.5" /></Boton>
            </div>
          </Panel>
        )}
        {paso === 2 && libro === "RCE" && <p className="mt-3 text-xs text-muted-foreground">La descarga y adjuntos de comprobantes de proveedores se gestionan en Facturación Electrónica → Recibidos (compras).</p>}

        {paso === 3 && reg && (
          <Panel titulo={`PASO 3 · CIERRE Y ENVÍO · ${(MESES[m - 1] ?? "").toUpperCase()} ${y}`}>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {[
                { t: "MONTO NETO TOTAL", v: soles(Number(reg.total_base)) },
                { t: "IGV TOTAL", v: soles(Number(reg.total_igv)) },
                { t: "TOTAL DE DOCUMENTOS", v: String(reg.total_docs) },
              ].map((c) => (
                <div key={c.t} className="rounded-lg border border-line bg-card p-4">
                  <p className="label-mono">{c.t}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{c.v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 px-5 pb-4 font-mono text-[11px]">
              <span className="rounded-full bg-good/10 px-2 py-0.5 text-good">{cuenta.ok} conciliados</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">{cuenta.disc} con discrepancia</span>
              <span className="rounded-full bg-bad/10 px-2 py-0.5 text-bad">{cuenta.sunat} solo en SUNAT</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-3">
              <Boton variante="linea" onClick={() => setPaso(2)}><ChevronLeft className="size-3.5" />Volver</Boton>
              <div className="flex gap-2">
                <Boton variante="linea" onClick={generarTxt}><Download className="size-3.5" />Generar Archivo de Reemplazo (.TXT)</Boton>
                <Boton onClick={enviar} disabled={reg.estado === "Aceptado"}><Send className="size-3.5" />{reg.estado === "Aceptado" ? "Aceptado" : "Enviar Aceptación a SUNAT"}</Boton>
              </div>
            </div>
            {reg.aceptado_en && <p className="flex items-center gap-1 px-5 pb-4 font-mono text-[11px] text-good"><FileSpreadsheet className="size-3.5" />Aceptado el {new Date(reg.aceptado_en).toLocaleString("es-PE")}</p>}
          </Panel>
        )}
      </div>
    </div>
  );
}

function ResumenOperaciones({ periodo, libro }: { periodo: string; libro: Libro }) {
  const { data: regsData } = useQuery({
    queryKey: ["sire-resumen", periodo],
    queryFn: async () =>
      (await supabase.from("sire_periodos").select("libro,estado,total_base,total_igv,total_docs,items").eq("periodo", periodo)).data ?? [],
  });
  const regs = regsData ?? [];
  const porLibro = (l: Libro) => regs.find((r) => r.libro === l);
  const tarjeta = (l: Libro, titulo: string, I: React.ElementType) => {
    const r = porLibro(l);
    const itemsL = (r?.items as Item[] | undefined) ?? [];
    const total = r2(itemsL.reduce((s, i) => s + (i.total_sunat ?? i.base + i.igv), 0));
    const activo = libro === l;
    return (
      <div className={`rounded-lg border p-4 ${activo ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-line bg-card"}`}>
        <p className="label-mono flex items-center gap-1.5"><I className="size-3.5" />{titulo}</p>
        {!r || r.estado === "Pendiente" ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{r ? "Propuesta pendiente en SUNAT" : "Sin sincronizar este período"}</p>
        ) : (
          <>
            <p className="mt-1 text-2xl font-bold tracking-tight">{soles(total)}</p>
            <div className="mt-1.5 space-y-0.5 font-mono text-[11px] text-muted-foreground">
              <p>Base imponible: <b className="text-ink">{soles(Number(r.total_base))}</b></p>
              <p>IGV: <b className="text-ink">{soles(Number(r.total_igv))}</b></p>
              <p>Comprobantes: <b className="text-ink">{r.total_docs}</b> · Estado: <b className={r.estado === "Aceptado" ? "text-good" : "text-ink"}>{r.estado}</b></p>
            </div>
          </>
        )}
      </div>
    );
  };
  const rv = porLibro("RVIE"); const rc = porLibro("RCE");
  const listo = (r: typeof rv) => r && r.estado !== "Pendiente";
  const neta = listo(rv) && listo(rc) ? r2(Number(rv?.total_igv ?? 0) - Number(rc?.total_igv ?? 0)) : null;
  return (
    <Panel titulo="RESUMEN DE OPERACIONES DEL PERÍODO">
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {tarjeta("RVIE", "VENTAS (RVIE)", ReceiptText)}
        {tarjeta("RCE", "COMPRAS (RCE)", ShoppingBag)}
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="label-mono">IGV POR PAGAR / SALDO</p>
          {neta === null ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">Sincroniza ambos libros para calcular</p>
          ) : (
            <>
              <p className={`mt-1 text-2xl font-bold tracking-tight ${neta >= 0 ? "text-bad" : "text-good"}`}>{soles(Math.abs(neta))}</p>
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">{neta >= 0 ? "IGV ventas − compras: por pagar a SUNAT" : "Crédito fiscal a favor"}</p>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}

function DetalleDoc({ item, onCerrar }: { item: Item; onCerrar: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onCerrar]);
  const campos: [string, string][] = item.raw && Object.keys(item.raw).length
    ? Object.entries(item.raw).filter(([, v]) => v !== "")
    : [["Fecha", fmtFecha(item.fecha)], ["Serie-Número", item.serie_numero], ["RUC", item.ruc], ["Razón social", item.razon], ["Base", soles(item.base)], ["IGV", soles(item.igv)]];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={onCerrar}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-card px-5 py-3">
          <div><p className="label-mono">DETALLE SUNAT</p><p className="font-semibold">{item.serie_numero}</p></div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-muted-foreground hover:text-ink"><XCircle className="size-5" /></button>
        </div>
        <dl className="divide-y divide-line text-sm">
          {campos.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[45%_55%] gap-2 px-5 py-1.5">
              <dt className="font-mono text-[11px] text-muted-foreground">{k}</dt><dd className="break-words text-right font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

function VincularManual({ item, libro, periodo, items, onCerrar, onVincular }: { item: Item; libro: Libro; periodo: string; items: Item[]; onCerrar: () => void; onVincular: (d: { serie_numero: string; total: number; igv: number }) => Promise<void> }) {
  const [q, setQ] = useState(""); const [ocupado, setOcupado] = useState(false);
  const { data: erp = [], isLoading } = useQuery({ queryKey: ["sire-erp-vincular", libro, periodo], queryFn: () => cargarErp(libro, periodo) });
  const usados = new Set(items.map((x) => (x.vinculado ?? (x.total_erp != null ? x.serie_numero : "")).toUpperCase()));
  const serieItem = item.serie_numero.split("-")[0]?.toUpperCase() ?? "";
  const libres = erp.filter((d) => !usados.has(d.serie_numero.toUpperCase()))
    .filter((d) => !q || `${d.serie_numero} ${d.razon} ${d.ruc}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.serie_numero.toUpperCase().startsWith(serieItem) || b.ruc === item.ruc) - Number(a.serie_numero.toUpperCase().startsWith(serieItem) || a.ruc === item.ruc) || Math.abs(a.total - (item.total_sunat ?? 0)) - Math.abs(b.total - (item.total_sunat ?? 0)));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onCerrar}>
      <div className="w-full max-w-2xl rounded-lg bg-card shadow-xl ring-1 ring-line" style={{ fontFamily: "Roboto, Arial, sans-serif" }} onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-5 py-3">
          <p className="text-sm font-semibold">Vincular manualmente</p>
          <p className="text-xs text-muted-foreground">SUNAT: <b>{item.serie_numero}</b> · {item.ruc} {item.razon} · <span className="tabular-nums">{soles(item.total_sunat ?? 0)}</span></p>
        </div>
        <div className="p-4">
          <Input placeholder="Buscar por serie-número, RUC o razón social…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="mt-3 max-h-80 overflow-y-auto rounded-md ring-1 ring-line">
            {isLoading ? <p className="p-4 text-xs text-muted-foreground">Cargando documentos del ERP…</p> : libres.length === 0 ? <p className="p-4 text-xs text-muted-foreground">No hay documentos del ERP sin conciliar en este período.</p> : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Serie-Número</th><th className="px-3 py-2 text-left">RUC / Razón social</th><th className="px-3 py-2 text-right">Total ERP</th><th /></tr></thead>
                <tbody>{libres.map((d) => (
                  <tr key={d.clave} className="border-t border-line hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2">{d.serie_numero}<p className="text-[10px] text-muted-foreground">{fmtFecha(d.fecha)}</p></td>
                    <td className="px-3 py-2"><p className="text-[10px] text-muted-foreground">{d.ruc || "—"}</p><p className="line-clamp-2">{d.razon}</p></td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${Math.abs(d.total - (item.total_sunat ?? 0)) > 0.01 ? "text-amber-700 dark:text-amber-400" : "text-good"}`}>{soles(d.total)}</td>
                    <td className="px-3 py-2 text-right"><Boton className="!py-1" disabled={ocupado} onClick={async () => { setOcupado(true); await onVincular(d); setOcupado(false); }}>Vincular</Boton></td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-5 py-3"><Boton variante="linea" onClick={onCerrar}>Cancelar</Boton></div>
      </div>
    </div>
  );
}
