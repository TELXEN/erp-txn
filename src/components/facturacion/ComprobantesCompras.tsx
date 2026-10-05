import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Panel, Campo, Select, Vacio } from "@/components/ui-kit";
import { MESES } from "@/lib/format";
import { ComprobantesRecibidos } from "@/components/sire/ComprobantesRecibidos";

/** Gestión de comprobantes de proveedores (descarga, adjuntos, ficha A4) a partir del RCE sincronizado en SIRE. */
export function ComprobantesCompras() {
  const ahora = new Date();
  const [y, setY] = useState(ahora.getFullYear());
  const [m, setM] = useState(ahora.getMonth() + 1);
  const periodo = `${y}${String(m).padStart(2, "0")}`;
  const { data: reg, isLoading } = useQuery({
    queryKey: ["sire-periodo", "RCE", periodo],
    queryFn: async () => (await supabase.from("sire_periodos").select("items").eq("libro", "RCE").eq("periodo", periodo).maybeSingle()).data,
  });
  const items = ((reg?.items as unknown[]) ?? []) as any[];
  const anios = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - i);
  return (
    <>
      <Panel titulo="Comprobantes recibidos de proveedores">
        <div className="grid gap-3 p-4 sm:grid-cols-[160px_120px_1fr] sm:items-end">
          <Campo etiqueta="Mes"><Select value={m} onChange={(e) => setM(Number(e.target.value))}>{MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</Select></Campo>
          <Campo etiqueta="Año"><Select value={y} onChange={(e) => setY(Number(e.target.value))}>{anios.map((a) => <option key={a} value={a}>{a}</option>)}</Select></Campo>
          <p className="text-xs text-muted-foreground">La lista proviene del Registro de Compras (RCE) sincronizado en SIRE. Aquí descargas, adjuntas el PDF/XML del proveedor y registras la compra.</p>
        </div>
      </Panel>
      <div className="mt-4">
        {isLoading ? null : items.length === 0 ? <Panel titulo="Sin datos"><Vacio texto="No hay compras sincronizadas para este periodo. Sincroniza primero el RCE en el módulo SIRE." /></Panel> : <ComprobantesRecibidos periodo={periodo} items={items} />}
      </div>
    </>
  );
}
