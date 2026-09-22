import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { InsigniaCategoriaGasto } from "@/components/estado-ui";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { fecha as fmtFecha, hoy, soles } from "@/lib/format";
import { useCategoriasGastoGeneral, useGastosGenerales, useProyectos, useTerceros } from "@/lib/datos";
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
  const { data: terceros = [] } = useTerceros();
  const { data: proyectos = [] } = useProyectos();
  const { data: categorias = [] } = useCategoriasGastoGeneral();
  const proveedores = terceros.filter((t) => t.es_proveedor && t.activo);
  const categoriasActivas = categorias.filter((c) => c.activo);
  const [form, setForm] = useState({
    descripcion: "",
    proveedor_id: "",
    proyecto_id: "",
    categoria: "",
    monto: "",
    moneda: "PEN",
    tipo_cambio: "3.75",
    fecha: hoy(),
  });
  const [error, setError] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [editando, setEditando] = useState<{
    id: string;
    descripcion: string;
    monto: string;
    categoria: string;
  } | null>(null);
  const nombreProv = (g: (typeof gastos)[number]) =>
    (g.proveedor_id ? terceros.find((t) => t.id === g.proveedor_id)?.razon_social : null) ?? g.proveedor ?? "—";
  const nombreProy = (id: string | null) =>
    id ? (proyectos.find((p) => p.id === id)?.nombre ?? "—") : "Oficina";
  const equivalente = Number(form.monto || 0) * (form.moneda === "USD" ? Number(form.tipo_cambio || 0) : 1);
  const gastosFiltrados =
    filtroCategoria === "Todas" ? gastos : gastos.filter((g) => (g.categoria ?? "") === filtroCategoria);
  const totalesCategoria = categoriasActivas.map((c) => ({
    nombre: c.nombre,
    total: gastos.filter((g) => (g.categoria ?? "") === c.nombre).reduce((s, g) => s + Number(g.monto_soles), 0),
  }));
  const total = gastosFiltrados.reduce((s, g) => s + Number(g.monto_soles), 0);

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.categoria) return setError("Selecciona la categoría del gasto general.");
    if (form.moneda === "USD" && Number(form.tipo_cambio) <= 0)
      return setError("Ingresa un tipo de cambio válido para dólares.");
    const tc = form.moneda === "USD" ? Number(form.tipo_cambio) : 1;
    const prov = terceros.find((t) => t.id === form.proveedor_id);
    const { error: err } = await supabase.from("gastos_generales").insert({
      descripcion: form.descripcion.trim(),
      proveedor: prov?.razon_social ?? "",
      proveedor_id: form.proveedor_id || null,
      proyecto_id: form.proyecto_id || null,
      categoria: form.categoria,
      monto: Number(form.monto || 0),
      moneda: form.moneda as "PEN" | "USD",
      tipo_cambio: tc,
      monto_soles: Number(form.monto || 0) * tc,
      fecha: form.fecha,
    });
    if (err) return setError(err.message);
    setForm({ ...form, descripcion: "", proveedor_id: "", monto: "" });
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este gasto general? Esta acción no se puede deshacer.")) return;
    await supabase.from("gastos_generales").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  }

  function iniciarEdicion(g: (typeof gastos)[number]) {
    setEditando({ id: g.id, descripcion: g.descripcion, monto: String(g.monto), categoria: g.categoria ?? "" });
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
      .update({
        descripcion: editando.descripcion.trim(),
        categoria: editando.categoria,
        monto,
        monto_soles: monto * tc,
      })
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
                  filas: gastosFiltrados.map((g) => ({
                    Fecha: g.fecha,
                    Descripcion: g.descripcion,
                    Categoria: g.categoria ?? "",
                    Obra: nombreProy(g.proyecto_id),
                    Proveedor: nombreProv(g),
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
          <Campo etiqueta="Categoría del gasto">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
              <option value="">Selecciona...</option>
              {categoriasActivas.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            {ayudaCategoria && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ayudaCategoria}</p>
            )}
          </Campo>
          <Campo etiqueta="Proveedor">
            <Select value={form.proveedor_id} onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })} required>
              <option value="">Selecciona...</option>
              {proveedores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.razon_social}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Obra asignada (opcional)">
            <Select value={form.proyecto_id} onChange={(e) => setForm({ ...form, proyecto_id: e.target.value })}>
              <option value="">Sin asignar (oficina)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
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
          <div className="sm:col-span-4 flex flex-wrap items-end gap-3">
            <Boton type="submit">Registrar gasto</Boton>
            <span className="pb-2 font-mono text-xs text-muted-foreground">
              Equivalente: <strong className="text-ink">{soles(equivalente)}</strong>
            </span>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      {totalesCategoria.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {totalesCategoria.map((t) => (
            <button
              key={t.nombre}
              type="button"
              onClick={() => setFiltroCategoria(filtroCategoria === t.nombre ? "Todas" : t.nombre)}
              aria-pressed={filtroCategoria === t.nombre}
              className={`panel rise p-4 text-left transition ${
                filtroCategoria === t.nombre ? "border-primary ring-1 ring-primary/40" : ""
              }`}
            >
              <InsigniaCategoriaGasto valor={t.nombre} />
              <p className="mt-2 font-mono text-lg font-bold tracking-tight text-ink">{soles(t.total)}</p>
            </button>
          ))}
        </div>
      )}

      <Panel
        titulo="Gastos registrados"
        extra={
          <div className="flex items-center gap-3">
            {filtroCategoria !== "Todas" && (
              <button
                type="button"
                onClick={() => setFiltroCategoria("Todas")}
                className="font-mono text-[11px] text-primary underline-offset-2 hover:underline"
              >
                Ver todas
              </button>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">Total: {soles(total)}</span>
          </div>
        }
      >
        {gastosFiltrados.length === 0 ? (
          <Vacio
            texto={
              filtroCategoria === "Todas"
                ? "Aún no hay gastos generales."
                : `No hay gastos de la categoría ${filtroCategoria}.`
            }
          />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-1/12 px-5 py-2 font-medium">Fecha</th>
                <th className="w-3/12 px-3 py-2 font-medium">Descripción</th>
                <th className="w-3/12 px-3 py-2 font-medium">Categoría</th>
                <th className="w-2/12 px-3 py-2 font-medium">Proveedor</th>
                <th className="w-2/12 px-3 py-2 text-right font-medium">Monto</th>
                <th className="w-1/12 px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((g) =>
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
                    <td className="px-3 py-2">
                      <Select
                        value={editando.categoria}
                        onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}
                        className="py-1 text-xs"
                      >
                        <option value="">Sin categoría</option>
                        {categoriasActivas.map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{nombreProv(g)}</td>
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
                    <td className="px-3 py-2.5">
                      <InsigniaCategoriaGasto valor={g.categoria ?? ""} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{nombreProv(g)}</td>
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
