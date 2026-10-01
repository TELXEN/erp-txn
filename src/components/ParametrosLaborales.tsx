import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel } from "@/components/ui-kit";
import { useParametrosLaborales, type ParametrosLaborales } from "@/lib/apu";

export function ParametrosLaboralesPanel() {
  const qc = useQueryClient();
  const { data: params } = useParametrosLaborales();
  const [form, setForm] = useState<Omit<ParametrosLaborales, "id"> | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (params) {
      const { id: _id, ...resto } = params;
      setForm(resto);
    }
  }, [params]);

  if (!form) return null;

  const num = (k: keyof typeof form) => ({
    type: "number" as const,
    step: "0.01",
    min: 0,
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) }),
  });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!params?.id) return setError("No se encontró la fila de parámetros.");
    setError("");
    setAviso("");
    setGuardando(true);
    const { error: err } = await (supabase as unknown as { from: (t: string) => any })
      .from("parametros_laborales")
      .update(form)
      .eq("id", params.id);
    setGuardando(false);
    if (err) return setError(err.message);
    setAviso("Parámetros laborales guardados correctamente.");
    qc.invalidateQueries({ queryKey: ["parametros_laborales"] });
  }

  return (
    <form onSubmit={guardar}>
      <Panel titulo="Parámetros laborales (Costo hora-hombre, solo construcción civil)">
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Régimen General y MYPE
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="RMV (S/)"><Input className="py-1.5" {...num("rmv")} /></Campo>
              <Campo etiqueta="EsSalud (%)"><Input className="py-1.5" {...num("essalud_pct")} /></Campo>
              <Campo etiqueta="SCTR (%)"><Input className="py-1.5" {...num("sctr_pct")} /></Campo>
              <Campo etiqueta="Seguro Vida Ley (%)"><Input className="py-1.5" {...num("vida_ley_pct")} /></Campo>
              <Campo etiqueta="Horas semanales"><Input className="py-1.5" {...num("horas_semanales")} /></Campo>
              <Campo etiqueta="Feriados al año"><Input className="py-1.5" {...num("feriados_anuales")} /></Campo>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Construcción Civil
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Jornal Operario (S/)"><Input className="py-1.5" {...num("jornal_operario")} /></Campo>
              <Campo etiqueta="Jornal Oficial (S/)"><Input className="py-1.5" {...num("jornal_oficial")} /></Campo>
              <Campo etiqueta="Jornal Peón (S/)"><Input className="py-1.5" {...num("jornal_peon")} /></Campo>
              <Campo etiqueta="Pasaje diario (S/)"><Input className="py-1.5" {...num("pasaje_diario")} /></Campo>
              <Campo etiqueta="BUC Operario (%)"><Input className="py-1.5" {...num("buc_operario_pct")} /></Campo>
              <Campo etiqueta="BUC Oficial (%)"><Input className="py-1.5" {...num("buc_oficial_pct")} /></Campo>
              <Campo etiqueta="BUC Peón (%)"><Input className="py-1.5" {...num("buc_peon_pct")} /></Campo>
              <Campo etiqueta="Herramienta Operario (%)"><Input className="py-1.5" {...num("herramienta_pct")} /></Campo>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar parámetros"}
          </Boton>
          {error && <span className="font-mono text-xs text-bad">{error}</span>}
          {aviso && <span className="font-mono text-xs text-good">{aviso}</span>}
        </div>
        <p className="border-t border-line px-4 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Estos valores alimentan el cálculo del Costo HH de los insumos de mano de obra. Al cambiarlos, los insumos
          conservan su costo guardado; edítalos para recalcular con los nuevos parámetros.
        </p>
      </Panel>
    </form>
  );
}
