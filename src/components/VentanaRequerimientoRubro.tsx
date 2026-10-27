import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Boton, BotonIcono, Campo, Input, Select, VentanaFlotante } from "@/components/ui-kit";
import { apuDb } from "@/lib/apu";
import { RUBROS_COMPRA, asegurarFichaAlmacen, imputaGastosGenerales, nombreRubro, tipoFichaRubro, useCatalogoRubro, validarRubroUnico, type ArticuloRubro, type RubroCompra } from "@/lib/rubros-compra";

type Linea = ArticuloRubro & { cantidad: string };

/**
 * Requerimiento de un solo rubro (Materiales, Equipos, Herramientas o EPP).
 * Con obra: lo emite el ingeniero y va a Gerencia. Sin obra (`proyectoId` null): Logística pide stock para el Almacén Central.
 */
export function VentanaRequerimientoRubro({ abierta, onCerrar, proyectoId, codigo, subtitulo, onCreado }: {
  abierta: boolean; onCerrar: () => void; proyectoId: string | null; codigo: string; subtitulo: string; onCreado: (msg: string) => void;
}) {
  const [rubro, setRubro] = useState<RubroCompra | "">("");
  const [sel, setSel] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [obs, setObs] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const catalogo = useCatalogoRubro(rubro);

  const cerrar = () => { setRubro(""); setLineas([]); setObs(""); setError(""); setSel(""); onCerrar(); };
  const cambiarRubro = (r: RubroCompra | "") => {
    if (lineas.length && r !== rubro && !window.confirm("Cambiar el rubro quita los artículos ya agregados. ¿Continuar?")) return;
    setRubro(r); setLineas([]); setSel("");
  };
  const agregar = () => {
    const a = catalogo.find((x) => x.clave === sel);
    if (!a) return;
    if (lineas.some((l) => l.clave === a.clave)) return setError("Ese artículo ya está en la lista.");
    setLineas([...lineas, { ...a, cantidad: "1" }]); setSel(""); setError("");
  };

  async function guardar() {
    setError("");
    const msg = validarRubroUnico(rubro, lineas);
    if (msg) return setError(msg);
    const validas = lineas.filter((l) => Number(l.cantidad) > 0);
    if (!validas.length) return setError("Agrega al menos un artículo con cantidad.");
    setGuardando(true);
    try {
      const destino = proyectoId ? (imputaGastosGenerales(rubro) ? " · Gastos Generales" : "") : " · Stock Almacén Central";
      const { data: req, error: e1 } = await apuDb.from("requerimientos").insert({
        proyecto_id: proyectoId, codigo, origen: proyectoId ? "obra" : "stock", clase: rubro === "MAT" ? "materiales" : rubro.toLowerCase(), rubro: rubro as RubroCompra,
        estado: "Enviado a Gerencia", observacion: `${nombreRubro(rubro)}${destino}${obs.trim() ? ` · ${obs.trim()}` : ""}`,
      }).select("id").single();
      if (e1) throw e1;
      const filas = [];
      for (const l of validas) {
        let insumo: string | null = null;
        try { insumo = await asegurarFichaAlmacen(l); } catch { insumo = null; }
        filas.push({ requerimiento_id: req.id, insumo_id: insumo, tipo: tipoFichaRubro(rubro as RubroCompra), descripcion: l.nombre, unidad: l.unidad, cantidad: Number(l.cantidad), precio_referencial: l.precio });
      }
      const { error: e2 } = await apuDb.from("requerimiento_items").insert(filas);
      if (e2) throw e2;
      onCreado(`Requerimiento ${codigo} (${nombreRubro(rubro)}) enviado a Gerencia con ${filas.length} artículos.`);
      cerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally { setGuardando(false); }
  }

  return (
    <VentanaFlotante abierta={abierta} onCerrar={cerrar} titulo={proyectoId ? "Requerimiento por rubro" : "Requerimiento para stock"} subtitulo={subtitulo} ancho="max-w-3xl">
      <form className="grid gap-3 p-5 text-xs" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="¿Qué vas a comprar?">
            <Select autoFocus value={rubro} onChange={(e) => cambiarRubro(e.target.value as RubroCompra | "")}>
              <option value="">Seleccionar rubro…</option>
              {RUBROS_COMPRA.map((r) => <option key={r.id} value={r.id}>{r.texto}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Código">
            <Input value={codigo} disabled />
          </Campo>
        </div>
        {rubro && proyectoId && imputaGastosGenerales(rubro) && <p className="text-muted-foreground">Se imputa a Gastos Generales de la obra; no necesita partida.</p>}
        <div className="flex items-center gap-2">
          <Select className="min-w-0 flex-1" value={sel} disabled={!rubro} onChange={(e) => setSel(e.target.value)}>
            <option value="">{rubro ? `Agregar ${rubro === "EPP" ? "EPP" : nombreRubro(rubro).toLowerCase()} del catálogo…` : "Primero elige el rubro"}</option>
            {catalogo.map((a) => <option key={a.clave} value={a.clave}>{a.nombre} ({a.unidad})</option>)}
          </Select>
          <Boton type="button" variante="linea" disabled={!sel} onClick={agregar}><Plus size={14} className="mr-1 inline" />Agregar</Boton>
        </div>
        {rubro && catalogo.length === 0 && <p className="text-muted-foreground">No hay artículos activos en el catálogo de {nombreRubro(rubro)} (Inventario → Catálogo).</p>}
        {lineas.length > 0 && (
          <table className="w-full font-mono">
            <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground"><th className="py-1">Artículo</th><th className="py-1">Und.</th><th className="py-1 text-right">Cantidad</th><th /></tr></thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={l.clave} className="border-b border-line/40">
                  <td className="py-1">{l.nombre}</td>
                  <td className="py-1 text-muted-foreground">{l.unidad}</td>
                  <td className="py-1 text-right"><Input className="ml-auto h-7 w-24 text-right" type="number" step="any" min={0} value={l.cantidad} onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, cantidad: e.target.value } : x)))} /></td>
                  <td className="py-1 text-right"><BotonIcono tono="peligro" etiqueta="Quitar" onClick={() => setLineas(lineas.filter((_, j) => j !== i))}><Trash2 size={13} /></BotonIcono></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Campo etiqueta="Observación"><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ej.: dotación para personal nuevo" /></Campo>
        {error && <p className="text-bad">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Boton type="button" variante="linea" onClick={cerrar}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}>Enviar a Gerencia</Boton>
        </div>
      </form>
    </VentanaFlotante>
  );
}
