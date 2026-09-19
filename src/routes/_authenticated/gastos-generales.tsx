import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useGastosGenerales } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/gastos-generales")({
  head: () => ({
    meta: [
      { title: "Gastos Generales — ERP TELXEN" },
      { name: "description", content: "Compras indirectas y costos de oficina no vinculados a partidas, en Soles." },
      { property: "og:title", content: "Gastos Generales — ERP TELXEN" },
      { property: "og:description", content: "Costos administrativos consolidados en Soles." },
    ],
  }),
  component: GastosGenerales,
});

function GastosGenerales() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: gastos = [] } = useGastosGenerales();
  const [form, setForm] = useState({
    descripcion: "",
    proveedor: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    fecha: hoy(),
  });
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<{ id: string; descripcion: string; monto: string } | null>(null);
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);
  const total = gastos.reduce((s, g) => s + Number(g.monto_soles), 0);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const { error: err } = await supabase.from("gastos_generales").insert({
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
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este gasto general? Esta acción no se puede deshacer.")) return;
    await supabase.from("gastos_generales").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  function iniciarEdicion(g: (typeof gastos)[number]) {
    setEditando({ id: g.id, descripcion: g.descripcion, monto: String(g.monto) });
  }

  function cancelarEdicion() {
    setEditando(null);
  }

  async function actualizarEdicion(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    const monto = Number(editando.monto);
    if (monto < 0) return setError("El monto no puede ser negativo.");
    const original = gastos.find((g) => g.id === editando.id);
    if (!original) return;
    const tc = original.moneda === "USD" ? Number(original.tipo_cambio) : 1;
    const { error: err } = await supabase
      .from("gastos_generales")
      .update({ descripcion: editando.descripcion.trim(), monto, monto_soles: monto * tc })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  return (
    <>
      <Encabezado
        titulo="Gastos Generales"
        subtitulo="Compras indirectas y oficina"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("gastos-generales", [
                {
                  nombre: "Gastos Generales",
                  filas: gastos.map((g) => ({
                    Fecha: g.fecha,
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

      <Panel titulo="Nuevo gasto general" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Descripción">
            <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required maxLength={160} />
          </Campo>
          <Campo etiqueta="Proveedor">
            <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} maxLength={120} />
          </Campo>
          <Campo etiqueta="Monto gastado">
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
          <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
            <Boton type="submit">Registrar gasto</Boton>
            <span className="pb-2 font-mono text-xs text-muted-foreground">
              Equivalente: <strong className="text-ink">{soles(equivalente)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel
        titulo="Gastos registrados"
        extra={<span className="font-mono text-[11px] text-muted-foreground">Total: {soles(total)}</span>}
      >
        {gastos.length === 0 ? (
          <Vacio texto="Aún no hay gastos generales." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-2/12 px-5 py-2 font-medium">Fecha</th>
                <th className="w-4/12 px-3 py-2 font-medium">Descripción</th>
                <th className="w-2/12 px-3 py-2 font-medium">Proveedor</th>
                <th className="w-2/12 px-3 py-2 text-right font-medium">Monto</th>
                <th className="w-2/12 px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) =>
                editando?.id === g.id ? (
                  <tr key={g.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5">{fmtFecha(g.fecha)}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={editando.descripcion}
                        onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                        className="py-1 text-xs"
                        maxLength={160}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{g.proveedor || "—"}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editando.monto}
                        onChange={(e) => setEditando({ ...editando, monto: e.target.value })}
                        className="py-1 text-xs"
                      />
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={actualizarEdicion}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                          title="Guardar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelarEdicion}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={g.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5">{fmtFecha(g.fecha)}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink">{g.descripcion}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{g.proveedor || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {g.moneda === "USD" ? `US$ ${Number(g.monto).toFixed(2)}` : soles(Number(g.monto))}
                        <Etiqueta tono="neutro">{g.moneda === "USD" ? `TC ${Number(g.tipo_cambio)}` : "PEN"}</Etiqueta>
                      </div>
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(g)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(g.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
