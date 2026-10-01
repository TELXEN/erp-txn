import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Boton, Campo, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { soles } from "@/lib/format";
import { useUnidadesMedida } from "@/lib/unidades";
import { reservarCodigoInsumo } from "@/lib/codigos.functions";
import {
  CATEGORIAS_OBRERO,
  REGIMENES_LABORALES,
  TIPOS_INSUMO,
  apuDb,
  calcularCostoHH,
  nombreTipo,
  precioVenta,
  PARAMETROS_LABORALES_DEFECTO,
  useInsumos,
  useParametrosLaborales,
  type Insumo,
  type RegimenLaboral,
  type TipoInsumo,
} from "@/lib/apu";

const vacio = { tipo: "MAT" as TipoInsumo, codigo: "", nombre: "", unidad: "und", precio: "", margen: "" };

export function Insumos() {
  const qc = useQueryClient();
  const { data: lista = [] } = useInsumos();
  const { data: unidades = [] } = useUnidadesMedida();
  const [form, setForm] = useState(vacio);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [filtro, setFiltro] = useState<TipoInsumo>("MO");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["insumos"] });
    qc.invalidateQueries({ queryKey: ["apu_componentes"] });
  };
  const simbolos = useMemo(() => {
    const s = unidades.filter((u) => u.activo).map((u) => u.simbolo);
    return [...new Set([...s, "hh", "hm", "und", "%mo"])];
  }, [unidades]);

  const visibles = lista
    .filter((i) => i.tipo === filtro)
    .filter((i) => coincide(busqueda, i.codigo, i.nombre));

  function cambiarPestana(t: TipoInsumo) {
    setFiltro(t);
    setForm((f) => ({ ...f, tipo: t }));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nombre.trim()) return setError("Escribe la descripción del insumo.");
    const { error: err } = await apuDb.from("insumos").insert({
      tipo: form.tipo,
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      unidad: form.unidad,
      precio: Number(form.precio || 0),
      margen_pct: Number(form.margen || 0),
    });
    if (err) return setError(err.message);
    setForm({ ...vacio, tipo: form.tipo, unidad: form.unidad });
    refrescar();
  }

  async function guardar() {
    if (!editando) return;
    const { error: err } = await apuDb
      .from("insumos")
      .update({
        tipo: editando.tipo,
        codigo: editando.codigo.trim(),
        nombre: editando.nombre.trim(),
        unidad: editando.unidad,
        precio: Number(editando.precio || 0),
        margen_pct: Number(editando.margen_pct || 0),
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este insumo?")) return;
    const { error: err } = await apuDb.from("insumos").delete().eq("id", id);
    if (err)
      return setError(
        err.message.includes("foreign key") ? "El insumo se usa en un análisis de precios; desactívalo." : err.message,
      );
    refrescar();
  }

  return (
    <>
      <div className="mb-4 inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-line bg-muted/40 p-1">
        <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tipo:</span>
        {TIPOS_INSUMO.map(([t, texto]) => (
          <button
            key={t}
            type="button"
            onClick={() => cambiarPestana(t)}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              filtro === t
                ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-primary"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      {filtro === "MO" ? (
        <ManoObraWysiwyg lista={visibles} busqueda={busqueda} setBusqueda={setBusqueda} refrescar={refrescar} />
      ) : (
        <>
          <Panel titulo={`Nuevo insumo — ${nombreTipo(filtro)}`} className="mb-4">
            <form onSubmit={crear} className="grid gap-3 p-4 sm:grid-cols-7">
              <Campo etiqueta="Tipo">
                <Select className="py-1.5" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoInsumo })}>
                  {TIPOS_INSUMO.map(([k, t]) => (
                    <option key={k} value={k}>{t}</option>
                  ))}
                </Select>
              </Campo>
              <Campo etiqueta="Código">
                <Input className="py-1.5 font-mono" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Opcional" />
              </Campo>
              <div className="sm:col-span-2">
                <Campo etiqueta="Descripción">
                  <Input className="py-1.5" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Cemento Portland tipo I" />
                </Campo>
              </div>
              <Campo etiqueta="Unidad">
                <Select className="py-1.5" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                  {simbolos.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="P. compra sin IGV (S/)">
                <Input className="py-1.5" type="number" step="0.01" min={0} value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </Campo>
              <Campo etiqueta="Margen (%)">
                <Input className="py-1.5" type="number" step="0.01" min={0} value={form.margen} onChange={(e) => setForm({ ...form, margen: e.target.value })} />
              </Campo>
              <div className="sm:col-span-7 flex justify-end">
                <Boton type="submit">Agregar insumo</Boton>
              </div>
              {error && <p className="font-mono text-xs text-bad sm:col-span-7">{error}</p>}
            </form>
          </Panel>

          <Panel
            titulo={`Maestro de insumos — ${nombreTipo(filtro)}`}
            extra={
              <Buscador valor={busqueda} onChange={setBusqueda} total={visibles.length} placeholder="Buscar insumo por código o descripción..." />
            }
          >
            {visibles.length === 0 ? (
              <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : `Aún no hay insumos de ${nombreTipo(filtro)} registrados.`} />
            ) : (
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-[14%] px-5 py-2 font-medium">Tipo</th>
                    <th className="w-[9%] px-3 py-2 font-medium">Código</th>
                    <th className="w-[27%] px-3 py-2 font-medium">Descripción</th>
                    <th className="w-[7%] px-3 py-2 font-medium">Und.</th>
                    <th className="w-[11%] px-3 py-2 text-right font-medium">P. Compra</th>
                    <th className="w-[8%] px-3 py-2 text-right font-medium">Margen %</th>
                    <th className="w-[11%] px-3 py-2 text-right font-medium">P. Venta</th>
                    <th className="w-[6%] px-3 py-2 font-medium">Estado</th>
                    <th className="w-[7%] px-5 py-2 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((i) =>
                    editando?.id === i.id ? (
                      <tr key={i.id} className="border-b border-line/40">
                        <td className="px-5 py-2">
                          <Select className="py-1 text-xs" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value as TipoInsumo })}>
                            {TIPOS_INSUMO.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                          </Select>
                        </td>
                        <td className="px-3 py-2"><Input className="py-1 text-xs" value={editando.codigo} onChange={(e) => setEditando({ ...editando, codigo: e.target.value })} /></td>
                        <td className="px-3 py-2"><Input className="py-1 text-xs" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} /></td>
                        <td className="px-3 py-2">
                          <Select className="py-1 text-xs" value={editando.unidad} onChange={(e) => setEditando({ ...editando, unidad: e.target.value })}>
                            {[...new Set([editando.unidad, ...simbolos])].map((s) => <option key={s} value={s}>{s}</option>)}
                          </Select>
                        </td>
                        <td className="px-3 py-2"><Input className="py-1 text-right text-xs" type="number" step="0.01" value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: Number(e.target.value) })} /></td>
                        <td className="px-3 py-2"><Input className="py-1 text-right text-xs" type="number" step="0.01" value={editando.margen_pct} onChange={(e) => setEditando({ ...editando, margen_pct: Number(e.target.value) })} /></td>
                        <td className="px-3 py-2 text-right text-ink">{soles(precioVenta(editando))}</td>
                        <td className="px-3 py-2">
                          <Select className="py-1 text-xs" value={editando.activo ? "si" : "no"} onChange={(e) => setEditando({ ...editando, activo: e.target.value === "si" })}>
                            <option value="si">Activo</option>
                            <option value="no">Inactivo</option>
                          </Select>
                        </td>
                        <td className="px-5 py-2">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={guardar} title="Guardar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"><Check size={14} /></button>
                            <button type="button" onClick={() => setEditando(null)} title="Cancelar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={i.id} className="border-b border-line/40 last:border-0">
                        <td className="px-5 py-2.5 text-muted-foreground">{nombreTipo(i.tipo)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground"><Resaltar texto={i.codigo || "—"} termino={busqueda} /></td>
                        <td className="px-3 py-2.5 text-ink"><Resaltar texto={i.nombre} termino={busqueda} /></td>
                        <td className="px-3 py-2.5 text-muted-foreground">{i.unidad}</td>
                        <td className="px-3 py-2.5 text-right">{soles(Number(i.precio))}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{Number(i.margen_pct || 0).toFixed(2)}%</td>
                        <td className="px-3 py-2.5 text-right text-ink">{soles(precioVenta(i))}</td>
                        <td className="px-3 py-2.5"><span className={i.activo ? "text-good" : "text-muted-foreground"}>{i.activo ? "Activo" : "Inactivo"}</span></td>
                        <td className="px-5 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => setEditando(i)} title="Editar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Pencil size={14} /></button>
                            <button type="button" onClick={() => eliminar(i.id)} title="Eliminar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
            <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              Equipos se valorizan por hora (hm). Los precios se registran sin IGV y alimentan el análisis de precios unitarios de cada partida.
            </p>
          </Panel>
        </>
      )}
    </>
  );
}

// ================= Mano de obra: edición WYSIWYG con Costo HH =================

type FilaMO = {
  nombre: string;
  regimen: RegimenLaboral;
  categoria: string;
  sueldo: string;
  margen: string;
  asignacion: boolean;
};

const filaVacia: FilaMO = { nombre: "", regimen: "General", categoria: "Operario", sueldo: "", margen: "", asignacion: false };

function ManoObraWysiwyg({
  lista,
  busqueda,
  setBusqueda,
  refrescar,
}: {
  lista: Insumo[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  refrescar: () => void;
}) {
  const { data: paramsData } = useParametrosLaborales();
  const params = paramsData ?? PARAMETROS_LABORALES_DEFECTO;
  const [nueva, setNueva] = useState<FilaMO>(filaVacia);
  const [editando, setEditando] = useState<(FilaMO & { id: string; codigo: string; activo: boolean }) | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const calculoNueva = useMemo(
    () =>
      calcularCostoHH(
        {
          sueldo_mensual: Number(nueva.sueldo || 0),
          regimen_laboral: nueva.regimen,
          categoria_obrero: nueva.regimen === "Construcción Civil" ? nueva.categoria : null,
          asignacion_familiar: nueva.asignacion,
        },
        params,
      ),
    [nueva, params],
  );

  const calculoEdicion = useMemo(
    () =>
      editando
        ? calcularCostoHH(
            {
              sueldo_mensual: Number(editando.sueldo || 0),
              regimen_laboral: editando.regimen,
              categoria_obrero: editando.regimen === "Construcción Civil" ? editando.categoria : null,
              asignacion_familiar: editando.asignacion,
            },
            params,
          )
        : null,
    [editando, params],
  );

  async function crearDesdeFila() {
    if (guardando) return;
    if (!nueva.nombre.trim()) return setError("Escribe la descripción del trabajador u oficio.");
    setError("");
    setGuardando(true);
    try {
      const codigo = await reservarCodigoInsumo({ data: { tipo: "MO" } });
      const { error: err } = await apuDb.from("insumos").insert({
        tipo: "MO",
        codigo,
        nombre: nueva.nombre.trim(),
        unidad: "hh",
        precio: calculoNueva.costoHH,
        margen_pct: Number(nueva.margen || 0),
        sueldo_mensual: Number(nueva.sueldo || 0),
        regimen_laboral: nueva.regimen,
        categoria_obrero: nueva.regimen === "Construcción Civil" ? nueva.categoria : null,
        asignacion_familiar: nueva.asignacion,
      });
      if (err) throw new Error(err.message);
      setNueva(filaVacia);
      refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el insumo.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion() {
    if (!editando || !calculoEdicion) return;
    setError("");
    const { error: err } = await apuDb
      .from("insumos")
      .update({
        nombre: editando.nombre.trim(),
        unidad: "hh",
        precio: calculoEdicion.costoHH,
        margen_pct: Number(editando.margen || 0),
        sueldo_mensual: Number(editando.sueldo || 0),
        regimen_laboral: editando.regimen,
        categoria_obrero: editando.regimen === "Construcción Civil" ? editando.categoria : null,
        asignacion_familiar: editando.asignacion,
        activo: editando.activo,
      })
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    refrescar();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este insumo de mano de obra?")) return;
    const { error: err } = await apuDb.from("insumos").delete().eq("id", id);
    if (err)
      return setError(
        err.message.includes("foreign key") ? "El insumo se usa en un análisis de precios; desactívalo." : err.message,
      );
    refrescar();
  }

  const teclaNueva = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void crearDesdeFila();
    }
  };

  const inputCls = "w-full rounded-md border border-line bg-background px-2 py-1 text-xs outline-none focus:border-primary";
  const selCls = "w-full rounded-md border border-line bg-background px-1.5 py-1 text-xs outline-none focus:border-primary";

  return (
    <Panel
      titulo="Maestro de insumos — Mano de obra"
      extra={<Buscador valor={busqueda} onChange={setBusqueda} total={lista.length} placeholder="Buscar por código o descripción..." />}
    >
      <table className="w-full table-fixed font-mono text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="w-[8%] px-5 py-2 font-medium">Código</th>
            <th className="w-[26%] px-3 py-2 font-medium">Descripción</th>
            <th className="w-[14%] px-3 py-2 font-medium">Régimen</th>
            <th className="w-[12%] px-3 py-2 text-right font-medium">Sueldo mensual</th>
            <th className="w-[5%] px-3 py-2 font-medium">Und.</th>
            <th className="w-[10%] px-3 py-2 text-right font-medium">Costo Base</th>
            <th className="w-[7%] px-3 py-2 text-right font-medium">Margen %</th>
            <th className="w-[10%] px-3 py-2 text-right font-medium">Costo HH</th>
            <th className="w-[8%] px-5 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((i) => {
            const esEdicion = editando?.id === i.id;
            const costoHH = esEdicion && calculoEdicion ? calculoEdicion.costoHH : Number(i.precio);
            const pv = costoHH * (1 + Number(esEdicion ? editando.margen || 0 : i.margen_pct || 0) / 100);
            return (
              <FragmentFila
                key={i.id}
                abierto={detalleAbierto === i.id}
                onToggle={() => setDetalleAbierto(detalleAbierto === i.id ? null : i.id)}
                detalle={
                  <DetalleCostoHH
                    lineas={
                      esEdicion && calculoEdicion
                        ? calculoEdicion.lineas
                        : calcularCostoHH(
                            {
                              sueldo_mensual: Number(i.sueldo_mensual || 0),
                              regimen_laboral: i.regimen_laboral ?? "General",
                              categoria_obrero: i.categoria_obrero ?? null,
                              asignacion_familiar: !!i.asignacion_familiar,
                            },
                            params,
                          ).lineas
                    }
                    horas={calculoEdicion && esEdicion ? calculoEdicion.horasEfectivas : undefined}
                  />
                }
              >
                {esEdicion ? (
                  <>
                    <td className="px-5 py-2 text-muted-foreground">{editando.codigo || "—"}</td>
                    <td className="px-3 py-2"><Input className="py-1 text-xs" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <select className={selCls} value={editando.regimen} onChange={(e) => setEditando({ ...editando, regimen: e.target.value as RegimenLaboral })}>
                        {REGIMENES_LABORALES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {editando.regimen === "Construcción Civil" ? (
                        <div className="flex items-center gap-1">
                          <select className={selCls} value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                            {CATEGORIAS_OBRERO.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <span className="whitespace-nowrap text-[10px] text-muted-foreground">por jornal</span>
                        </div>
                      ) : (
                        <Input className="py-1 text-right text-xs" type="number" step="0.01" min={0} value={editando.sueldo} onChange={(e) => setEditando({ ...editando, sueldo: e.target.value })} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">hh</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">{soles(costoHH)}</td>
                    <td className="px-3 py-2"><Input className="py-1 text-right text-xs" type="number" step="0.01" min={0} value={editando.margen} onChange={(e) => setEditando({ ...editando, margen: e.target.value })} /></td>
                    <td className="px-3 py-2 text-right text-ink">{soles(pv)}</td>
                    <td className="px-5 py-2">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={guardarEdicion} title="Guardar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"><Check size={14} /></button>
                        <button type="button" onClick={() => setEditando(null)} title="Cancelar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"><X size={14} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-2.5 text-muted-foreground"><Resaltar texto={i.codigo || "—"} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-ink"><Resaltar texto={i.nombre} termino={busqueda} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{i.regimen_laboral ?? "General"}</td>
                    <td className="px-3 py-2.5 text-right">{i.regimen_laboral === "Construcción Civil" ? `${i.categoria_obrero ?? "Operario"} (jornal)` : soles(Number(i.sueldo_mensual || 0))}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">hh</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-primary">{soles(Number(i.precio))}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{Number(i.margen_pct || 0).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right text-ink">{soles(precioVenta(i))}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEditando({
                              id: i.id,
                              codigo: i.codigo,
                              activo: i.activo,
                              nombre: i.nombre,
                              regimen: i.regimen_laboral ?? "General",
                              categoria: i.categoria_obrero ?? "Operario",
                              sueldo: String(i.sueldo_mensual || ""),
                              margen: String(i.margen_pct || ""),
                              asignacion: !!i.asignacion_familiar,
                            })
                          }
                          title="Editar"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => eliminar(i.id)} title="Eliminar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </>
                )}
              </FragmentFila>
            );
          })}

          {/* Fila fantasma de creación rápida */}
          <tr className="border-b border-dashed border-line/60 bg-muted/20">
            <td className="px-5 py-2 text-muted-foreground/60">auto</td>
            <td className="px-3 py-2">
              <input
                className={inputCls}
                placeholder="Escribe la descripción y pulsa Enter…"
                value={nueva.nombre}
                onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2">
              <select className={selCls} value={nueva.regimen} onChange={(e) => setNueva({ ...nueva, regimen: e.target.value as RegimenLaboral })}>
                {REGIMENES_LABORALES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </td>
            <td className="px-3 py-2">
              {nueva.regimen === "Construcción Civil" ? (
                <select className={selCls} value={nueva.categoria} onChange={(e) => setNueva({ ...nueva, categoria: e.target.value })}>
                  {CATEGORIAS_OBRERO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-3 py-2">
              {nueva.regimen === "Construcción Civil" ? (
                <span className="block text-right text-muted-foreground">por jornal</span>
              ) : (
                <input
                  className={`${inputCls} text-right`}
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={nueva.sueldo}
                  onChange={(e) => setNueva({ ...nueva, sueldo: e.target.value })}
                  onKeyDown={teclaNueva}
                />
              )}
            </td>
            <td className="px-3 py-2 text-center text-muted-foreground">hh</td>
            <td className="px-3 py-2 text-right font-semibold text-primary">{soles(calculoNueva.costoHH)}</td>
            <td className="px-3 py-2">
              <input
                className={`${inputCls} text-right`}
                type="number"
                step="0.01"
                min={0}
                placeholder="0"
                value={nueva.margen}
                onChange={(e) => setNueva({ ...nueva, margen: e.target.value })}
                onKeyDown={teclaNueva}
              />
            </td>
            <td className="px-3 py-2 text-right text-ink">
              {soles(calculoNueva.costoHH * (1 + Number(nueva.margen || 0) / 100))}
            </td>
            <td className="px-5 py-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void crearDesdeFila()}
                  disabled={guardando}
                  title="Registrar insumo"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            </td>
          </tr>
          {/* Vista previa del cálculo de la fila fantasma */}
          {(Number(nueva.sueldo || 0) > 0 || nueva.regimen === "Construcción Civil") && (
            <tr className="border-b border-dashed border-line/60 bg-muted/20">
              <td colSpan={10} className="px-5 py-2">
                <DetalleCostoHH lineas={calculoNueva.lineas} horas={calculoNueva.horasEfectivas} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
      <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
        El Costo HH se calcula con el régimen laboral (sueldo o jornal, gratificaciones, vacaciones, CTS, EsSalud, SCTR, Vida Ley, BUC) dividido entre las horas
        efectivas anuales. Los parámetros se ajustan en Configuración del Sistema › Parámetros laborales. La unidad es siempre hh.
      </p>
    </Panel>
  );
}

function FragmentFila({
  children,
  abierto,
  onToggle,
  detalle,
}: {
  children: React.ReactNode;
  abierto: boolean;
  onToggle: () => void;
  detalle: React.ReactNode;
}) {
  return (
    <>
      <tr className="border-b border-line/20">{children}</tr>
      <tr className="border-b border-line/40">
        <td colSpan={10} className="px-5 pb-1 pt-0">
          <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-primary">
            {abierto ? <ChevronDown size={11} /> : <ChevronRight size={11} />} Cómo se calcula el Costo HH
          </button>
          {abierto && <div className="pb-2 pt-1">{detalle}</div>}
        </td>
      </tr>
    </>
  );
}

function DetalleCostoHH({ lineas, horas }: { lineas: { concepto: string; monto: number }[]; horas?: number | undefined }) {
  const total = lineas.reduce((a, l) => a + l.monto, 0);
  return (
    <div className="rounded-md border border-line/60 bg-muted/30 px-3 py-2">
      <div className="grid gap-0.5">
        {lineas.map((l, idx) => (
          <div key={idx} className="flex items-baseline justify-between gap-4 text-[11px]">
            <span className="text-muted-foreground">{l.concepto}</span>
            <span className="text-ink">{soles(l.monto)}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line/60 pt-1 text-[11px] font-semibold">
          <span>Costo anual total{horas ? ` ÷ ${horas.toLocaleString("es-PE")} h efectivas` : ""}</span>
          <span className="text-primary">{soles(total)}</span>
        </div>
      </div>
    </div>
  );
}
