import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, KeyRound, ShieldCheck, Download, Send,
  FileSpreadsheet, ShoppingBag, ReceiptText, Plus, ChevronRight, ChevronLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Encabezado } from "@/components/AppShell";
import { Panel, Campo, Input, Select, Boton, SinAcceso, Vacio } from "@/components/ui-kit";
import { MESES, fecha as fmtFecha, soles } from "@/lib/format";
import { guardarConfigSire, validarConexionSire } from "@/lib/sire.functions";

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

type Libro = "RVIE" | "RCE";
type Estado = "match" | "discrepancia" | "faltante" | "solo_erp";
type Item = {
  clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string;
  base: number; igv: number; total_sunat: number | null; total_erp: number | null; igv_erp: number | null; estado: Estado;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function SirePage() {
  const { rol } = useAuth();
  const [tab, setTab] = useState<"config" | Libro>("RVIE");
  if (rol !== "gerente" && rol !== "administrador") return <SinAcceso />;
  const tabs: { k: "config" | Libro; t: string; i: React.ElementType }[] = [
    { k: "RVIE", t: "Ventas (RVIE)", i: ReceiptText },
    { k: "RCE", t: "Compras (RCE)", i: ShoppingBag },
    ...(rol === "gerente" ? [{ k: "config" as const, t: "Configuración API SOL", i: KeyRound }] : []),
  ];
  return (
    <div>
      <Encabezado titulo="SIRE SUNAT" subtitulo="FINANZAS Y CONTABILIDAD · REGISTROS ELECTRÓNICOS" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-card p-1">
        {tabs.map(({ k, t, i: I }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <I className="size-3.5" />{t}
          </button>
        ))}
      </div>
      {tab === "config" ? <ConfigSol /> : <PanelLibro key={tab} libro={tab} />}
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
function rangoPeriodo(p: string) {
  const [y = 2026, m = 1] = p.split("-").map(Number);
      const { data: emp } = await supabase.from("empresa_config").select("ruc").limit(1).maybeSingle();
  return { ini: `${p}-01`, fin };
}

type DocErp = { clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string; total: number; igv: number };

async function cargarErp(libro: Libro, periodo: string): Promise<DocErp[]> {
  const { ini, fin } = rangoPeriodo(periodo);
  if (libro === "RVIE") {
    const { data } = await supabase.from("comprobantes_electronicos")
      .select("tipo_comprobante, serie, numero, fecha_emision, cliente_numero_documento, cliente_razon_social, total_soles, total, igv, estado_fiscal")
      .gte("fecha_emision", ini).lte("fecha_emision", fin).in("tipo_comprobante", ["01", "03", "07", "08"]);
    return (data ?? []).filter((c) => (c.estado_fiscal ?? "").toLowerCase() !== "borrador").map((c) => {
      const sn = c.numero ?? `${c.serie ?? ""}`;
      return { clave: `${c.tipo_comprobante}|${sn}`, fecha: c.fecha_emision, tipo: c.tipo_comprobante, serie_numero: sn, ruc: c.cliente_numero_documento ?? "", razon: c.cliente_razon_social ?? "", total: Number(c.total_soles ?? c.total ?? 0), igv: Number(c.igv ?? 0) };
    });
  }
  const sel = "id, fecha, comprobante, monto_soles, monto, proveedor, terceros:proveedor_id(numero_documento, razon_social)";
  const [gd, gg] = await Promise.all([
    supabase.from("gastos_directos").select(sel).gte("fecha", ini).lte("fecha", fin),
    supabase.from("gastos_generales").select(sel).gte("fecha", ini).lte("fecha", fin),
  ]);
  const filas = [...((gd.data ?? []) as any[]), ...((gg.data ?? []) as any[])].filter((g) => (g.comprobante ?? "").trim());
  const mapa = new Map<string, DocErp>();
  for (const g of filas) {
    const sn = String(g.comprobante).trim().toUpperCase();
    const total = Number(g.monto_soles ?? g.monto ?? 0);
    const prev = mapa.get(sn);
    if (prev) { prev.total = r2(prev.total + total); prev.igv = r2(prev.total - prev.total / 1.18); continue; }
    mapa.set(sn, { clave: `01|${sn}`, fecha: g.fecha, tipo: "01", serie_numero: sn, ruc: g.terceros?.numero_documento ?? "", razon: g.terceros?.razon_social ?? g.proveedor ?? "", total, igv: r2(total - total / 1.18) });
  }
  return [...mapa.values()];
}

/** Propuesta SUNAT simulada a partir del ERP, con discrepancias y faltantes de prueba. */
function simularPropuesta(erp: DocErp[], libro: Libro, periodo: string): Item[] {
  const items: Item[] = erp.map((d, i) => {
    const desv = i % 5 === 3;
    const total = desv ? r2(d.total * 1.02) : d.total;
    const igv = r2(total - total / 1.18);
    return {
      clave: d.clave, fecha: d.fecha, tipo: d.tipo, serie_numero: d.serie_numero, ruc: d.ruc, razon: d.razon,
      base: r2(total - igv), igv, total_sunat: total, total_erp: d.total, igv_erp: d.igv,
      estado: Math.abs(total - d.total) > 0.01 ? "discrepancia" : "match",
    };
  });
  if (libro === "RCE") {
    const ejemplos = [
      { ruc: "20100070970", razon: "SUPERMERCADOS PERUANOS S.A.", total: 354.0 },
      { ruc: "20331061655", razon: "PROMART HOMECENTER S.A.C.", total: 1180.0 },
    ];
    ejemplos.forEach((e, k) => {
      const igv = r2(e.total - e.total / 1.18);
      const sn = `F${900 + k}-${String(1520 + k).padStart(8, "0")}`;
      items.push({ clave: `01|${sn}`, fecha: `${periodo}-${String(10 + k * 7).padStart(2, "0")}`, tipo: "01", serie_numero: sn, ruc: e.ruc, razon: e.razon, base: r2(e.total - igv), igv, total_sunat: e.total, total_erp: null, igv_erp: null, estado: "faltante" });
    });
  }
  return items.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

const ESTADO_UI: Record<Estado, { t: string; c: string; I: React.ElementType }> = {
  match: { t: "Match perfecto", c: "text-good bg-good/10 ring-good/20", I: CheckCircle2 },
  discrepancia: { t: "Discrepancia monto/IGV", c: "text-amber-700 bg-amber-500/10 ring-amber-500/25 dark:text-amber-400", I: AlertTriangle },
  faltante: { t: "Faltante en ERP", c: "text-bad bg-bad/10 ring-bad/20", I: XCircle },
  solo_erp: { t: "Solo en ERP", c: "text-muted-foreground bg-muted ring-line", I: XCircle },
};

function PanelLibro({ libro }: { libro: Libro }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [periodo, setPeriodo] = useState(periodoDefecto());
  const [paso, setPaso] = useState(1);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "ok" | "disc" | "sunat">("todos");

  const { data: reg } = useQuery({
    queryKey: ["sire", libro, periodo],
    queryFn: async () => (await supabase.from("sire_periodos").select("*").eq("libro", libro).eq("periodo", periodo).maybeSingle()).data,
  });
  const items = (reg?.items as Item[] | undefined) ?? [];
  useEffect(() => { setPaso(reg ? (reg.estado === "Aceptado" ? 3 : 2) : 1); }, [reg?.id, reg?.estado]);

  async function sincronizar() {
    setProgreso(0);
    const t = setInterval(() => setProgreso((p) => (p === null ? p : Math.min(p + 9, 92))), 160);
    try {
      const erp = await cargarErp(libro, periodo);
      await new Promise((r) => setTimeout(r, 1800));
      const its = simularPropuesta(erp, libro, periodo);
      const fila = {
        libro, periodo, estado: "Sincronizado", items: its as any,
        total_base: r2(its.reduce((s, i) => s + i.base, 0)), total_igv: r2(its.reduce((s, i) => s + i.igv, 0)), total_docs: its.length,
        sincronizado_en: new Date().toISOString(), aceptado_por: null, aceptado_en: null,
      };
      const { error } = await supabase.from("sire_periodos").upsert(fila, { onConflict: "libro,periodo" });
      if (error) throw error;
      setProgreso(100);
      await qc.invalidateQueries({ queryKey: ["sire", libro, periodo] });
      toast.success(`Propuesta ${libro} sincronizada (simulación): ${its.length} documentos`);
      setPaso(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al sincronizar");
    } finally { clearInterval(t); setTimeout(() => setProgreso(null), 300); }
  }

  const cuenta = useMemo(() => ({
    todos: items.length,
    ok: items.filter((i) => i.estado === "match").length,
    disc: items.filter((i) => i.estado === "discrepancia").length,
    sunat: items.filter((i) => i.estado === "faltante").length,
  }), [items]);
  const visibles = items.filter((i) => filtro === "todos" || (filtro === "ok" && i.estado === "match") || (filtro === "disc" && i.estado === "discrepancia") || (filtro === "sunat" && i.estado === "faltante"));

  function generarTxt() {
    const ruc = "";
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
    const { error } = await supabase.from("sire_periodos").update({ estado: "Aceptado", aceptado_por: session?.user.id ?? null, aceptado_en: new Date().toISOString() }).eq("id", reg.id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["sire", libro, periodo] });
    toast.success(`Aceptación de la propuesta ${libro} enviada a SUNAT (simulación)`);
  }

  const [y = 2026, m = 1] = periodo.split("-").map(Number);
  const anios = [y - 1, y, y + 1].filter((a, i, arr) => arr.indexOf(a) === i);
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

      <div key={paso} className="rise">
        {paso === 1 && (
          <Panel titulo={`PASO 1 · SINCRONIZAR PROPUESTA ${libro}`}>
            <div className="flex flex-wrap items-end gap-3 p-5">
              <Campo etiqueta="Mes"><Select value={m} onChange={(e) => setPeriodo(`${y}-${String(e.target.value).padStart(2, "0")}`)}>{MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</Select></Campo>
              <Campo etiqueta="Año"><Select value={y} onChange={(e) => setPeriodo(`${e.target.value}-${String(m).padStart(2, "0")}`)}>{anios.map((a) => <option key={a}>{a}</option>)}</Select></Campo>
              <Boton onClick={sincronizar} disabled={progreso !== null}><RefreshCw className={`size-3.5 ${progreso !== null ? "animate-spin" : ""}`} />Sincronizar Propuesta con SUNAT</Boton>
              {reg && <span className="font-mono text-[11px] text-muted-foreground">Última sincronización: {new Date(reg.sincronizado_en ?? reg.updated_at).toLocaleString("es-PE")}</span>}
            </div>
            {progreso !== null && (
              <div className="space-y-2 px-5 pb-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-150" style={{ width: `${progreso}%` }} /></div>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 animate-pulse rounded bg-muted" />)}
              </div>
            )}
          </Panel>
        )}

        {paso === 2 && (
          <Panel titulo={`PASO 2 · CONCILIACIÓN SUNAT vs ERP · ${(MESES[m - 1] ?? "").toUpperCase()} ${y}`}
            extra={<div className="flex gap-1">
              {([["todos", "Todos"], ["ok", "Conciliados"], ["disc", "Con Discrepancias"], ["sunat", "Solo en SUNAT"]] as const).map(([k, t]) => (
                <button key={k} onClick={() => setFiltro(k)} className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${filtro === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t} <span className="opacity-70">({cuenta[k]})</span></button>
              ))}
            </div>}>
            {visibles.length === 0 ? <Vacio texto="Sin documentos en este filtro" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>{["Fecha", "Tipo", "Serie-Número", "RUC / Razón social", "Base", "IGV", "Total SUNAT", "Total ERP", "Estado", ""].map((h, i) => <th key={i} className={`px-3 py-2 ${i >= 4 && i <= 7 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visibles.map((i) => {
                      const e = ESTADO_UI[i.estado];
                      return (
                        <tr key={i.clave} className="border-t border-line hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{fmtFecha(i.fecha)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{i.tipo}</td>
                          <td className="px-3 py-2 font-mono text-xs">{i.serie_numero}</td>
                          <td className="px-3 py-2"><p className="font-mono text-[11px] text-muted-foreground">{i.ruc || "—"}</p><p className="truncate text-xs">{i.razon}</p></td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{soles(i.base)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{soles(i.igv)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{i.total_sunat == null ? "—" : soles(i.total_sunat)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">
                            {i.total_erp == null ? "—" : soles(i.total_erp)}
                            {i.estado === "discrepancia" && <p className="text-[10px] text-amber-700 dark:text-amber-400">Δ {soles((i.total_sunat ?? 0) - (i.total_erp ?? 0))}</p>}
                          </td>
                          <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] ring-1 ${e.c}`}><e.I className="size-3" />{e.t}</span></td>
                          <td className="px-3 py-2 text-right">
                            {i.estado === "faltante" && (
                              <Boton variante="linea" className="whitespace-nowrap !py-1" onClick={() => {
                                toast.info(`Registra ${i.serie_numero} · ${i.razon} · ${soles(i.total_sunat ?? 0)}`);
                                navigate({ to: libro === "RCE" ? "/gastos-generales" : "/facturacion-electronica" });
                              }}><Plus className="size-3" />{libro === "RCE" ? "Registrar en Gasto" : "Emitir"}</Boton>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between border-t border-line px-5 py-3">
              <Boton variante="linea" onClick={() => setPaso(1)}><ChevronLeft className="size-3.5" />Volver</Boton>
              <Boton onClick={() => setPaso(3)}>Continuar al cierre<ChevronRight className="size-3.5" /></Boton>
            </div>
          </Panel>
        )}

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
