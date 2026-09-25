import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useProyectos } from "@/lib/datos";
import { nombreTipo, useInsumos } from "@/lib/apu";
import { exportarExcel } from "@/lib/exportar";
import { calcularStock, num, useMovimientos } from "@/lib/logistica";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — ERP TELXEN SAC" },
      { name: "description", content: "Stock valorizado por obra al costo promedio." },
      { property: "og:title", content: "Inventario — ERP TELXEN SAC" },
      { property: "og:description", content: "Stock valorizado de materiales y equipos por obra." },
    ],
  }),
  component: InventarioPage,
});

function InventarioPage() {
  const { rol } = useAuth();
  const { data: proyectos = [] } = useProyectos();
  const { data: insumos = [] } = useInsumos();
  const { data: movs = [] } = useMovimientos();
  const [filtro, setFiltro] = useState("");
  const [soloConStock, setSoloConStock] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const nombreProy = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const tipoDe = (id: string | null) => insumos.find((i) => i.id === id)?.tipo ?? "MAT";
  const filas = calcularStock(movs)
    .filter((s) => coincide(busqueda, s.descripcion, nombreProy(s.proyecto_id)))
    .filter((s) => (!filtro || s.proyecto_id === filtro) && (!soloConStock || s.stock > 0.0001))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  const obras = [...new Set(filas.map((f) => f.proyecto_id))];
  const valorTotal = filas.reduce((s, f) => s + f.valor, 0);

  function exportar() {
    exportarExcel("inventario", [
      {
        nombre: "Inventario",
        filas: filas.map((f) => ({
          Obra: nombreProy(f.proyecto_id),
          Tipo: nombreTipo(tipoDe(f.insumo_id)),
          Insumo: f.descripcion,
          Unidad: f.unidad,
          Ingresos: Number(f.ingresos.toFixed(4)),
          Salidas: Number(f.salidas.toFixed(4)),
          Stock: Number(f.stock.toFixed(4)),
          "Costo promedio (S/)": Math.round(f.costoPromedio * 100) / 100,
          "Valor (S/)": Math.round(f.valor * 100) / 100,
        })),
      },
    ]);
  }

  return (
    <>
      <Encabezado
        titulo="Inventario"
        subtitulo="Logística"
        acciones={
          <Boton variante="linea" onClick={exportar}>
            <Upload size={14} className="mr-1 inline" /> Exportar a Excel
          </Boton>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="panel px-5 py-3">
          <p className="label-mono">Valor del inventario</p>
          <p className="font-mono text-lg font-semibold text-primary">{soles(valorTotal)}</p>
        </div>
        <div className="panel px-5 py-3">
          <p className="label-mono">Ítems con stock</p>
          <p className="font-mono text-lg font-semibold">{filas.filter((f) => f.stock > 0.0001).length}</p>
        </div>
        <div className="panel px-5 py-3">
          <p className="label-mono">Obras con almacén</p>
          <p className="font-mono text-lg font-semibold">{obras.length}</p>
        </div>
      </div>

      <Panel
        titulo="Stock por obra"
        extra={
          <div className="flex items-center gap-3 font-mono text-xs">
            <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar insumo u obra..." total={filas.length} />
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="size-3.5 accent-[var(--color-primary)]" checked={soloConStock} onChange={(e) => setSoloConStock(e.target.checked)} />
              Solo con stock
            </label>
            <Select className="w-64 py-1 text-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">Todas las obras</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{nombreProy(p.id)}</option>)}
            </Select>
          </div>
        }
      >
        {filas.length === 0 ? (
          busqueda ? <Vacio texto={`Sin coincidencias para «${busqueda}»`} /> : <Vacio texto="No hay stock registrado. Los ingresos llegan al recibir órdenes de compra en almacén." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Insumo</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Und.</th>
                <th className="px-3 py-2 text-right font-medium">Ingresos</th>
                <th className="px-3 py-2 text-right font-medium">Salidas</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 text-right font-medium">Costo prom.</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => {
                const deObra = filas.filter((f) => f.proyecto_id === o);
                return (
                  <React.Fragment key={o}>
                    <tr className="bg-ink">
                      <td colSpan={7} className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper">{nombreProy(o)}</td>
                      <td className="px-5 py-1.5 text-right font-semibold text-paper">{soles(deObra.reduce((s, f) => s + f.valor, 0))}</td>
                    </tr>
                    {deObra.map((f) => (
                      <tr key={f.clave} className="border-b border-line/40">
                        <td className="px-5 py-2 text-ink"><Resaltar texto={f.descripcion} termino={busqueda} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{nombreTipo(tipoDe(f.insumo_id))}</td>
                        <td className="px-3 py-2 text-muted-foreground">{f.unidad}</td>
                        <td className="px-3 py-2 text-right">{num(f.ingresos)}</td>
                        <td className="px-3 py-2 text-right">{num(f.salidas)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${f.stock > 0 ? "text-ink" : "text-bad"}`}>{num(f.stock)}</td>
                        <td className="px-3 py-2 text-right">{num(f.costoPromedio)}</td>
                        <td className="px-5 py-2 text-right">{soles(f.valor)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
