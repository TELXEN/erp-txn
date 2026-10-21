import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BotonIcono, Boton, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AutoMaestra } from "@/components/CotizacionHoja";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { precioMaestroEnMoneda, useGruposCotizacion, type CotizacionItem, type PartidaMaestra } from "@/lib/cotizaciones";
import { copiarRecetaACotizacion, useCatalogoCotizacion } from "@/lib/banco-apu";
import {
  bloqueDe,
  formatearNivel,
  NOMBRE_NIVEL,
  nivelDe,
  moverBloqueNivel,
  numerarNiveles,
  posicionInsercion,
  totalesNiveles,
  type NivelCotizacion,
} from "@/lib/niveles-cotizacion";

const db = supabase as unknown as { from: (t: string) => any };
const NIVELES: NivelCotizacion[] = ["especialidad", "titulo", "subtitulo", "partida"];
const num = (n: number) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Item = CotizacionItem & { nivel?: string; partida_apu_id?: string | null };
type Form = { nivel: NivelCotizacion; nombre: string; unidad: string; metrado: string; precio: string; apuId: string | null };

/** Hoja de cotización por niveles: Especialidad > Título > Subtítulo (opcional) > Partida. */
export type AccionDocumento = { etiqueta: string; icono: ReactNode; onClick: () => void; oculto?: boolean };

export function HojaNiveles({
  cotizacionId,
  items,
  unidades,
  simbolo = "S/",
  moneda = "PEN",
  tipoCambio = 0,
  onSeleccionar,
  barraEn,
  onAgregarInsumo,
  accionesDocumento,
}: {
  cotizacionId: string;
  items: Item[];
  unidades: { id: string; simbolo: string; descripcion: string; activo: boolean }[];
  simbolo?: string;
  moneda?: "PEN" | "USD";
  tipoCambio?: number;
  onSeleccionar?: (id: string | null) => void;
  barraEn?: HTMLElement | null;
  /** Abre la ventana de insumo del panel APU (crear nuevo o seleccionar del catálogo). */
  onAgregarInsumo?: () => void;
  /** Acciones poco usadas sobre toda la cotización (bloque «Documento» de la barra). */
  accionesDocumento?: AccionDocumento[];
}) {
  const docs = (accionesDocumento ?? []).filter((a) => !a.oculto);
  const qc = useQueryClient();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: titulos = [] } = useGruposCotizacion();
  const catalogo = useCatalogoCotizacion() as unknown as PartidaMaestra[];
  const [sel, setSel] = useState<string | null>(null);
  const [ventana, setVentana] = useState<{ modo: "nuevo" | "editar"; id?: string; form: Form } | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [origenPartida, setOrigenPartida] = useState<"banco" | "nueva">("banco");

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
    const resultados = await Promise.all(cambios);
    for (const resultado of resultados) {
      const fallo = (resultado as { error?: { message: string } } | null)?.error;
      if (fallo) throw new Error(fallo.message);
    }
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
    setOrigenPartida("banco");
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
    if (ventana.modo === "nuevo" && f.nivel === "partida" && origenPartida === "banco" && !f.apuId)
      return setError("Selecciona una partida del Banco de partidas.");
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
      const pos = posicionInsercion(orden, f.nivel, seleccionado?.id ?? null);
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
  const subir = sel ? moverBloqueNivel(orden, sel, "subir") : null;
  const bajar = sel ? moverBloqueNivel(orden, sel, "bajar") : null;
  async function mover(direccion: "subir" | "bajar") {
    const nueva = direccion === "subir" ? subir : bajar;
    if (!nueva || ocupado) return;
    setOcupado(true);
    sincronizando.current = true;
    try {
      // Keep previous order values so sincronizar persists the changed positions.
      const anteriores = new Map(orden.map((fila) => [fila.id, fila.orden]));
      await sincronizar(nueva.map((fila) => ({ ...fila, orden: anteriores.get(fila.id) ?? fila.orden })));
      await refrescar();
    } catch (x) {
      toast.error(x instanceof Error ? x.message : "No se pudo mover la fila.");
      await refrescar();
    } finally {
      sincronizando.current = false;
      setOcupado(false);
    }
  }
  const setF = (p: Partial<Form>) => ventana && setVentana({ ...ventana, form: { ...ventana.form, ...p } });
  const opcionesNombre =
    f?.nivel === "especialidad"
      ? especialidades.filter((e) => e.activo).map((e) => e.nombre)
      : f?.nivel === "titulo"
        ? titulos.filter((t) => t.activo).map((t) => formatearNivel(t.nombre, "titulo"))
        : [];

  const barra = (
      <div className="sticky top-2 flex h-fit flex-col gap-1.5 rounded-md border p-1.5 barra-iconos">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <BotonIcono etiqueta="Agregar" title="Agregar" tono="primario"><Plus size={15} /></BotonIcono>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="left" align="start">
            {NIVELES.map((n) => (
              <DropdownMenuItem key={n} onSelect={() => abrirNuevo(n)}>{NOMBRE_NIVEL[n]}</DropdownMenuItem>
            ))}
            <div className="my-1 border-t border-line" />
            <DropdownMenuItem onSelect={() => onAgregarInsumo?.()}>Insumo</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <BotonIcono etiqueta="Editar" title="Editar" disabled={!seleccionado} onClick={() => abrirEditar()}><Pencil size={15} /></BotonIcono>
        <BotonIcono etiqueta="Copiar" title="Copiar con su contenido" disabled={!seleccionado} onClick={() => void copiar()}><Copy size={15} /></BotonIcono>
        <div className="border-t border-line" />
        <BotonIcono etiqueta="Subir" title="Subir con su contenido" disabled={!subir || ocupado} onClick={() => void mover("subir")}><ArrowUp size={15} /></BotonIcono>
        <BotonIcono etiqueta="Bajar" title="Bajar con su contenido" disabled={!bajar || ocupado} onClick={() => void mover("bajar")}><ArrowDown size={15} /></BotonIcono>
        <div className="border-t border-line" />
        <BotonIcono etiqueta="Eliminar" title="Eliminar con su contenido" tono="peligro" disabled={!seleccionado} onClick={() => void eliminar()}><Trash2 size={15} /></BotonIcono>
        {docs.length > 0 && (
          <>
            <div className="border-t-2 border-line" title="Documento" />
            {docs.map((a) => (
              <BotonIcono key={a.etiqueta} etiqueta={a.etiqueta} onClick={a.onClick}>{a.icono}</BotonIcono>
            ))}
          </>
        )}
      </div>
  );

  return (
    <div className="flex w-full gap-2">
      <ContextMenu>
      <ContextMenuTrigger asChild>
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
                  onContextMenu={() => setSel(fila.id)}
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52 text-xs">
        <ContextMenuSub>
          <ContextMenuSubTrigger><Plus size={13} className="mr-2" /> Agregar</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {NIVELES.map((n) => (
              <ContextMenuItem key={n} onSelect={() => abrirNuevo(n)}>{NOMBRE_NIVEL[n]}</ContextMenuItem>
            ))}
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!seleccionado || nivelDe(seleccionado) !== "partida"} onSelect={() => onAgregarInsumo?.()}>Insumo</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem disabled={!seleccionado} onSelect={() => abrirEditar()}><Pencil size={13} className="mr-2" /> Editar</ContextMenuItem>
        <ContextMenuItem disabled={!seleccionado} onSelect={() => void copiar()}><Copy size={13} className="mr-2" /> Copiar</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!subir || ocupado} onSelect={() => void mover("subir")}><ArrowUp size={13} className="mr-2" /> Mover arriba</ContextMenuItem>
        <ContextMenuItem disabled={!bajar || ocupado} onSelect={() => void mover("bajar")}><ArrowDown size={13} className="mr-2" /> Mover abajo</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!seleccionado} className="text-bad focus:text-bad" onSelect={() => void eliminar()}><Trash2 size={13} className="mr-2" /> Eliminar</ContextMenuItem>
        {docs.length > 0 && (
          <>
            <ContextMenuSeparator />
            <div className="px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">Documento</div>
            {docs.map((a) => (
              <ContextMenuItem key={a.etiqueta} onSelect={() => a.onClick()}><span className="mr-2 inline-flex [&>svg]:size-[13px]">{a.icono}</span> {a.etiqueta}</ContextMenuItem>
            ))}
          </>
        )}
      </ContextMenuContent>
      </ContextMenu>

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
                <Select value={f.nivel} onChange={(e) => { setError(""); setF({ nivel: e.target.value as NivelCotizacion, nombre: "", apuId: null, unidad: "GLB", precio: "0" }); }}>
                  {NIVELES.map((n) => <option key={n} value={n}>{NOMBRE_NIVEL[n]}</option>)}
                </Select>
              </Campo>
            )}
            {ventana?.modo === "nuevo" && f.nivel === "partida" && (
              <Tabs
                value={origenPartida}
                onValueChange={(v) => {
                  if (v !== "banco" && v !== "nueva") return;
                  setOrigenPartida(v);
                  setError("");
                  setF({ nombre: "", apuId: null, unidad: "GLB", precio: "0" });
                }}
                className="sm:col-span-2"
              >
                <TabsList className="h-auto w-full flex-wrap">
                  <TabsTrigger value="banco" disabled={ocupado} className="flex-1 text-xs">Banco de partidas</TabsTrigger>
                  <TabsTrigger value="nueva" disabled={ocupado} className="flex-1 text-xs">Crear nueva</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="sm:col-span-2">
              <Campo etiqueta={ventana?.modo === "nuevo" && f.nivel === "partida" && origenPartida === "banco" ? "Partida del banco" : "Nombre"}>
                {opcionesNombre.length > 0 ? (
                  <Select value={f.nombre} onChange={(e) => setF({ nombre: e.target.value })} autoFocus>
                    <option value="">— Elegir —</option>
                    {f.nombre && !opcionesNombre.includes(f.nombre) && <option value={f.nombre}>{f.nombre}</option>}
                    {opcionesNombre.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : f.nivel === "partida" && !(ventana?.modo === "nuevo" && origenPartida === "nueva") ? (
                  <AutoMaestra
                    key={`${ventana?.modo}-${origenPartida}`}
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
                    placeholder="Buscar partida por código o descripción…"
                    className="w-full rounded border border-line bg-card px-2 py-1.5 text-xs"
                  />
                ) : (
                  <Input value={f.nombre} onChange={(e) => setF({ nombre: e.target.value, apuId: null })} onBlur={(e) => setF({ nombre: formatearNivel(e.target.value, f.nivel) })} placeholder={f.nivel === "partida" ? "Descripción de la nueva partida" : undefined} autoFocus />
                )}
              </Campo>
              {ventana?.modo === "nuevo" && f.nivel === "partida" && origenPartida === "banco" && catalogo.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">No hay partidas disponibles en el banco.</p>
              )}
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
                  <Input type="number" step="0.0001" min="0" value={f.precio} onChange={(e) => setF({ precio: e.target.value })} />
                </Campo>
              </>
            )}
            {error && <p className="text-xs text-bad sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Boton type="button" variante="linea" onClick={() => setVentana(null)}>Cerrar</Boton>
              <Boton type="submit" disabled={ocupado || (ventana?.modo === "nuevo" && f.nivel === "partida" && origenPartida === "banco" && !f.apuId)}>{ventana?.modo === "nuevo" && f.nivel === "partida" && origenPartida === "banco" ? "Insertar partida" : "Guardar"}</Boton>
            </div>
          </form>
        )}
      </VentanaFlotante>
    </div>
  );
}

