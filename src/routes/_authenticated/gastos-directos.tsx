import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useGastosDirectos, usePartidas, useProyectos } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/gastos-directos")({
  head: () => ({
    meta: [
      { title: "Gastos Directos — Control de Proyectos" },
      { name: "description", content: "Compras vinculadas a partidas con lógica bimoneda y tipo de cambio manual." },
      { property: "og:title", content: "Gastos Directos — Control de Proyectos" },
      { property: "og:description", content: "Compras por partida con conversión a Soles." },
    ],
  }),
  component: GastosDirectos,
});

function GastosDirectos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: gastos = [] } = useGastosDirectos();
  const [form, setForm] = useState({
    proyecto_id: "",
    partida_id: "",
    descripcion: "",
    proveedor: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    fecha: hoy(),
  });
  const [error, setError] = useState("");

  const partidasProyecto = partidas.filter((p) => p.proyecto_id === form.proyecto_id);
  const nombreProy = (id: string) => proyectos.find((p) => p.id === id)?.nombre ?? "—";
  const nombrePart = (id: string) => partidas.find((p) => p.id === id)?.nombre ?? "—";
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const { error: err } = await supabase.from("gastos_directos").insert({
      proyecto_id: form.proyecto_id,
      partida_id: form.partida_id,
      descripcion: form.descripcion.trim(),
      proveedor: form.proveedor.trim(),
      monto: Number(form.monto || 0),
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: Number(form.monto || 0) * tc,
      fecha: form.fecha,
    });
    if (err) return setError(err.message);
    setForm({ ...form, descripcion: "", proveedor: "", monto: "" });
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta compra registrada? Esta acción no se puede deshacer.")) return;
    await supabase.from("gastos_directos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gastos_directos"] });
  }

  return (
    <>
      <Encabezado
        titulo="Gastos Directos"
        subtitulo="Compras vinculadas a partidas"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("gastos-directos", [
                {
                  nombre: "Gastos Directos",
                  filas: gastos.map((g) => ({
                    Fecha: g.fecha,
                    Proyecto: nombreProy(g.proyecto_id),
                    Partida: nombrePart(g.partida_id),
                    Descripcion: g.descripcion,
                    Proveedor: g.proveedor,
                    Monto: Number(g.monto),
                    Moneda: g.moneda,
                    "Tipo de Cambio": Number(g.tipo_cambio),
                    "Equivalente (S/)": Number(g.monto_soles),
                  })),
                },
              ])
            }
          >
            Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nueva compra directa" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Proyecto">
            <Select
              value={form.proyecto_id}
              onChange={(e) => setForm({ ...form, proyecto_id: e.target.value, partida_id: "" })}
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
          <Campo etiqueta="Partida (obligatoria)">
            <Select value={form.partida_id} onChange={(e) => setForm({ ...form, partida_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {partidasProyecto.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.especialidad} · {p.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Descripción">
            <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="Proveedor">
            <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Monto presupuestado">
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
          <Campo etiqueta="Fecha">
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Campo>
          <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
            <Boton type="submit">Registrar gasto</Boton>
            <span className="font-mono text-xs text-muted-foreground">
              Equivalente en base de datos: <strong className="text-ink">{soles(equivalente)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Compras registradas">
        {gastos.length === 0 ? (
          <Vacio texto="Aún no hay gastos directos." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Proyecto / Partida</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 text-right font-medium">Monto</th>
                <th className="px-3 py-2 text-right font-medium">Equiv. S/</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5">{fmtFecha(g.fecha)}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink">{g.descripcion}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {nombreProy(g.proyecto_id)} · {nombrePart(g.partida_id)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.proveedor || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {g.moneda === "USD" ? `US$ ${Number(g.monto).toFixed(2)}` : soles(Number(g.monto))}
                      <Etiqueta tono="neutro">{g.moneda === "USD" ? `TC ${Number(g.tipo_cambio)}` : "PEN"}</Etiqueta>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{soles(Number(g.monto_soles))}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Boton variante="peligro" className="px-2 py-1 text-[10px]" onClick={() => eliminar(g.id)}>
                      Eliminar
                    </Boton>
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
