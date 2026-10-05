import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, CloudDownload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Campo, Select, Vacio, Boton } from "@/components/ui-kit";
import { MESES } from "@/lib/format";
import { ComprobantesRecibidos } from "@/components/sire/ComprobantesRecibidos";
import { sincronizarSire } from "@/lib/sire.functions";
import { cargarErp, conciliar } from "@/lib/sire-conciliar";
import type { ItemSunat } from "@/lib/sire-tipos";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Recuperación de comprobantes de proveedores a partir del RCE de SUNAT, con sincronización directa. */
export function ComprobantesCompras() {
  const qc = useQueryClient();
  const sincronizar$ = useServerFn(sincronizarSire);
  const ahora = new Date();
  const [y, setY] = useState(ahora.getFullYear());
  const [m, setM] = useState(ahora.getMonth() + 1);
  const [prog, setProg] = useState<number | null>(null);
  const [fase, setFase] = useState("");
  const mm = String(m).padStart(2, "0");
  const periodoSire = `${y}-${mm}`; // formato usado por SIRE
  const periodo = `${y}${mm}`; // formato de archivos recibidos
  const qk = ["sire", "RCE", periodoSire];
  const { data: reg, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await supabase.from("sire_periodos").select("*").eq("libro", "RCE").eq("periodo", periodoSire).maybeSingle()).data,
  });
  const items = ((reg?.items as unknown[]) ?? []) as any[];
  const anios = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i);

  async function sincronizar() {
    setProg(5); setFase("Solicitando compras a SUNAT…");
    const t = setInterval(() => setProg((p) => (p === null ? p : Math.min(p + 2, 90))), 1000);
    try {
      const r = await sincronizar$({ data: { libro: "RCE", periodo: periodoSire, ticket: reg?.estado === "Pendiente" ? reg.ticket : null } });
      if (r.estado === "error") { toast.error(r.mensaje); return; }
      if (r.estado === "pendiente") {
        await supabase.from("sire_periodos").upsert({ libro: "RCE", periodo: periodoSire, estado: "Pendiente", ticket: r.ticket, origen: "sunat" }, { onConflict: "libro,periodo" });
        await qc.invalidateQueries({ queryKey: qk });
        toast.warning(r.mensaje); return;
      }
      setFase("Descargando y conciliando…");
      const its = conciliar(r.items as ItemSunat[], await cargarErp("RCE", periodoSire));
      const { error } = await supabase.from("sire_periodos").upsert({
        libro: "RCE", periodo: periodoSire, estado: "Sincronizado", items: its as any, ticket: r.ticket, origen: "sunat",
        total_base: r2(its.reduce((s, i) => s + i.base, 0)), total_igv: r2(its.reduce((s, i) => s + i.igv, 0)), total_docs: its.length,
        sincronizado_en: new Date().toISOString(), aceptado_por: null, aceptado_en: null,
      }, { onConflict: "libro,periodo" });
      if (error) throw error;
      setProg(100);
      await qc.invalidateQueries({ queryKey: qk });
      toast.success(`${its.length} compras traídas de SUNAT`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al sincronizar");
    } finally { clearInterval(t); setFase(""); setTimeout(() => setProg(null), 300); }
  }

  return (
    <>
      <Panel titulo="Sincronización con SUNAT · Compras recibidas (RCE)">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <Campo etiqueta="Mes"><Select value={m} onChange={(e) => setM(Number(e.target.value))}>{MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</Select></Campo>
          <Campo etiqueta="Año"><Select value={y} onChange={(e) => setY(Number(e.target.value))}>{anios.map((a) => <option key={a} value={a}>{a}</option>)}</Select></Campo>
          <Boton onClick={sincronizar} disabled={prog !== null}>
            {prog !== null ? <RefreshCw className="size-3.5 animate-spin" /> : <CloudDownload className="size-3.5" />}Sincronizar con SUNAT
          </Boton>
          <div className="ml-auto text-right font-mono text-[11px] text-muted-foreground">
            {reg ? <>Estado: <b className="text-ink">{reg.estado}</b> · {reg.total_docs ?? items.length} comprobantes<br />Última sincronización: {new Date(reg.sincronizado_en ?? reg.updated_at).toLocaleString("es-PE")}</> : "Periodo aún no sincronizado"}
          </div>
        </div>
        {prog !== null && (
          <div className="space-y-2 px-4 pb-4">
            <p className="font-mono text-[11px] text-muted-foreground">{fase}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${prog}%` }} /></div>
          </div>
        )}
        <p className="border-t border-line px-4 py-2 text-xs text-muted-foreground">Usa esta pestaña para recuperar facturas perdidas: trae de SUNAT las compras del mes, ubica la factura y adjunta el PDF/XML o regístrala con los datos oficiales.</p>
      </Panel>
      <div className="mt-4">
        {isLoading ? null : items.length === 0 ? <Panel titulo="Sin datos"><Vacio texto="No hay compras de este periodo. Pulsa «Sincronizar con SUNAT» para traerlas." /></Panel> : <ComprobantesRecibidos periodo={periodo} items={items} />}
      </div>
    </>
  );
}
