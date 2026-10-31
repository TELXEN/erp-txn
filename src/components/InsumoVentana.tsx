import { digitoTipoInsumo } from "@/lib/digito-insumo";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FichaInsumoHistorial } from "@/components/FichaInsumoHistorial";
import { supabase } from "@/integrations/supabase/client";
import { Area, Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { SelectorBuscable } from "@/components/SelectorBuscable";
import { useMarcas } from "@/lib/datos";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { useUnidadesMedida } from "@/lib/unidades";
import { useCategoriasInsumo, useSubfamilias } from "@/lib/codigo-insumo";
import { usaSubfamilia } from "@/lib/clasificacion-insumo";
import { buscarInsumoDuplicado } from "@/lib/insumo-duplicado";
import { useBancoTabla } from "@/lib/banco-apu";

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

const ordenEs = new Intl.Collator("es", { sensitivity: "base", numeric: true });
/** La ventana devuelve esto cuando el usuario canceló la suma a una cantidad existente. */
export const CANCELADO = "cancelado";

/** Ventana de insumo compartida: agregar, editar y copiar en el catálogo maestro.
 *  Con `alAgregar` (contexto de receta APU) ofrece dos pestañas: «Seleccionar existente»
 *  para elegir un insumo del catálogo y agregarlo con su cantidad, o «Crear nuevo»
 *  para registrarlo y continuar con la cantidad. Se monta condicionalmente, así que
 *  el estado se reinicia en cada apertura. */
export function VentanaInsumo({
  modo,
  sel,
  onCerrar,
  onGuardado,
  agregarA,
  soloTabla,
  alAgregar,
  categoriaInventario,
  conStock,
  stockActual,
}: {
  modo: ModoInsumo;
  sel?: SelInsumo | null;
  onCerrar: () => void;
  onGuardado?: () => void;
  /** Presente cuando la ventana agrega a la receta de una partida: muestra el destino. */
  agregarA?: { titulo: string };
  /** Restringe la lista del selector a un solo grupo (elegido en el menú +). */
  soloTabla?: TablaInsumo;
  categoriaInventario?: "Equipo" | "Herramienta";
  /** Inventario: pide el stock inicial al crear y muestra el stock actual al editar. */
  conStock?: boolean;
  stockActual?: number | null;
  /** Inserta el insumo en la receta; devuelve null si agregó, un mensaje si falló. */
  alAgregar?: (s: SelInsumo, cant: number) => Promise<string | null>;
}) {
  const qc = useQueryClient();
  const { data: espLista = [] } = useEspecialidadesPartida();
  const { data: subfamilias = [] } = useSubfamilias();
  const { data: categorias = [] } = useCategoriasInsumo();
  const { data: unidades = [] } = useUnidadesMedida();
  const { data: marcas = [] } = useMarcas();
  const { data: mats = [] } = useBancoTabla("materiales");
  const { data: mob = [] } = useBancoTabla("mano_obra");
  const { data: eqs = [] } = useBancoTabla("equipos_herramientas");
  const { data: subs = [] } = useBancoTabla("subcontratos");
  const espCod = espLista.filter((e) => e.codigo_modular).sort((a, b) => String(a.codigo_modular).localeCompare(String(b.codigo_modular)));

  function base(t: TablaInsumo, f?: FilaInsumo) {
    const b: FilaInsumo = {};
    for (const c of CONFIG[t].campos) b[c.k] = f ? String(f[c.k] ?? "") : c.opciones?.[0] ?? (c.tipo === "num" ? "0" : "");
    if (!f && t === "mano_obra") b.unidad = "H-H";
    if (!f && !b.unidad) b.unidad = unidades.find((u) => u.activo)?.simbolo ?? "";
    b.especialidad_id = f?.especialidad_id ?? "";
    b.subfamilia_id = usaSubfamilia(t) ? f?.subfamilia_id ?? "" : "";
    b.categoria_id = usaSubfamilia(t) ? f?.categoria_id ?? "" : "";
    b.numero_parte = ""; b.descripcion_breve = ""; b.especificaciones = ""; b.compra_activa = true;
    return b;
  }

  const dual = Boolean(alAgregar);
  const [pestana, setPestana] = useState<"sel" | "crear">(dual ? "sel" : "crear");
  const [tipo, setTipo] = useState<TablaInsumo>(modo === "nuevo" ? soloTabla ?? "materiales" : sel!.tabla);
  const conSubfamilia = usaSubfamilia(tipo);
  const [form, setForm] = useState<FilaInsumo>(() => {
    if (modo === "nuevo") return base(soloTabla ?? "materiales");
    const b = base(sel!.tabla, sel!.fila);
    if (modo === "copiar") { b.codigo = ""; b.descripcion = `${b.descripcion} (copia)`; }
    if (modo === "editar") b._orig = `${sel!.fila.especialidad_id ?? ""}|${sel!.fila.subfamilia_id ?? ""}|${sel!.fila.codigo ?? ""}`;
    return b;
  });
  const [aviso, setAviso] = useState("");
  /** Campos de la ficha que viven solo en el maestro (no en las vistas por tipo). */
  const idFicha: string | undefined = modo !== "nuevo" ? sel?.fila.id : undefined;
  const { data: extra } = useQuery({
    queryKey: ["insumo_ficha_extra", idFicha],
    enabled: Boolean(idFicha),
    queryFn: async () => {
      const { data, error } = await db.from("insumos").select("categoria_id, numero_parte, descripcion_breve, especificaciones, compra_activa, estado_aprobacion, marca_id").eq("id", idFicha).maybeSingle();
      if (error) throw error;
      return data as { categoria_id: string | null; numero_parte: string | null; descripcion_breve: string | null; especificaciones: string | null; compra_activa: boolean; estado_aprobacion: string; marca_id: string | null } | null;
    },
  });
  const [extraCargado, setExtraCargado] = useState(false);
  useEffect(() => {
    if (!extra || extraCargado) return;
    setExtraCargado(true);
    setForm((f: FilaInsumo) => ({
      ...f,
      categoria_id: usaSubfamilia(tipo) ? (extra.categoria_id ?? subfamilias.find((s) => s.id === f.subfamilia_id)?.categoria_id ?? "") : "",
      numero_parte: extra.numero_parte ?? "", descripcion_breve: extra.descripcion_breve ?? "",
      especificaciones: extra.especificaciones ?? "", compra_activa: extra.compra_activa,
    }));
  }, [extra, extraCargado, subfamilias, tipo]);
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<SelInsumo | null>(null);
  const [cant, setCant] = useState("1");
  const [stockIni, setStockIni] = useState("");

  /** Catálogo para el selector: activos, ordenados A→Z y filtrados por la búsqueda. */
  const tablas = useMemo<Record<TablaInsumo, FilaInsumo[]>>(
    () => ({ materiales: mats, mano_obra: mob, equipos_herramientas: eqs, subcontratos: subs }),
    [mats, mob, eqs, subs],
  );
  const gruposSel = (soloTabla ? [soloTabla] : (Object.keys(CONFIG) as TablaInsumo[])).filter((t) => (tablas[t] ?? []).some((f) => f.estado !== "inactivo"));
  const listaDe = (t: TablaInsumo) =>
    (tablas[t] ?? [])
      .filter((f) => f.estado !== "inactivo")
      .filter((f) => `${f.codigo ?? ""} ${f.descripcion ?? ""} ${f.marca ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => ordenEs.compare(String(a.descripcion ?? ""), String(b.descripcion ?? "")));

  async function usar() {
    if (!elegido) return;
    const n = Number(cant);
    if (!(n > 0)) return setAviso("Ingresa la cantidad / cuadrilla (mayor que 0).");
    setAviso("");
    const err = await alAgregar!(elegido, n);
    if (err === CANCELADO) return;
    if (err) return setAviso(err);
    onCerrar();
  }

  async function guardar() {
    if (!form.descripcion?.trim()) return setAviso("Escribe la descripción.");
    const np = String(form.numero_parte ?? "").trim();
    const dup = np ? null : buscarInsumoDuplicado(tablas[tipo] ?? [], String(form.descripcion), modo === "editar" ? sel?.fila.id : undefined, true);
    if (dup) return setAviso(dup.estado === "inactivo" ? `El insumo «${primeraMayuscula(form.descripcion.trim())}» ya existe pero está inactivo.` : `El insumo «${primeraMayuscula(form.descripcion.trim())}» ya existe en ${CONFIG[tipo].titulo}.`);
    const d: Record<string, unknown> = {};
    for (const c of CONFIG[tipo].campos) d[c.k] = c.tipo === "num" ? Number(form[c.k] || 0) : String(form[c.k] ?? "").trim();
    if (tipo === "equipos_herramientas" && form.tipo !== "alquilado") d["margen"] = 0;
    d["descripcion"] = primeraMayuscula(String(d["descripcion"]));
    if (typeof d["marca"] === "string" && d["marca"]) d["marca"] = primeraMayuscula(d["marca"]);
    const conSub = tipo === "materiales";
    if (!form.especialidad_id || (conSub && (!form.categoria_id || !form.subfamilia_id))) return setAviso(conSub ? "Elige especialidad, categoría y subcategoría: con ellas se genera el código." : "Elige la especialidad: con ella se genera el código.");
    if (np) {
      const { data: rep } = await db.from("insumos").select("id, nombre").ilike("numero_parte", np).neq("id", modo === "editar" ? sel?.fila.id ?? "" : "00000000-0000-0000-0000-000000000000");
      const marcaTxt = String(form.marca ?? "").trim().toLowerCase();
      const mismo = (rep ?? []).find((x: { id: string }) => { const f = (tablas[tipo] ?? []).find((y) => y.id === x.id); return !f || String(f.marca ?? "").trim().toLowerCase() === marcaTxt; });
      if (mismo) return setAviso(`El N.º de parte «${np}»${marcaTxt ? " con esa marca" : ""} ya está registrado en «${mismo.nombre}».`);
    }
    const extras = {
      categoria_id: usaSubfamilia(tipo) ? form.categoria_id || null : null,
      numero_parte: np || null,
      descripcion_breve: String(form.descripcion_breve ?? "").trim() || null,
      especificaciones: String(form.especificaciones ?? "").trim() || null,
      compra_activa: form.compra_activa !== false,
    };
    d["especialidad_id"] = form.especialidad_id; d["subfamilia_id"] = usaSubfamilia(tipo) ? form.subfamilia_id || null : null;
    if (categoriaInventario && tipo === "equipos_herramientas") d["categoria_inventario"] = categoriaInventario;
    const [oe, os, oc] = String(form._orig ?? "").split("|");
    const digito = digitoTipoInsumo(tipo, categoriaInventario);
    if (modo === "editar" && oe === form.especialidad_id && (os ?? "") === (form.subfamilia_id ?? "") && /^\d{8}$/.test(oc ?? "") && (!digito || oc!.startsWith(digito))) d["codigo"] = oc;
    else {
      const { data: cod, error: ec } = await db.rpc("siguiente_codigo_insumo_modular", { _especialidad: form.especialidad_id, _tipo: tipo, _subfamilia: form.subfamilia_id || null, _categoria: categoriaInventario ?? null });
      if (ec) return setAviso(ec.message);
      d["codigo"] = cod;
    }
    if (modo === "editar" && sel) {
      const { error } = await db.from(tipo).update(d).eq("id", sel.fila.id);
      if (error) return setAviso(error.message);
      const { error: ex } = await db.from("insumos").update(extras).eq("id", sel.fila.id);
      if (ex) return setAviso(ex.message);
      qc.invalidateQueries({ queryKey: ["insumo_ficha_extra"] });
      qc.invalidateQueries({ queryKey: ["insumos_estado"] });
      qc.invalidateQueries({ queryKey: ["banco_apu"] });
      onGuardado?.();
      onCerrar();
      return;
    }
    const { data: nueva, error } = await db.from(tipo).insert(d).select("*").single();
    if (error) return setAviso(error.message);
    const { error: ex } = await db.from("insumos").update(extras).eq("id", nueva.id);
    if (ex) return setAviso(`El insumo se guardó, pero no sus datos adicionales: ${ex.message}`);
    qc.invalidateQueries({ queryKey: ["insumos_estado"] });
    qc.invalidateQueries({ queryKey: ["banco_apu"] });
    const stockN = conStock ? Number(stockIni || 0) : 0;
    if (conStock && stockN > 0) {
      // Maestro único: la ficha recién creada es la misma que lleva el kardex.
      const nombre = String(d["descripcion"]);
      const unidad = String(d["unidad"] ?? "");
      const precio = Number(d["precio_base"] ?? d["costo_hora"] ?? d["costo"] ?? 0);
      const insumoAlmId: string = nueva.id;
      qc.invalidateQueries({ queryKey: ["insumos"] });
      const { error: em } = await db.from("movimientos_almacen").insert({
        tipo: "Ingreso",
        fecha: new Date().toISOString().slice(0, 10),
        proyecto_id: null,
        insumo_id: insumoAlmId,
        descripcion: nombre,
        unidad,
        cantidad: stockN,
        costo_unitario: precio,
        orden_item_id: null,
        documento: "Saldo inicial",
        observacion: "Registro de inventario",
      });
      if (em) return setAviso(`El insumo se guardó, pero no se pudo asentar el stock: ${em.message}`);
      qc.invalidateQueries({ queryKey: ["movimientos_almacen"] });
    }
    if (alAgregar) {
      onGuardado?.();
      setElegido({ tabla: tipo, fila: nueva });
      setPestana("sel");
      setAviso("");
      return;
    }
    onGuardado?.();
    onCerrar();
  }

  const undOpc = unidades.filter((u) => u.activo);
  const cur = String(form.unidad ?? "");
  const unds = cur && !undOpc.some((u) => u.simbolo === cur) ? [{ id: "x", simbolo: cur, descripcion: "fuera del catálogo" }, ...undOpc] : undOpc;

  const pestanaCls = (p: "sel" | "crear") =>
    `-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${pestana === p ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  const formulario = (
    <form className="grid gap-3 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
      <Campo etiqueta="Tipo de insumo">
        <Select value={tipo} disabled={modo === "editar" || !!categoriaInventario} onChange={(e) => { const t = e.target.value as TablaInsumo; setTipo(t); setForm({ ...base(t), descripcion: form.descripcion, especialidad_id: form.especialidad_id, subfamilia_id: usaSubfamilia(t) ? form.subfamilia_id : "" }); }}>
          {(Object.keys(CONFIG) as TablaInsumo[]).map((t) => <option key={t} value={t}>{CONFIG[t].titulo}</option>)}
        </Select>
      </Campo>
      <Campo etiqueta="Especialidad (código)">
        <Select value={form.especialidad_id ?? ""} onChange={(e) => setForm({ ...form, especialidad_id: e.target.value, categoria_id: "", subfamilia_id: "" })}>
          <option value="">— Elegir —</option>
          {espCod.map((e) => <option key={e.id} value={e.id}>{e.codigo_modular} · {e.nombre}</option>)}
        </Select>
      </Campo>
      {conSubfamilia && (
        <Campo etiqueta={tipo === "materiales" ? "Categoría" : "Categoría (opcional)"}>
          <Select value={form.categoria_id ?? ""} onChange={(e) => setForm({ ...form, categoria_id: e.target.value, subfamilia_id: "" })} disabled={!form.especialidad_id}>
            <option value="">{form.especialidad_id ? "— Elegir —" : "Elige primero la especialidad"}</option>
            {categorias.filter((c) => c.especialidad_id === form.especialidad_id && (c.activo || c.id === form.categoria_id)).map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
          </Select>
        </Campo>
      )}
      {conSubfamilia && (
        <Campo etiqueta={tipo === "materiales" ? "Subcategoría" : "Subcategoría (opcional)"}>
          <Select value={form.subfamilia_id ?? ""} onChange={(e) => setForm({ ...form, subfamilia_id: e.target.value })} disabled={!form.categoria_id}>
            <option value="">{!form.categoria_id ? "Elige primero la categoría" : tipo === "materiales" ? "— Elegir —" : "Sin subcategoría (00)"}</option>
            {subfamilias.filter((s) => s.categoria_id === form.categoria_id && (s.activo || s.id === form.subfamilia_id)).map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}
          </Select>
          {(() => { const n = subfamilias.find((s) => s.id === form.subfamilia_id)?.descripcion; return n ? <p className="mt-1 rounded-md bg-nota px-2 py-1 text-[11px] text-muted-foreground">{n}</p> : null; })()}
        </Campo>
      )}
      <p className="text-[11px] text-muted-foreground sm:col-span-2">Código: <span className="font-mono">{form.codigo && modo === "editar" ? form.codigo : "se genera al guardar"}</span> (tipo + especialidad + subcategoría o 00 + correlativo).</p>
      {CONFIG[tipo].campos.filter((c) => c.k !== "codigo" && (!c.soloSi || c.soloSi(form))).map((c) => (
        <Campo key={c.k} etiqueta={c.t}>
          {c.k === "unidad" ? (
            <SelectorBuscable aria-label={c.t} value={form[c.k] ?? ""} onChange={(v) => setForm({ ...form, [c.k]: v })}
              opciones={unds.map((u) => ({ value: u.simbolo, texto: u.simbolo, detalle: u.descripcion }))} />
          ) : c.k === "marca" ? (
            <SelectorBuscable aria-label={c.t} permitirLibre value={form[c.k] ?? ""} onChange={(v) => setForm({ ...form, [c.k]: v })}
              opciones={[{ value: "", texto: "Sin marca" }, ...marcas.filter((m) => m.activo).map((m) => ({ value: m.nombre, texto: m.nombre }))]} />
          ) : c.tipo === "sel" ? (
            <Select value={form[c.k] ?? ""} onChange={(e) => setForm({ ...form, [c.k]: e.target.value })}>
              {(c.opciones ?? []).map((o) => <option key={o}>{o}</option>)}
            </Select>
          ) : (
            <Input type={c.tipo === "num" ? "number" : "text"} step="any" value={form[c.k] ?? ""} autoFocus={c.k === "descripcion"}
              onChange={(e) => setForm({ ...form, [c.k]: e.target.value })} />
          )}
        </Campo>
      ))}
      <Campo etiqueta="N.º de parte del fabricante">
        <Input value={form.numero_parte ?? ""} placeholder="Ej. 3RT2016-1AP01" onChange={(e) => setForm({ ...form, numero_parte: e.target.value })} />
      </Campo>
      <Campo etiqueta="Estado de compra">
        <label className="flex h-8 items-center gap-2 text-xs">
          <input type="checkbox" checked={form.compra_activa !== false} onChange={(e) => setForm({ ...form, compra_activa: e.target.checked })} />
          {form.compra_activa !== false ? "Compra activa" : "Compra desactivada (no aparece en requerimientos ni OC)"}
        </label>
      </Campo>
      <div className="sm:col-span-2">
        <Campo etiqueta="Breve descripción">
          <Input maxLength={200} value={form.descripcion_breve ?? ""} placeholder="Resumen corto del insumo (opcional)" onChange={(e) => setForm({ ...form, descripcion_breve: e.target.value })} />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <Campo etiqueta="Especificaciones técnicas">
          <Area rows={4} value={form.especificaciones ?? ""} placeholder="Material, norma, dimensiones, capacidad, tensión, certificaciones…" onChange={(e) => setForm({ ...form, especificaciones: e.target.value })} />
        </Campo>
      </div>
      {conStock && (modo === "editar" ? (
        <Campo etiqueta="Stock actual (almacén)">
          <Input value={stockActual == null ? "—" : String(stockActual)} disabled />
        </Campo>
      ) : (
        <Campo etiqueta="Stock inicial (almacén central)">
          <Input type="number" step="any" min={0} value={stockIni} onChange={(e) => setStockIni(e.target.value)} placeholder="0" />
        </Campo>
      ))}
      {aviso && <p className="text-xs text-destructive sm:col-span-2">{aviso}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Boton type="button" variante="linea" onClick={onCerrar}>Cerrar</Boton>
        <Boton type="submit">{dual ? "Guardar y continuar" : "Guardar"}</Boton>
      </div>
    </form>
  );

  const selector = elegido ? (
    <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); void usar(); }}>
      <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{elegido.fila.codigo ?? ""} · {elegido.fila.descripcion}{elegido.fila.marca ? ` · ${elegido.fila.marca}` : ""}</span>
        <Boton type="button" variante="linea" className="py-1" onClick={() => setElegido(null)}>Cambiar</Boton>
      </div>
      <Campo etiqueta="Cantidad / Cuadrilla">
        <Input autoFocus type="number" step="any" value={cant} onChange={(e) => setCant(e.target.value)} />
      </Campo>
      {aviso && <p className="text-xs text-destructive">{aviso}</p>}
      <div className="flex justify-end gap-2">
        <Boton type="button" variante="linea" onClick={onCerrar}>Cerrar</Boton>
        <Boton type="submit">Agregar</Boton>
      </div>
    </form>
  ) : (
    <div className="p-5">
      <Input autoFocus placeholder="Busca por código, descripción o marca…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-md border border-line">
        {gruposSel.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">Sin insumos activos en el catálogo.</p>}
        {gruposSel.map((t) => (
          <div key={t}>
            <p className="sticky top-0 z-10 bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{CONFIG[t].titulo}</p>
            {listaDe(t).map((f) => (
              <button key={f.id} type="button" onClick={() => setElegido({ tabla: t, fila: f })}
                className="flex w-full items-center gap-2 border-b border-line/60 px-3 py-1.5 text-left text-xs hover:bg-primary/10">
                <span className="w-24 shrink-0 font-mono text-muted-foreground">{f.codigo ?? ""}</span>
                <span className="min-w-0 flex-1 truncate">{f.descripcion ?? ""}</span>
                {f.marca && <span className="shrink-0 text-muted-foreground">{f.marca}</span>}
                <span className="shrink-0 text-muted-foreground">{f.unidad ?? ""}</span>
              </button>
            ))}
          </div>
        ))}
        {gruposSel.length > 0 && !gruposSel.some((t) => listaDe(t).length) && <p className="px-3 py-4 text-xs text-muted-foreground">Sin coincidencias.</p>}
      </div>
      {aviso && <p className="mt-2 text-xs text-destructive">{aviso}</p>}
    </div>
  );

  return (
    <VentanaFlotante abierta onCerrar={onCerrar} ancho={modo === "editar" ? "max-w-5xl" : "max-w-2xl"}
      titulo={dual ? "Agregar insumo" : modo === "editar" ? "Editar insumo" : modo === "copiar" ? "Copiar insumo" : "Nuevo insumo"}
      {...(agregarA ? { subtitulo: agregarA.titulo } : {})}>
      {dual && (
        <div className="flex gap-1 border-b border-line px-5">
          <button type="button" className={pestanaCls("sel")} onClick={() => { setPestana("sel"); setAviso(""); }}>Seleccionar existente</button>
          <button type="button" className={pestanaCls("crear")} onClick={() => { setPestana("crear"); setAviso(""); }}>Crear nuevo</button>
        </div>
      )}
      {(!dual || pestana === "crear") ? formulario : selector}
      {modo === "editar" && idFicha && (!dual || pestana === "crear") && (
        <FichaInsumoHistorial id={idFicha} estado={extra?.estado_aprobacion ?? "Aprobado"}
          precioBase={Number(sel?.fila.precio_base ?? sel?.fila.costo_hora ?? sel?.fila.costo ?? 0)} />
      )}
    </VentanaFlotante>
  );
}
