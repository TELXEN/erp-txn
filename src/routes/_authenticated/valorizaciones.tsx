import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useProyectos, useVentas } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/valorizaciones")({
  head: () => ({
    meta: [
      { title: "Valorizaciones — Control de Obra" },
      { name: "description", content: "Ventas e ingresos por valorizaciones cobradas al cliente, con conversión a Soles." },
      { property: "og:title", content: "Valorizaciones — Control de Obra" },
      { property: "og:description", content: "Ingresos y valorizaciones por proyecto." },
    ],
  }),
  component: Valorizaciones;
});

function Valorizaciones() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: ventas = [] } = useVentas();
  const [form, setForm] = useState({
    proyecto_id: "",
    concepto: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    numero_factura: "",
    fecha_pago: hoy(),
    estado: "Pendiente de Pago",
  });
  const [error, setError] = useState("");

  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);
  const totalCobrado = ventas.filter((v) => v.estado === "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);
  const totalPendiente = ventas.filter((v) => v.estado !== "Pagado").reduce((s, v) => s + Number(v.monto_soles), 0);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const { error: err } = await supabase.from("ventas").insert({
      proyecto_id: form.proyecto_id,
      concepto: form.concepto.trim(),
      monto: Number(form.monto || 0),
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: Number(form.monto || 0) * tc,
      numero_factura: form.numero_factura.trim(),
      fecha_pago: form.fecha_pago || null,
      estado: form.estado as "Pagado" | "Pendiente de Pago",
    });
    if (err) return setError(err.message);
    setForm({ ...form, concepto: "", monto: "", numero_factura: "" });
    qc.invalidateQueries({ queryKey: ["ventas"] });
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase
      .from("ventas")
      .update({ estado: estado as "Pagado" | "Pendiente de Pago" })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["ventas"] });
  }

  return (
    <>
      <Encabezado
        titulo="Ventas y Valorizaciones"
        subtitulo="Ingresos cobrados al cliente"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("valorizaciones", [
                {
                  nombre: "Ingresos",
                  filas: ventas.map((v) => ({
                    Proyecto: nombreProy(v.proyecto_id),
                    Concepto: v.concepto,
                    Monto: Number(v.monto),
                    Moneda: v.moneda,
                    "Tipo de Cambio": Number(v.tipo_cambio),
                    "Equivalente (S/)": Number(v.monto_soles),
                    Factura: v.numero_factura,
                    "Fecha de Pago": v.fecha_pago ?? "",
                    Estado: v.estado,
                  })),
                },
              ])
            }
          >
            Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nueva valorización" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Proyecto">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Concepto">
            <Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="Monto valorizado">
            <Input type="number" step="0.01" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
          </Campo>
          <Campo etiqueta="Moneda">
            <Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo etiqueta="Tipo de cambio">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.tipo_cambio}
              onChange={(e) => setForm({ ...form, tipo_cambio: e.target.value })}
              disabled={form.moneda === "PEN"}
              required={form.moneda === "USD"}
            />
          </Campo>
          <Campo etiqueta="N° de factura emitida">
            <Input value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} maxLength={40} />
          </Campo>
          <Campo etiqueta="Fecha de pago">
            <Input type="date" value={form.fecha_pago} onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estado">
            <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="Pendiente de Pago">Pendiente de Pago</option>
              <option value="Pagado">Pagado</option>
            </Select>
          </Campo>
          <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
            <Boton type="submit">Registrar valorización</Boton>
            <span className="font-mono text-xs text-muted-foreground">
              Equivalente: <strong className="text-ink">{soles(equivalente)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Valorizaciones registradas"
        extra={
          <span className="font-mono text-[11px] text-muted-foreground">
            Cobrado {soles(totalCobrado)} · Pendiente {soles(totalPendiente)}
          </span>
        }
      >
        {ventas.length === 0 ? (
          <Vacio texto="Aún no hay valorizaciones." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Proyecto</th>
                <th className="px-3 py-2 font-medium">Factura</th>
                <th className="px-3 py-2 font-medium">Pago</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-right font-medium">Equiv. S/</th>
                <th className="px-5 py-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink">{v.concepto}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{nombreProy(v.proyecto_id)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.numero_factura || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.fecha_pago ? fmtFecha(v.fecha_pago) : "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {v.moneda === "USD" ? `US$ ${Number(v.monto).toFixed(2)}` : soles(Number(v.monto))}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{soles(Number(v.monto_soles))}</td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Etiqueta tono={v.estado === "Pagado" ? "good" : "bad"}>{v.estado}</Etiqueta>
                      <Select className="w-44" value={v.estado} onChange={(e) => cambiarEstado(v.id, e.target.value)}>
                        <option value="Pendiente de Pago">Pendiente de Pago</option>
                        <option value="Pagado">Pagado</option>
                      </Select>
                    </div>
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
