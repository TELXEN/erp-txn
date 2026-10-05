import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { zipSync } from "fflate";
import { Download, FileCode2, FileText, ShieldCheck, FolderDown, ClipboardCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Boton, Select } from "@/components/ui-kit";
import { soles } from "@/lib/format";
import { descargarComprobantesSire } from "@/lib/sire.functions";

type ItemRce = { clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string; base: number; igv: number; total_sunat: number | null; moneda?: string; tipo_cambio?: number };
type Recibido = {
  id: string; ruc_emisor: string; razon_emisor: string; tipo: string; serie: string; numero: string; fecha: string | null;
  moneda: string; tipo_cambio: number; base: number; igv: number; total: number;
  xml_path: string | null; pdf_path: string | null; cdr_path: string | null; estado_descarga: string; error: string | null; registrado_en: string | null;
};
const BUCKET = "comprobantes-compra";
const claveDe = (ruc: string, tipo: string, serie: string, numero: string) => `${ruc}-${tipo}-${serie}-${numero}`.toUpperCase();
function partes(sn: string) { const i = sn.lastIndexOf("-"); return { serie: sn.slice(0, i), numero: sn.slice(i + 1).replace(/^0+(?=\d)/, "") }; }

export function ComprobantesRecibidos({ periodo, items }: { periodo: string; items: ItemRce[] }) {
  const qc = useQueryClient();
  const descargar$ = useServerFn(descargarComprobantesSire);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [prog, setProg] = useState<{ h: number; t: number } | null>(null);
  const [registrar, setRegistrar] = useState(false);
  const qk = ["sire-recibidos", periodo];
  const { data: recibidos = [] } = useQuery({
    queryKey: qk,
    queryFn: async () => ((await supabase.from("comprobantes_recibidos").select("*").eq("periodo", periodo)).data ?? []) as Recibido[],
  });
  const porClave = useMemo(() => new Map(recibidos.map((r) => [claveDe(r.ruc_emisor, r.tipo, r.serie, r.numero), r])), [recibidos]);
  const filas = items.filter((i) => i.ruc && i.serie_numero.includes("-")).map((i) => {
    const p = partes(i.serie_numero);
    const k = claveDe(i.ruc, i.tipo, p.serie, p.numero);
    return { k, i, ...p, r: porClave.get(k) };
  });
  const todos = filas.length > 0 && filas.every((f) => sel.has(f.k));

  async function descargar(soloFallidas = false) {
    const objetivo = filas.filter((f) => (soloFallidas ? f.r && f.r.estado_descarga !== "Descargado" : sel.has(f.k)));
    if (!objetivo.length) { toast.info("Selecciona comprobantes");
    setProg({ h: 0, t: objetivo.length });
    let ok = 0, err = 0;
    for (let x = 0; x < objetivo.length; x += 10) {
      const lote = objetivo.slice(x, x + 10).map(({ i, serie, numero }) => ({
        ruc: i.ruc, razon: i.razon ?? "", tipo: i.tipo, serie, numero, fecha: i.fecha ?? "", moneda: i.moneda || "PEN",
        tipo_cambio: i.tipo_cambio || 1, base: i.base, igv: i.igv, total: i.total_sunat ?? 0,
      }));
      try {
        const r = await descargar$({ data: { periodo, docs: lote } });
        if (r.error) { toast.error(r.error); break; }
        r.resultados.forEach((z) => (z.ok ? ok++ : err++));
      } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); break; }
      setProg({ h: Math.min(x + 10, objetivo.length), t: objetivo.length });
      await qc.invalidateQueries({ queryKey: qk });
    }
    setProg(null);
    toast[err ? "warning" : "success"](`${ok} descargados${err ? ` · ${err} con problemas` : ""}`);
  }

  async function abrir(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
    if (error || !data) { toast.error("No se pudo abrir el archivo");
    window.open(data.signedUrl, "_blank");
  }

  async function zip() {
    const paths = recibidos.flatMap((r) => [r.xml_path, r.pdf_path, r.cdr_path].filter(Boolean) as string[]);
    if (!paths.length) { toast.info("Aún no hay archivos descargados");
    const files: Record<string, Uint8Array> = {};
    for (const p of paths) {
      const { data } = await supabase.storage.from(BUCKET).download(p);
      if (data) files[p.split("/").pop()!] = new Uint8Array(await data.arrayBuffer());
    }
    const blob = new Blob([zipSync(files) as BlobPart], { type: "application/zip" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `compras-${periodo}.zip`; a.click();
  }

  const Ic = ({ p, I, t }: { p: string | null; I: React.ElementType; t: string }) => (
    <button disabled={!p} title={p ? `Ver ${t}` : `${t} no disponible`} onClick={() => p && abrir(p)}
      className={`rounded p-1 ${p ? "text-primary hover:bg-muted" : "text-muted-foreground/40"}`}><I className="size-4" /></button>
  );

  return (
    <Panel titulo="COMPROBANTES DE COMPRA · XML / PDF / CDR"
      extra={<div className="flex flex-wrap gap-2">
        <Boton variante="linea" onClick={() => descargar()} disabled={!!prog}><Download className="size-3.5" />Descargar comprobantes{sel.size ? ` (${sel.size})` : ""}</Boton>
        <Boton variante="linea" onClick={() => descargar(true)} disabled={!!prog}>Reintentar fallidas</Boton>
        <Boton variante="linea" onClick={zip}><FolderDown className="size-3.5" />ZIP del período</Boton>
        <Boton onClick={() => setRegistrar(true)}><ClipboardCheck className="size-3.5" />Registrar en el ERP</Boton>
      </div>}>
      {prog && (
        <div className="space-y-1 px-5 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">{prog.h} de {prog.t} descargados…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(prog.h / prog.t) * 100}%` }} /></div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" checked={todos} onChange={() => setSel(todos ? new Set() : new Set(filas.map((f) => f.k)))} /></th>
              <th className="px-3 py-2 text-left">Comprobante</th><th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Descarga</th>
              <th className="px-3 py-2 text-center">Archivos</th><th className="px-3 py-2 text-left">ERP</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ k, i, r }) => (
              <tr key={k} className="border-t border-line">
                <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={sel.has(k)} onChange={() => { const s = new Set(sel); s.has(k) ? s.delete(k) : s.add(k); setSel(s); }} /></td>
                <td className="px-3 py-1.5 font-mono text-xs">{i.tipo} · {i.serie_numero}</td>
                <td className="px-3 py-1.5"><p className="font-mono text-[11px] text-muted-foreground">{i.ruc}</p><p className="truncate text-xs">{i.razon}</p></td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">{soles(i.total_sunat ?? 0)}</td>
                <td className="px-3 py-1.5 font-mono text-[11px]">
                  {!r ? <span className="text-muted-foreground">Pendiente</span>
                    : <span className={r.estado_descarga === "Descargado" ? "text-good" : "text-bad"}>{r.estado_descarga}</span>}
                  {r?.error && <p className="text-[10px] text-muted-foreground">{r.error}</p>}
                </td>
                <td className="px-3 py-1.5 text-center whitespace-nowrap">
                  <Ic p={r?.xml_path ?? null} I={FileCode2} t="XML" /><Ic p={r?.pdf_path ?? null} I={FileText} t="PDF" /><Ic p={r?.cdr_path ?? null} I={ShieldCheck} t="CDR" />
                </td>
                <td className="px-3 py-1.5 font-mono text-[11px]">{r?.registrado_en ? <span className="text-good">Registrada</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {registrar && <RegistrarModal recibidos={recibidos.filter((r) => r.estado_descarga === "Descargado" && !r.registrado_en && (sel.size === 0 || sel.has(claveDe(r.ruc_emisor, r.tipo, r.serie, r.numero))))}
        onCerrar={() => setRegistrar(false)} onListo={() => qc.invalidateQueries({ queryKey: qk })} />}
    </Panel>
  );
}

type Dest = { tipo: "gg" | "gd"; categoria: string; proyecto: string; partida: string };

function RegistrarModal({ recibidos, onCerrar, onListo }: { recibidos: Recibido[]; onCerrar: () => void; onListo: () => void }) {
  const [dest, setDest] = useState<Record<string, Dest>>({});
  const [ocupado, setOcupado] = useState(false);
  const { data: cats = [] } = useQuery({ queryKey: ["cat-gg"], queryFn: async () => (await supabase.from("categorias_gasto_general").select("nombre").eq("activo", true).order("orden")).data ?? [] });
  const { data: proys = [] } = useQuery({ queryKey: ["proy-min"], queryFn: async () => (await supabase.from("proyectos").select("id, codigo, nombre").order("codigo")).data ?? [] });
  const { data: parts = [] } = useQuery({ queryKey: ["part-min"], queryFn: async () => (await supabase.from("partidas").select("id, proyecto_id, codigo, nombre")).data ?? [] });
  const d = (id: string): Dest => dest[id] ?? { tipo: "gg", categoria: cats[0]?.nombre ?? "Servicios y Suministros", proyecto: "", partida: "" };
  const set = (id: string, p: Partial<Dest>) => setDest((s) => ({ ...s, [id]: { ...d(id), ...p } }));

  async function proveedorId(r: Recibido) {
    const { data } = await supabase.from("terceros").select("id").eq("numero_documento", r.ruc_emisor).limit(1).maybeSingle();
    if (data) return data.id;
    const { data: n, error } = await supabase.from("terceros").insert({ numero_documento: r.ruc_emisor, razon_social: r.razon_emisor || r.ruc_emisor, tipo_documento: r.ruc_emisor.length === 11 ? "RUC" : "DNI", es_proveedor: true }).select("id").single();
    if (error) throw error;
    return n.id;
  }

  async function confirmar() {
    for (const r of recibidos) { const x = d(r.id); if (x.tipo === "gd" && (!x.proyecto || !x.partida)) { toast.error(`Elige proyecto y partida para ${r.serie}-${r.numero}`); }
    setOcupado(true);
    let n = 0;
    try {
      for (const r of recibidos) {
        const x = d(r.id);
        const prov = await proveedorId(r);
        const moneda = (r.moneda === "USD" ? "USD" : "PEN") as "PEN" | "USD";
        const tc = moneda === "USD" ? Number(r.tipo_cambio) || 1 : 1;
        const comp = `${r.serie}-${r.numero}`;
        const { data: its = [] } = await supabase.from("comprobantes_recibidos_items").select("*").eq("comprobante_id", r.id).order("orden");
        const comunes = { proveedor: r.razon_emisor, proveedor_id: prov, moneda, tipo_cambio: tc, ...(r.fecha ? { fecha: r.fecha } : {}), comprobante: comp, condicion_pago: "Crédito", estado_pago: "Pendiente" };
        let regId: string | undefined;
        if (x.tipo === "gg") {
          const { data, error } = await supabase.from("gastos_generales").insert({
            ...comunes, descripcion: its?.[0]?.descripcion || `Factura ${comp}`, monto: Number(r.total), monto_soles: Number(r.total) * tc, categoria: x.categoria,
          }).select("id").single();
          if (error) throw error; regId = data.id;
        } else {
          const lista = its?.length ? its : [{ descripcion: `Factura ${comp}`, cantidad: 1, valor: Number(r.base) || Number(r.total), precio_unitario: Number(r.base) || Number(r.total) }];
          const sumaBase = lista.reduce((s, i) => s + Number(i.valor), 0) || 1;
          const factor = Number(r.total) / sumaBase;
          const filas = lista.map((i) => {
            const monto = Math.round(Number(i.valor) * factor * 100) / 100;
            const cant = Number(i.cantidad) || 1;
            return { ...comunes, proyecto_id: x.proyecto, partida_id: x.partida, descripcion: i.descripcion || `Factura ${comp}`, cantidad: cant, precio_unitario: monto / cant, monto, monto_soles: monto * tc };
          });
          const { data, error } = await supabase.from("gastos_directos").insert(filas).select("id");
          if (error) throw error; regId = data?.[0]?.id;
        }
        await supabase.from("comprobantes_recibidos").update({ registrado_en: x.tipo === "gg" ? "gasto_general" : "gasto_directo", registro_id: regId ?? null }).eq("id", r.id);
        n++;
      }
      toast.success(`${n} facturas registradas en el ERP`);
      onListo(); onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar");
      onListo();
    } finally { setOcupado(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onCerrar}>
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-line bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-card px-5 py-3">
          <div><p className="label-mono">REGISTRAR EN EL ERP</p><p className="text-sm">{recibidos.length} facturas descargadas sin registrar</p></div>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-muted-foreground hover:text-ink"><XCircle className="size-5" /></button>
        </div>
        {recibidos.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No hay facturas descargadas pendientes de registrar.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 font-mono text-[10px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Factura</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Asignación</th></tr>
            </thead>
            <tbody>
              {recibidos.map((r) => { const x = d(r.id); return (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-3 py-2"><p className="font-mono text-xs">{r.serie}-{r.numero}</p><p className="truncate text-xs text-muted-foreground">{r.razon_emisor}</p></td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.moneda === "USD" ? "US$ " : "S/ "}{Number(r.total).toFixed(2)}</td>
                  <td className="px-3 py-2"><Select value={x.tipo} onChange={(e) => set(r.id, { tipo: e.target.value as Dest["tipo"] })}><option value="gg">Gasto General</option><option value="gd">Costo Directo</option></Select></td>
                  <td className="px-3 py-2">
                    {x.tipo === "gg"
                      ? <Select value={x.categoria} onChange={(e) => set(r.id, { categoria: e.target.value })}>{cats.map((c) => <option key={c.nombre}>{c.nombre}</option>)}</Select>
                      : <div className="flex gap-2">
                          <Select value={x.proyecto} onChange={(e) => set(r.id, { proyecto: e.target.value, partida: "" })}><option value="">Proyecto…</option>{proys.map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}</Select>
                          <Select value={x.partida} onChange={(e) => set(r.id, { partida: e.target.value })}><option value="">Partida…</option>{parts.filter((p) => p.proyecto_id === x.proyecto).map((p) => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}</Select>
                        </div>}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <Boton variante="linea" onClick={onCerrar}>Cancelar</Boton>
          <Boton onClick={confirmar} disabled={ocupado || !recibidos.length}>{ocupado ? "Registrando…" : "Registrar"}</Boton>
        </div>
      </div>
    </div>
  );
}
