import { useEffect, useRef, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel } from "@/components/ui-kit";
import { TIPOS_INSUMO, type TipoInsumo } from "@/lib/apu";
import { recodificarWbs } from "@/lib/wbs";

type Cfg = {
  id: string;
  digito_mo: number;
  digito_mat: number;
  digito_eq: number;
  digito_ht: number;
  digito_sc: number;
  correlativo_mo: number;
  correlativo_mat: number;
  correlativo_eq: number;
  correlativo_ht: number;
  correlativo_sc: number;
};

const vacio: Omit<Cfg, "id"> = {
  digito_mo: 1,
  digito_mat: 2,
  digito_eq: 3,
  digito_ht: 4,
  digito_sc: 5,
  correlativo_mo: 0,
  correlativo_mat: 0,
  correlativo_eq: 0,
  correlativo_ht: 0,
  correlativo_sc: 0,
};

type CfgForm = Omit<Cfg, "id">;
const CAMPOS: { tipo: TipoInsumo; nombre: string; digito: keyof CfgForm; correlativo: keyof CfgForm }[] = TIPOS_INSUMO.map(
  ([t, nombre]) => ({
    tipo: t,
    nombre,
    digito: `digito_${t.toLowerCase()}` as keyof CfgForm,
    correlativo: `correlativo_${t.toLowerCase()}` as keyof CfgForm,
  }),
);

export function CodificacionInsumos({ onAgregarTipo }: { onAgregarTipo: (tipo: TipoInsumo) => void }) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ["codificacion_insumo"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("codificacion_insumo")
        .select("*")
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Cfg | null;
    },
  });
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (cfg) {
      const { id: _id, ...resto } = cfg;
      setForm(resto);
    }
  }, [cfg]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    const digitos = [form.digito_mo, form.digito_mat, form.digito_eq, form.digito_ht, form.digito_sc];
    if (digitos.some((d) => d < 0 || d > 9)) return setError("Los dígitos de tipo deben estar entre 0 y 9.");
    if (new Set(digitos).size !== digitos.length) return setError("Cada tipo de insumo debe tener un dígito distinto.");
    setGuardando(true);
    const resultado = cfg
      ? await (supabase as unknown as { from: (t: string) => any }).from("codificacion_insumo").update(form).eq("id", cfg.id)
      : await (supabase as unknown as { from: (t: string) => any }).from("codificacion_insumo").insert(form);
    setGuardando(false);
    if (resultado.error) return setError(resultado.error.message);
    await recodificarWbs().catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["partidas_maestras"] });
    setAviso("Regla de codificación guardada correctamente.");
    qc.invalidateQueries({ queryKey: ["codificacion_insumo"] });
  }

  return (
    <form onSubmit={guardar} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel titulo="Codificación automática de insumos">
        <div className="p-4">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Tipo de insumo</th>
                <th className="py-2 pr-1 font-medium"></th>
                <th className="py-2 pr-3 font-medium"></th>
                <th className="w-24 px-3 py-2 font-medium">Dígito</th>
                <th className="w-32 px-3 py-2 font-medium">Último correlativo</th>
                <th className="py-2 pl-3 font-medium">Próximo código</th>
              </tr>
            </thead>
            <tbody>
              {CAMPOS.map((c) => (
                <tr key={c.tipo} className="border-b border-line/40 last:border-0">
                  <td className="py-2 pr-3 text-ink">{c.nombre}</td>
                  <td className="py-2 pr-1">
                    <button
                      type="button"
                      title={`Añadir nuevo insumo de ${c.nombre}`}
                      onClick={() => onAgregarTipo(c.tipo)}
                      className="grid h-6 w-6 place-items-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Plus size={12} />
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      title={`Editar insumos de ${c.nombre}`}
                      onClick={() => onEditarTipo(c.tipo)}
                      className="grid h-6 w-6 place-items-center rounded-md border border-line text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil size={12} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="py-1 text-center"
                      type="number"
                      min={0}
                      max={9}
                      value={form[c.digito]}
                      onChange={(e) => setForm({ ...form, [c.digito]: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="py-1 text-center"
                      type="number"
                      min={0}
                      value={form[c.correlativo] as number}
                      onChange={(e) => setForm({ ...form, [c.correlativo]: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 pl-3 font-semibold text-primary">
                    {String(form[c.digito] as number)}
                    {String((form[c.correlativo] as number) + 1).padStart(7, "0")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar regla"}
          </Boton>
          {error && <span className="font-mono text-xs text-bad">{error}</span>}
          {aviso && <span className="font-mono text-xs text-good">{aviso}</span>}
        </div>
      </Panel>

      <Panel titulo="Cómo funciona">
        <div className="space-y-3 p-4">
          <div className="grid place-items-center rounded-md border border-dashed border-line bg-muted/40 p-5">
            <p className="font-mono text-lg font-semibold text-primary">
              {form.digito_mo}
              {String(form.correlativo_mo + 1).padStart(7, "0")}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Ejemplo: próximo código de mano de obra</p>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            El botón + junto a cada tipo abre su maestro con la fila de captura lista para registrar un insumo nuevo, y
            el lápiz abre el mismo maestro para revisar o editar los insumos existentes; el código se reserva en el
            servidor al guardar.
          </p>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Cada insumo nuevo recibe un código de 8 dígitos: el primero identifica el tipo (mano de obra, materiales,
            equipos, herramientas o subcontratos) y los siete restantes son el correlativo. El código se reserva en el
            servidor al guardar, por lo que nunca se repite. Las partidas usan el dígito de su tipo (T) seguido del orden
            de especialidad, categoría y correlativo: T.EE.CC.NNN (ej. 20302005 para una partida de materiales).
          </p>
        </div>
      </Panel>
    </form>
  );
}
