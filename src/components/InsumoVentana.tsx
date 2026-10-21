import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { useSubfamilias } from "@/lib/codigo-insumo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FilaInsumo = any;

export type TablaInsumo = "materiales" | "mano_obra" | "equipos_herramientas" | "subcontratos";
export type ModoInsumo = "nuevo" | "editar" | "copiar";
export type SelInsumo = { tabla: TablaInsumo; fila: FilaInsumo };

type CampoDef = {
  k: string;
  t: string;
  tipo?: "num" | "sel";
  opciones?: string[];
  soloSi?: (f: FilaInsumo) => boolean;
};

const CONFIG: Record<TablaInsumo, { titulo: string; campos: CampoDef[] }> = {
  materiales: {
    titulo: "Materiales",
    campos: [
      { k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "marca", t: "Marca" },
      { k: "unidad", t: "Unidad", tipo: "sel" }, { k: "precio_base", t: "Precio base", tipo: "num" }, { k: "margen", t: "Margen %", tipo: "num" },
    ],
  },
  mano_obra: {
    titulo: "Mano de Obra",
    campos: [{ k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "unidad", t: "Unidad", tipo: "sel" }, { k: "costo_hora", t: "Costo hora", tipo: "num" }],
  },
  equipos_herramientas: {
    titulo: "Equipos/Herramientas",
    campos: [
      { k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" },
      { k: "tipo", t: "Tipo", tipo: "sel", opciones: ["propio", "alquilado"] },
      { k: "unidad", t: "Unidad", tipo: "sel" },
      { k: "costo_hora", t: "Costo hora / %", tipo: "num" },
      { k: "margen", t: "Margen %", tipo: "num", soloSi: (f) => f.tipo === "alquilado" },
    ],
  },
  subcontratos: {
    titulo: "Subcontratos",
    campos: [{ k: "codigo", t: "Código" }, { k: "descripcion", t: "Descripción" }, { k: "unidad", t: "Unidad", tipo: "sel" }, { k: "costo", t: "Costo", tipo: "num" }, { k: "margen", t: "Margen %", tipo: "num" }],
  },
};

/** Solo la primera letra en mayúscula; el resto en minúscula. */
export const primeraMayuscula = (t: string) => {
  const x = String(t ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  return x.charAt(0).toLocaleUpperCase("es") + x.slice(1);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };

/** Ventana de insumo compartida: agregar, editar y copiar en el catálogo maestro.
 *  Se monta condicionalmente, así que el estado se reinicia en cada apertura. */
export function VentanaInsumo({
  modo,
  sel,
  onCerrar,
  onGuardado,
}: {
  modo: ModoInsumo;
  sel?: SelInsumo | null;
  onCerrar: () => void;
  onGuardado?: () => void;
}) {
  const qc = useQueryClient();
  const { data: espLista = [] } = useEspecialidadesPartida();
  const { data: subfamilias = [] } = useSubfamilias();
  const { data: unidades = [] } = useUnidadesMedida();
  const espCod = espLista.filter((e) => e.codigo_modular).sort((a, b) => String(a.codigo_modular).localeCompare(String(b.codigo_modular)));

  function base(t: TablaInsumo, f?: FilaInsumo) {
    const b: FilaInsumo = {};
    for (const c of CONFIG[t].campos) b[c.k] = f ? String(f[c.k] ?? "") : c.opciones?.[0] ?? (c.tipo === "num" ? "0" : "");
    if (!f && t === "mano_obra") b.unidad = "H-H";
    if (!f && !b.unidad) b.unidad = unidades.find((u) => u.activo)?.simbolo ?? "";
    b.especialidad_id = f?.especialidad_id ?? "";
    b.subfamilia_id = f?.subfamilia_id ?? "";
    return b;
  }

  const [tipo, setTipo] = useState<TablaInsumo>(modo === "nuevo" ? "materiales" : sel!.tabla);
  const [form, setForm] = useState<FilaInsumo>(() => {
    if (modo === "nuevo") return base("materiales");
    const b = base(sel!.tabla, sel!.fila);
    if (modo === "copiar") { b.codigo = ""; b.descripcion = `${b.descripcion} (copia)`; }
    if (modo === "editar") b._orig = `${sel!.fila.especialidad_id ?? ""}|${sel!.fila.subfamilia_id ?? ""}|${sel!.fila.codigo ?? ""}`;
    return b;
  });
  const [aviso, setAviso] = useState("");

  async function guardar() {
    if (!form.descripcion?.trim()) return setAviso("Escribe la descripción.");
    const d: Record<string, unknown> = {};
    for (const c of CONFIG[tipo].campos) d[c.k] = c.tipo === "num" ? Number(form[c.k] || 0) : String(form[c.k] ?? "").trim();
    if (tipo === "equipos_herramientas" && form.tipo !== "alquilado") d["margen"] = 0;
    d["descripcion"] = primeraMayuscula(String(d["descripcion"]));
    if (typeof d["marca"] === "string" && d["marca"]) d["marca"] = primeraMayuscula(d["marca"]);
    const conSub = tipo === "materiales";
    if (!form.especialidad_id || (conSub && !form.subfamilia_id)) return setAviso(conSub ? "Elige la especialidad y la subfamilia: con ellas se genera el código." : "Elige la especialidad: con ella se genera el código.");
    d["especialidad_id"] = form.especialidad_id; d["subfamilia_id"] = conSub ? form.subfamilia_id : null;
    const [oe, os, oc] = String(form._orig ?? "").split("|");
    if (modo === "editar" && oe === form.especialidad_id && (conSub ? os === form.subfamilia_id : true) && /^\d{8}$/.test(oc ?? "")) d["codigo"] = oc;
    else {
      const { data: cod, error: ec } = await db.rpc("siguiente_codigo_insumo_modular", { _especialidad: form.especialidad_id, _tipo: tipo, _subfamilia: conSub ? form.subfamilia_id : null });
      if (ec) return setAviso(ec.message);
      d["codigo"] = cod;
    }
    const { error } = modo === "editar" && sel ? await db.from(tipo).update(d).eq("id", sel.fila.id) : await db.from(tipo).insert(d);
    if (error) return setAviso(error.message);
    qc.invalidateQueries({ queryKey: ["banco_apu"] });
    onGuardado?.();
    onCerrar();
  }

  const undOpc = unidades.filter((u) => u.activo);
  const cur = String(form.unidad ?? "");
  const unds = cur && !undOpc.some((u) => u.simbolo === cur) ? [{ id: "x", simbolo: cur, descripcion: "fuera del catálogo" }, ...undOpc] : undOpc;

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho="max-w-2xl"
      titulo={modo === "editar" ? "Editar insumo" : modo === "copiar" ? "Copiar insumo" : "Nuevo insumo"}>
      <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <Campo etiqueta="Tipo de insumo">
          <Select value={tipo} disabled={modo === "editar"} onChange={(e) => { const t = e.target.value as TablaInsumo; setTipo(t); setForm({ ...base(t), descripcion: form.descripcion, especialidad_id: form.especialidad_id, subfamilia_id: form.subfamilia_id }); }}>
            {(Object.keys(CONFIG) as TablaInsumo[]).map((t) => <option key={t} value={t}>{CONFIG[t].titulo}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Especialidad (código)">
          <Select value={form.especialidad_id ?? ""} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value, subfamilia_id: "" })}>
            <option value="">— Elegir —</option>
            {espCod.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular} · {e.nombre}</option>)}
          </Select>
        </Campo>
        {tipo === "materiales" && <Campo etiqueta="Subfamilia">
          <Select value={form.subfamilia_id ?? ""} onChange={(e) => setForm({ ...form, subfamilia_id: e.target.value })} disabled={!form.especialidad_id}>
            <option value="">— Elegir —</option>
            {subfamilias.filter((s) => s.especialidad_id === form.especialidad_id && s.activo).map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}{s.bloque ? ` (${s.bloque})` : ""}</option>)}
          </Select>
        </Campo>}
        <p className="text-[11px] text-muted-foreground sm:col-span-2">Código: <span className="font-mono">{form.codigo && modo === "editar" ? form.codigo : "se genera al guardar"}</span> (tipo + especialidad + {tipo === "materiales" ? "subfamilia" : "00"} + correlativo).</p>
        {CONFIG[tipo].campos.filter((c) => c.k !== "codigo" && (!c.soloSi || c.soloSi(form))).map((c) => (
          <Campo key={c.k} etiqueta={c.t}>
            {c.tipo === "sel" ? (
              <Select value={form[c.k] ?? ""} onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}>
                {c.k === "unidad"
                  ? unds.map((u) => <option key={u.id} value={u.simbolo}>{u.simbolo} · {u.descripcion}</option>)
                  : (c.opciones ?? []).map((o) => <option key={o}>{o}</option>)}
              </Select>
            ) : (
              <Input type={c.tipo === "num" ? "number" : "text"} step="any" value={form[c.k] ?? ""} autoFocus={c.k === "descripcion"}
                onChange={(e) => setForm({ ...form, [c.k]: e.target.value })} />
            )}
          </Campo>
        ))}
        {aviso && <p className="text-xs text-destructive sm:col-span-2">{aviso}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Boton type="button" variante="linea" onClick={onCerrar}>Cerrar</Boton>
          <Boton type="submit">Guardar</Boton>
        </div>
      </form>
    </VentanaFlotante>
  );
}
