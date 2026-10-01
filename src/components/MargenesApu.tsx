import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boton, Input, Panel } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { MARGENES_DEFECTO, TIPOS_INSUMO, apuDb, useMargenesInsumo, type MargenesInsumo } from "@/lib/apu";

export function MargenesApuPanel() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const puedeEditar = rol === "gerente";
  const { data = MARGENES_DEFECTO } = useMargenesInsumo();
  const [form, setForm] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
  }, [data]);

  async function guardar() {
    setGuardando(true);
    const filas = (Object.keys(MARGENES_DEFECTO) as (keyof MargenesInsumo)[]).map((tipo) => ({
      tipo,
      margen_pct: Number(form[tipo] || 0),
    }));
    const { error } = await apuDb.from("margenes_insumo").upsert(filas);
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Márgenes actualizados");
    qc.invalidateQueries({ queryKey: ["margenes_insumo"] });
    qc.invalidateQueries({ queryKey: ["insumos"] });
  }

  return (
    <Panel titulo="Márgenes del análisis de precios unitarios">
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Un solo margen (%) por tipo de insumo. Se suma al costo de cada insumo y es el precio que usan los análisis de precios unitarios y las cotizaciones.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIPOS_INSUMO.map(([tipo, nombre]) => (
            <label key={tipo} className="text-sm">
              <span className="mb-1 block font-medium text-ink">{tipo === "HT" ? `${nombre} (% de la mano de obra)` : nombre}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  disabled={!puedeEditar}
                  value={form[tipo] ?? ""}
                  onChange={(e) => setForm({ ...form, [tipo]: e.target.value })}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </label>
          ))}
        </div>
        {puedeEditar ? (
          <div className="flex justify-end">
            <Boton type="button" onClick={() => void guardar()} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar márgenes"}
            </Boton>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Solo el Gerente puede modificar los márgenes.</p>
        )}
      </div>
    </Panel>
  );
}
