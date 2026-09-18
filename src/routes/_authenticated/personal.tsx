import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/personal")({
  head: () => ({
    meta: [
      { title: "Personal — Control de Proyectos" },
      { name: "description", content: "Registro global de personal con jornal diario fijo en Soles." },
      { property: "og:title", content: "Personal — Control de Proyectos" },
      { property: "og:description", content: "Registro de personal y jornal diario en Soles." },
    ],
  }),
  component: Personal,
});

function Personal() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const [form, setForm] = useState({ nombre: "", categoria: "Operario", jornal_diario: "" });
  const [error, setError] = useState("");

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase.from("trabajadores").insert({
      nombre: form.nombre.trim(),
      categoria: form.categoria as "Operario" | "Oficial" | "Peon",
      jornal_diario: Number(form.jornal_diario || 0),
    });
    if (err) return setError(err.message);
    setForm({ nombre: "", categoria: "Operario", jornal_diario: "" });
    qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  async function alternar(id: string, activo: boolean) {
    await supabase.from("trabajadores").update({ activo: !activo }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  return (
    <>
      <Encabezado
        titulo="Gestión de Personal"
        subtitulo="Planilla global de la empresa"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("personal", [
                {
                  nombre: "Personal",
                  filas: trabajadores.map((t) => ({
                    Trabajador: t.nombre,
                    Categoria: t.categoria,
                    "Jornal Diario (S/)": Number(t.jornal_diario),
                    Estado: t.activo ? "Activo" : "Inactivo",
                  })),
                },
              ])
            }
          >
            Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nuevo trabajador" className="mb-4">
        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-4">
          <Campo etiqueta="Nombre completo">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100} />
          </Campo>
          <Campo etiqueta="Rol / Categoría">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option value="Operario">Operario</option>
              <option value="Oficial">Oficial</option>
              <option value="Peon">Peón</option>
            </Select>
          </Campo>
          <Campo etiqueta="Jornal diario fijo (S/)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.jornal_diario}
              onChange={(e) => setForm({ ...form, jornal_diario: e.target.value })}
              required
            />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit" className="w-full py-2.5">
              Registrar
            </Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad sm:col-span-4">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Planilla" extra={<span className="font-mono text-[11px] text-muted-foreground">{trabajadores.length} trabajadores</span>}>
        {trabajadores.length === 0 ? (
          <Vacio texto="Aún no hay personal registrado." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Trabajador</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 text-right font-medium">Jornal diario</th>
                <th className="px-5 py-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink">{t.nombre}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.categoria === "Peon" ? "Peón" : t.categoria}</td>
                  <td className="px-3 py-2.5 text-right">{soles(Number(t.jornal_diario))}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button onClick={() => alternar(t.id, t.activo)} className="cursor-pointer">
                      <Etiqueta tono={t.activo ? "good" : "neutro"}>{t.activo ? "Activo" : "Inactivo"}</Etiqueta>
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
