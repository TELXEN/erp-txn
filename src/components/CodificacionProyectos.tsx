import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select } from "@/components/ui-kit";
import { previsualizarCodigo, useCodificacion } from "@/lib/codificacion";

const vacio = {
  prefijo: "TXN",
  incluir_anio: true,
  anio_dos_digitos: true,
  separador: "-",
  tipo_letra: "P",
  digitos: 3,
  correlativo_actual: 0,
};

export function CodificacionProyectos() {
  const qc = useQueryClient();
  const { data: cfg } = useCodificacion();
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (cfg)
      setForm({
        prefijo: cfg.prefijo,
        incluir_anio: cfg.incluir_anio,
        separador: cfg.separador,
        digitos: cfg.digitos,
        correlativo_actual: cfg.correlativo_actual,
      });
  }, [cfg]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (!form.prefijo.trim()) return setError("Escribe un prefijo para la codificación.");
    setGuardando(true);
    const campos = {
      prefijo: form.prefijo.trim().toUpperCase(),
      incluir_anio: form.incluir_anio,
      separador: form.separador,
      digitos: Math.min(Math.max(Number(form.digitos) || 1, 1), 8),
      correlativo_actual: Math.max(Number(form.correlativo_actual) || 0, 0),
    };
    const resultado = cfg
      ? await supabase.from("codificacion_config").update(campos).eq("id", cfg.id)
      : await supabase.from("codificacion_config").insert(campos);
    setGuardando(false);
    if (resultado.error) return setError(resultado.error.message);
    setAviso("Regla de codificación guardada correctamente.");
    qc.invalidateQueries({ queryKey: ["codificacion_config"] });
  }

  return (
    <form onSubmit={guardar} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel titulo="Codificación personalizada de proyectos">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Campo etiqueta="Prefijo">
            <Input
              className="py-1.5 uppercase"
              value={form.prefijo}
              onChange={(e) => setForm({ ...form, prefijo: e.target.value })}
              maxLength={12}
              required
            />
          </Campo>
          <Campo etiqueta="Separador">
            <Select
              className="py-1.5"
              value={form.separador}
              onChange={(e) => setForm({ ...form, separador: e.target.value })}
            >
              <option value="-">Guion ( - )</option>
              <option value=".">Punto ( . )</option>
              <option value="/">Barra ( / )</option>
              <option value="">Sin separador</option>
            </Select>
          </Campo>
          <Campo etiqueta="Incluir el año">
            <Select
              className="py-1.5"
              value={form.incluir_anio ? "si" : "no"}
              onChange={(e) => setForm({ ...form, incluir_anio: e.target.value === "si" })}
            >
              <option value="si">Sí, incluir el año</option>
              <option value="no">No incluir el año</option>
            </Select>
          </Campo>
          <Campo etiqueta="Dígitos del correlativo">
            <Input
              className="py-1.5"
              type="number"
              min={1}
              max={8}
              value={form.digitos}
              onChange={(e) => setForm({ ...form, digitos: Number(e.target.value) })}
            />
          </Campo>
          <Campo etiqueta="Último correlativo usado">
            <Input
              className="py-1.5"
              type="number"
              min={0}
              value={form.correlativo_actual}
              onChange={(e) => setForm({ ...form, correlativo_actual: Number(e.target.value) })}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar regla"}
          </Boton>
          {error && <span className="font-mono text-xs text-bad">{error}</span>}
          {aviso && <span className="font-mono text-xs text-good">{aviso}</span>}
        </div>
      </Panel>

      <Panel titulo="Vista previa">
        <div className="space-y-3 p-4">
          <div className="grid place-items-center rounded-md border border-dashed border-line bg-muted/40 p-5">
            <p className="font-mono text-lg font-semibold text-primary">{previsualizarCodigo(form)}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Próximo código a asignar</p>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Al registrar una obra nueva el sistema asigna este código automáticamente y avanza el correlativo.
            También puedes escribir un código manual en la obra si lo necesitas; los códigos no se repiten.
          </p>
        </div>
      </Panel>
    </form>
  );
}
