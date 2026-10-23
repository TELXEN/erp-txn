import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, FilasCargando, Input, MenuFiltros, Panel, TarjetaResumen, Vacio } from "@/components/ui-kit";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { RegistrarVentaExterna, ventaCobrada, type VentaEditable } from "@/components/facturacion/RegistrarVentaExterna";
import { fecha, soles } from "@/lib/format";
import { useRecordado } from "@/lib/recordado";

export const Route = createFileRoute("/_authenticated/registro-ventas")({
  head: () => ({ meta: [{ title: "Registro de Ventas · ERP TELXEN" }, { name: "description", content: "Facturas y boletas emitidas por fuera del ERP." }] }),
  component: RegistroVentas,
});

function RegistroVentas() {
  const [abierta, setAbierta] = useState(false);
  const [editar, setEditar] = useState<VentaEditable | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const qc = useQueryClient();
  async function eliminar(v: any) {
    if (ventaCobrada(v)) { toast.error(`${v.numero_factura} ya fue cobrada: primero anula el cobro en Tesorería.`); return; }
    if (!window.confirm(`¿Eliminar la venta ${v.numero_factura} de ${v.terceros?.razon_social ?? "—"}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("ventas").delete().eq("id", v.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Venta ${v.numero_factura} eliminada`);
    qc.invalidateQueries({ queryKey: ["ventas"] });
    setSel(null);
  }
  const [busqueda, setBusqueda] = useRecordado("registro-ventas:busqueda", "");
  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ["ventas", "externas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ventas")
        .select("id,numero_factura,fecha_emision,concepto,moneda,total,monto_soles,estado,fecha_vencimiento,tipo_tributario,cliente_id,proyecto_id,tipo_cambio,monto,igv,condicion_pago,dias_credito,pct_detraccion,fecha_pago,banco_id,terceros:cliente_id(razon_social),proyectos:proyecto_id(codigo)")
        .is("comprobante_electronico_id", null).order("fecha_emision", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const q = busqueda.trim().toLowerCase();
  const filas = useMemo(() => ventas.filter((v) => !q || `${v.numero_factura} ${v.concepto} ${v.terceros?.razon_social ?? ""}`.toLowerCase().includes(q)), [ventas, q]);
  const pendientes = filas.filter((v) => v.estado !== "Pagado");
  const seleccionada = filas.find((v) => v.id === sel) ?? null;
  const fmt = (v: any) => (v.moneda === "USD" ? `US$ ${Number(v.total ?? 0).toFixed(2)}` : soles(Number(v.total ?? 0)));

  return (
    <>
      <Encabezado titulo="Registro de Ventas" subtitulo="Comercial · comprobantes emitidos por facturador externo"
        acciones={<Boton variante="accion" onClick={() => setAbierta(true)}><ReceiptText size={14} />Registrar venta</Boton>} />
      <RegistrarVentaExterna abierta={abierta || !!editar} editar={editar} onCerrar={() => { setAbierta(false); setEditar(null); }} />
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <TarjetaResumen etiqueta="Ventas registradas" cantidad={filas.length} valor={soles(filas.reduce((s, v) => s + Number(v.monto_soles ?? 0), 0))} guia="Valor de venta en soles" />
        <TarjetaResumen etiqueta="Pendientes de cobro" cantidad={pendientes.length} valor={soles(pendientes.reduce((s, v) => s + Number(v.monto_soles ?? 0), 0))} alerta={pendientes.length ? "warn" : undefined} guia="Valor de venta sin cobrar" />
        <TarjetaResumen etiqueta="Cobradas" cantidad={filas.length - pendientes.length} valor={String(filas.length - pendientes.length)} tipo="cantidad" guia="Marcadas como pagadas" />
      </div>
      <div className="flex items-start gap-3">
        <Panel titulo="Ventas externas" className="min-w-0 flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left"><th className="px-2 py-1.5">Número</th><th className="px-2">Fecha</th><th className="px-2">Cliente</th><th className="px-2">Proyecto</th><th className="px-2">Concepto</th><th className="px-2 text-right">Total</th><th className="px-2">Vence</th><th className="px-2">Estado</th></tr></thead>
              <tbody>
                {isLoading ? <FilasCargando columnas={8} /> : filas.map((v) => (
                  <tr key={v.id} onClick={() => setSel(v.id)} className={`cursor-pointer border-b hover:bg-muted/40 ${sel === v.id ? "bg-primary/10" : ""}`}>
                    <td className="px-2 py-1.5 font-mono">{v.numero_factura}</td><td className="px-2">{fecha(v.fecha_emision)}</td>
                    <td className="px-2">{v.terceros?.razon_social ?? "—"}</td><td className="px-2">{v.proyectos?.codigo ?? "—"}</td>
                    <td className="px-2">{v.concepto}</td><td className="px-2 text-right tabular-nums">{fmt(v)}</td>
                    <td className="px-2">{fecha(v.fecha_vencimiento)}</td>
                    <td className={`px-2 ${v.estado === "Pagado" ? "text-good" : "text-warn"}`}>{v.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && !filas.length && <Vacio texto="Aún no hay ventas registradas" accion={<Boton onClick={() => setAbierta(true)}>Registrar venta</Boton>} />}
          </div>
        </Panel>
        <BarraIconosHoja objeto="venta" filtros={<MenuFiltros activos={q ? 1 : 0} onLimpiar={() => setBusqueda("")}>
          <Input placeholder="Buscar número, cliente o concepto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </MenuFiltros>} haySeleccion={!!seleccionada}
          onEditar={() => { if (seleccionada) setEditar(seleccionada); }}
          onEliminar={() => { if (seleccionada) void eliminar(seleccionada); }} />
      </div>
    </>
  );
}
