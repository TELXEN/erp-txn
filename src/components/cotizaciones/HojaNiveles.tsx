import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BotonIcono, Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VentanaInsumo } from "@/components/InsumoVentana";
import { AutoMaestra } from "@/components/CotizacionHoja";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { precioMaestroEnMoneda, useGruposCotizacion, type CotizacionItem, type PartidaMaestra } from "@/lib/cotizaciones";
import { copiarRecetaACotizacion, useCatalogoCotizacion } from "@/lib/banco-apu";
import {
  bloqueDe,
  formatearNivel,
  NOMBRE_NIVEL,
  nivelDe,
  numerarNiveles,
  totalesNiveles,
  type NivelCotizacion,
} from "@/lib/niveles-cotizacion";

const db = supabase as unknown as { from: (t: string) => any };
const NIVELES: NivelCotizacion[] = ["especialidad", "titulo", "subtitulo", "partida"];
const num = (n: number) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Item = CotizacionItem & { nivel?: string; partida_apu_id?: string | null };
type Form = { nivel: NivelCotizacion; nombre: string; unidad: string; metrado: string; precio: string; apuId: string | null };

/** Hoja de cotización por niveles: Especialidad > Título > Subtítulo (opcional) > Partida. */
export function HojaNiveles({
  cotizacionId,
  items,
  unidades,
  simbolo = "S/",
  moneda = "PEN",
  tipoCambio = 0,
  onSeleccionar,
  barraEn,
}: {
  cotizacionId: string;
  items: Item[];
  unidades: { id: string; simbolo: string; descripcion: string; activo: boolean }[];
  simbolo?: string;
  moneda?: "PEN" | "USD";
  tipoCambio?: number;
  onSeleccionar?: (id: string | null) => void;
  barraEn?: HTMLElement | null;
}) {
  const qc = useQueryClient();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: titulos = [] } = useGruposCotizacion();
  const catalogo = useCatalogoCotizacion() as unknown as PartidaMaestra[];
  const [sel, setSel] = useState<string | null>(null);
  const [ventana, setVentana] = useState<{ modo: "nuevo" | "editar"; id?: string; form: Form } | null>(null);
  const [error, setError] = useState("");
  const [ins, setIns] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const { orden, codigos, profundidad } = useMemo(() => numerarNiveles(items), [items]);
  const totales = useMemo(() => totalesNiveles(orden), [orden]);
  const seleccionado = orden.find((f) => f.id === sel) ?? null;
  const refrescar = () => qc.invalidateQueries({ queryKey: ["cotizacion_items", cotizacionId] });

  useEffect(() => {
    onSeleccionar?.(seleccionado && nivelDe(seleccionado) === "partida" ? seleccionado.id : null);
  }, [sel, seleccionado, onSeleccionar]);

  /** Guarda orden, código y especialidad/categoría heredadas para que la lista quede consistente. */
  async function sincronizar(lista: Item[]) {
    const { codigos: c } = numerarNiveles(lista.map((f, i) => ({ ...f, orden: i + 1 })));
    let esp = "";
    let tit = "";
    const cambios: Promise<unknown>[] = [];
    lista.forEach((f, i) => {
      const n = nivelDe(f);
      if (n === "especialidad") { esp = f.nombre; tit = ""; }
      if (n === "titulo") tit = f.nombre;
      const cambio: Record<string, unknown> = {};
      if (f.orden !== i + 1) cambio['orden'] = i + 1;
      if (f.codigo !== c.get(f.id)) cambio['codigo'] = c.get(f.id);
      const e = esp || tit;
      if (f.especialidad !== e) cambio['especialidad'] = e;
      if ((f.categoria ?? "") !== tit) cambio['categoria'] = tit;
      if (Object.keys(cambio).length) cambios.push(db.from("cotizacion_items").update(cambio).eq("id", f.id));
    });
    await Promise.all(cambios);
  }

  // Filas agregadas por otras vías (catálogo, plantillas) se numeran solas.
  const sincronizando = useRef(false);
  useEffect(() => {
    if (sincronizando.current) return;
    const desfase = orden.some((f, i) => f.orden !== i + 1 || f.codigo !== codigos.get(f.id));
    if (!desfase) return;
    sincronizando.current = true;
    void sincronizar(orden).then(refrescar).finally(() => { sincronizando.current = false; });
  }, [orden, codigos]);

  function abrirNuevo(nivel: NivelCotizacion) {
    setError("");
    setVentana({ modo: "nuevo", form: { nivel, nombre: "", unidad: "GLB", metrado: "1", precio: "0", apuId: null } });
  }
  function abrirEditar(fila: Item | null = seleccionado) {
    const seleccionado = fila;
    if (!seleccionado) return;
    setError("");
    setVentana({
      modo: "editar",
      id: seleccionado.id,
      form: {
        nivel: nivelDe(seleccionado),
        nombre: seleccionado.nombre,
        unidad: seleccionado.unidad || "GLB",
        metrado: String(seleccionado.metrado ?? 0),
        precio: String(seleccionado.precio_unitario ?? 0),
        apuId: seleccionado.partida_apu_id ?? null,
      },
    });
  }

  async function vincular(itemId: string, apuId: string) {
    const factor = moneda === "USD" ? 1 / (Number(tipoCambio) || 1) : 1;
    const r = await copiarRecetaACotizacion(itemId, apuId, factor);
    if (r.filas > 0)
      await db.from("cotizacion_items").update({ precio_unitario: r.pu, rendimiento: r.rendimiento, jornada: 8 }).eq("id", itemId);
    await qc.invalidateQueries({ queryKey: ["banco_apu", "cotizacion_apu_detalle"] });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!ventana) return;
    const f = ventana.form;
    const nombre = formatearNivel(f.nombre, f.nivel);
    if (!nombre) return setError("Escribe o elige el nombre.");
    const esPartida = f.nivel === "partida";
    const datos = {
      nivel: f.nivel,
      tipo: esPartida ? "partida" : "grupo",
      nombre,
      unidad: esPartida ? f.unidad || "GLB" : "GLB",
      metrado: esPartida ? Number(f.metrado) || 0 : 0,
      precio_unitario: esPartida ? Number(f.precio) || 0 : 0,
    };
    setOcupado(true);
    try {
      if (ventana.modo === "editar" && ventana.id) {
        const { error: err } = await db.from("cotizacion_items").update(datos).eq("id", ventana.id);
        if (err) throw err;
        if (esPartida && f.apuId && f.apuId !== seleccionado?.partida_apu_id) await vincular(ventana.id, f.apuId);
        await refrescar();
        setVentana(null);
        return;
      }
      // Nuevo: entra al final del bloque de la fila elegida (como hijo o siguiente hermano).
      const pos = seleccionado ? bloqueDe(orden, seleccionado.id)[1] : orden.length;
      const { data, error: err } = await db
        .from("cotizacion_items")
        .insert({ ...datos, cotizacion_id: cotizacionId, codigo: "", especialidad: "", categoria: "", marca: "", orden: pos + 1, partida_apu_id: f.apuId })
        .select("*")
        .single();
      if (err) throw err;
      const nueva = [...orden.slice(0, pos), data as Item, ...orden.slice(pos)];
      await sincronizar(nueva);
      if (esPartida && f.apuId) await vincular(data.id, f.apuId);
      await refrescar();
      setSel(data.id);
      // Ventana abierta para guardar consecutivamente.
      setVentana({ ...ventana, form: { ...f, nombre: "", apuId: null, precio: "0", metrado: "1" } });
    } catch (x) {
      setError(x instanceof Error ? x.message : (x as { message?: string })?.message ?? "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    if (!seleccionado) return;
    const [ini, fin] = bloqueDe(orden, seleccionado.id);
    const bloque = orden.slice(ini, fin);
    const filas = bloque.map(({ id: _i, created_at: _c, updated_at: _u, ...r }: Item & { created_at?: string; updated_at?: string }) => ({ ...r, codigo: "" }));
    const { data, error: err } = await db.from("cotizacion_items").insert(filas).select("*");
    if (err) { toast.error(err.message); return; }
    const nuevas = (data as Item[]).sort((a, b) => a.orden - b.orden);
    await sincronizar([...orden.slice(0, fin), ...nuevas, ...orden.slice(fin)]);
    for (let k = 0; k < bloque.length; k++) {
      const o = bloque[k]!;
      if (o.partida_apu_id && nuevas[k]) await vincular(nuevas[k]!.id, o.partida_apu_id).catch(() => undefined);
    }
    await refrescar();
    if (nuevas[0]) setSel(nuevas[0].id);
  }

  async function eliminar() {
    if (!seleccionado) return;
    const [ini, fin] = bloqueDe(orden, seleccionado.id);
    const ids = orden.slice(ini, fin).map((f) => f.id);
    const extra = ids.length > 1 ? ` y ${ids.length - 1} fila(s) que contiene` : "";
    if (!window.confirm(`¿Eliminar «${seleccionado.nombre}»${extra}?`)) return;
    const { error: err } = await db.from("cotizacion_items").delete().in("id", ids);
    if (err) { toast.error(err.message); return; }
    await sincronizar(orden.filter((f) => !ids.includes(f.id)));
    setSel(null);
    await refrescar();
  }

  const f = ventana?.form;
  const setF = (p: Partial<Form>) => ventana && setVentana({ ...ventana, form: { ...ventana.form, ...p } });
  const opcionesNombre =
    f?.nivel === "especialidad"
      ? especialidades.filter((e) => e.activo).map((e) => e.nombre)
      : f?.nivel === "titulo"
        ? titulos.filter((t) => t.activo).map((t) => formatearNivel(t.nombre, "titulo"))
        : [];

  const barra = (
      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border border-line bg-card p-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <BotonIcono etiqueta="Agregar" title="Agregar" tono="primario"><Plus size={15} /></BotonIcono>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left" align="start">
            {NIVELES.map((n) => (
              <DropdownMenuItem key={n} onSelect={() => abrirNuevo(n)}>{NOMBRE_NIVEL[n]}</DropdownMenuItem>
            ))}
            <div className="my-1 border-t border-line" />
            <DropdownMenuItem onSelect={() => setIns(true)}>Insumo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <BotonIcono etiqueta="Editar" title="Editar" disabled={!seleccionado} onClick={() => abrirEditar()}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar" title="Copiar con su contenido" disabled={!seleccionado} onClick={() => void copiar()}><Copy size={15} /></BotonIcono>
        <BotonIcono etiqueta="Eliminar" title="Eliminar con su contenido" tono="peligro" disabled={!seleccionado} onClick={() => void eliminar()}><Trash2 size={15} /></BotonIcono>
      </div>
  );

  return (
    <div className="flex w-full gap-2">
      <div className="min-w-0 flex-1 overflow-x-auto rounded-md border border-line bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-muted/50 text-left text-[10px] uppercase text-muted-foreground">
              <th className="w-20 px-2 py-1.5">Ítem</th>
              <th className="px-2 py-1.5">Descripción</th>
              <th className="w-14 px-2 py-1.5">Und</th>
              <th className="w-20 px-2 py-1.5 text-right">Metrado</th>
              <th className="w-24 px-2 py-1.5 text-right">P. unit.</th>
              <th className="w-28 px-2 py-1.5 text-right">Parcial ({simbolo})</th>
            </tr>
          </thead>
          <tbody>
            {orden.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">Usa el botón + de la derecha para agregar una especialidad o un título.</td></tr>
            )}
            {orden.map((fila) => {
              const n = nivelDe(fila);
              const prof = profundidad.get(fila.id) ?? 0;
              const elegido = sel === fila.id;
              const estilo =
                n === "especialidad" ? "bg-primary/10 font-bold" : n === "titulo" ? "bg-muted/60 font-semibold" : n === "subtitulo" ? "font-semibold italic" : "";
              return (
                <tr
                  key={fila.id}
                  onClick={() => setSel(fila.id)}
                  onDoubleClick={() => { setSel(fila.id); abrirEditar(fila); }}
                  className={`cursor-pointer border-b border-line/60 ${estilo} ${elegido ? "outline outline-2 -outline-offset-2 outline-primary" : "hover:bg-muted/40"}`}
                >
                  <td className="px-2 py-1 font-mono">{codigos.get(fila.id)}</td>
                  <td className="px-2 py-1" style={{ paddingLeft: 8 + prof * 14 }}>{fila.nombre}</td>
                  <td className="px-2 py-1">{n === "partida" ? fila.unidad : ""}</td>
                  <td className="px-2 py-1 text-right">{n === "partida" ? num(Number(fila.metrado)) : ""}</td>
                  <td className="px-2 py-1 text-right">{n === "partida" ? num(Number(fila.precio_unitario)) : ""}</td>
                  <td className="px-2 py-1 text-right">{num(totales.get(fila.id) ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {barraEn ? createPortal(barra, barraEn) : barra}

      <VentanaFlotante
        abierta={Boolean(ventana)}
        titulo={`${ventana?.modo === "editar" ? "Editar" : "Agregar"} ${f ? NOMBRE_NIVEL[f.nivel].toLowerCase() : ""}`}
        subtitulo={ventana?.modo === "nuevo" && seleccionado ? `Se agrega después de «${seleccionado.nombre}»` : ""}
        onCerrar={() => setVentana(null)}
        ancho="max-w-xl"
      >
        {f && (
          <form onSubmit={guardar} className="grid gap-3 p-4 sm:grid-cols-2">
            {ventana?.modo === "nuevo" && (
              <Campo etiqueta="Nivel">
                <Select value={f.nivel} onChange={(e) => setF({ nivel: e.target.value as NivelCotizacion, nombre: "" })}>
                  {NIVELES.map((n) => <option key={n} value={n}>{NOMBRE_NIVEL[n]}</option>)}
                </Select>
              </Campo>
            )}
            <div className="sm:col-span-2">
              <Campo etiqueta="Nombre">
                {opcionesNombre.length > 0 ? (
                  <Select value={f.nombre} onChange={(e) => setF({ nombre: e.target.value })} autoFocus>
                    <option value="">— Elegir —</option>
                    {f.nombre && !opcionesNombre.includes(f.nombre) && <option value={f.nombre}>{f.nombre}</option>}
                    {opcionesNombre.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : f.nivel === "partida" ? (
                  <AutoMaestra
                    value={f.nombre}
                    onChange={(v) => setF({ nombre: v, apuId: null })}
                    maestras={catalogo}
                    onElegir={(m) =>
                      setF({
                        nombre: m.nombre,
                        unidad: m.unidad || "GLB",
                        precio: String(precioMaestroEnMoneda(m.precio_unitario, moneda, tipoCambio)),
                        apuId: m.id,
                      })
                    }
                    autoFocus
                    placeholder="Busca en el Banco APU o escribe"
                    className="w-full rounded border border-line bg-card px-2 py-1.5 text-xs"
                  />
                ) : (
                  <Input value={f.nombre} onChange={(e) => setF({ nombre: e.target.value })} onBlur={(e) => setF({ nombre: formatearNivel(e.target.value, f.nivel) })} autoFocus />
                )}
              </Campo>
            </div>
            {f.nivel === "partida" && (
              <>
                <Campo etiqueta="Unidad">
                  <Select value={f.unidad} onChange={(e) => setF({ unidad: e.target.value })}>
                    {!unidades.some((u) => u.simbolo === f.unidad) && <option value={f.unidad}>{f.unidad}</option>}
                    {unidades.filter((u) => u.activo).map((u) => <option key={u.id} value={u.simbolo}>{u.simbolo} · {u.descripcion}</option>)}
                  </Select>
                </Campo>
                <Campo etiqueta="Metrado">
                  <Input type="number" step="0.01" min="0" value={f.metrado} onChange={(e) => setF({ metrado: e.target.value })} />
                </Campo>
                <Campo etiqueta={`P. unitario (${simbolo})`}>
                  <Input type="number" step="0.01" min="0" value={f.precio} onChange={(e) => setF({ precio: e.target.value })} />
                </Campo>
              </>
            )}
            {error && <p className="text-xs text-bad sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Boton type="button" variante="linea" onClick={() => setVentana(null)}>Cerrar</Boton>
              <Boton type="submit" disabled={ocupado}>Guardar</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>

      {ins && <VentanaInsumo modo="nuevo" onCerrar={() => setIns(false)} />}
    </div>
  );
}

