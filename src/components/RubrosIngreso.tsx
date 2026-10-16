import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Vacio } from "@/components/ui-kit";

export type RubroIngreso = { id: string; nombre: string; descripcion: string; orden: number; activo: boolean };

export function useRubrosIngreso() {
  return useQuery({
    queryKey: ["rubros_ingreso"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rubros_ingreso" as never).select("*").order("orden");
      if (error) throw error;
      return (data ?? []) as unknown as RubroIngreso[];
    },
  });
}

export function RubrosIngreso() {
  const qc = useQueryClient();
  const { data: rubros = [] } = useRubrosIngreso();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const tabla = () => supabase.from("rubros_ingreso" as never);
  const refrescar = () => qc.invalidateQueries({ queryKey: ["rubros_ingreso"] });

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre del rubro.");
    const orden = Math.max(0, ...rubros.map((r) => r.orden)) + 1;
    const { error: err } = await tabla().insert({ nombre: nombre.trim(), descripcion: descripcion.trim(), orden } as never);
    if (err) return setError(err.code === "23505" ? "Ese rubro ya existe." : err.message);
    setNombre("");
    setDescripcion("");
    refrescar();
  }
  async function alternar(r: RubroIngreso) {
    const { error: err } = await tabla().update({ activo: !r.activo } as never).eq("id", r.id);
    if (err) return setError(err.message);
    refrescar();
  }
  async function eliminar(r: RubroIngreso) {
    if (!window.confirm(`¿Eliminar el rubro «${r.nombre}»? Las facturas ya registradas conservan su rubro.`)) return;
    const { error: err } = await tabla().delete().eq("id", r.id);
    if (err) return setError(err.message);
    refrescar();
  }

  return (
    <>
      <Panel titulo="Nuevo rubro de ingreso" className="mb-4">
        <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-4">
          <Campo etiqueta="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Mantenimiento" />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Descripción">
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} />
            </Campo>
          </div>
          <div className="flex items-end"><Boton type="submit">Agregar</Boton></div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>
      <Panel titulo="Rubros de ingreso">
        {rubros.length === 0 ? (
          <Vacio texto="Aún no hay rubros." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Rubro</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rubros.map((r) => (
                <tr key={r.id} className="border-b border-line/40 last:border-0">
                  <td className="px-5 py-2.5 text-ink">{r.nombre}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.descripcion || "—"}</td>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => alternar(r)} className={r.activo ? "text-good" : "text-muted-foreground"}>
                      {r.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button type="button" onClick={() => eliminar(r)} title="Eliminar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad">
                      <Trash2 size={14} />
                    </button>
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
