import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input, MenuFiltros, Panel, Vacio } from "@/components/ui-kit";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { Buscador, coincide } from "@/components/Buscador";
import { useAuth } from "@/lib/auth";
import { useMarcas } from "@/lib/datos";
import { formatearTexto } from "@/lib/formato-texto";

const btnIcono =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line text-muted-foreground";
const msgDuplicado = (code: string | undefined, msg: string) =>
  code === "23505" ? "Ya existe un registro con ese nombre." : msg;

export function MarcasPanel() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const { data = [] } = useMarcas();
  const [sel, setSel] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState(false);
  const [textoEdicion, setTextoEdicion] = useState("");
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const puedeGestionar = rol === "administrador" || rol === "gerente";
  const visibles = busqueda.trim() ? data.filter((m) => coincide(busqueda, m.nombre)) : data;
  const seleccionada = visibles.find((m) => m.id === sel);
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["marcas"] });
    qc.invalidateQueries({ queryKey: ["insumos"] });
  };

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = formatearTexto(nuevo, "marca");
    if (!limpio) return;
    setError("");
    const { error: err } = await supabase
      .from("marcas" as never)
      .insert({ nombre: limpio, orden: data.length + 1, activo: true } as never);
    if (err) return setError(msgDuplicado(err.code, err.message));
    setNuevo("");
    setAgregando(false);
    refrescar();
  }

  async function renombrar(e: React.FormEvent) {
    e.preventDefault();
    if (!seleccionada) return;
    const limpio = formatearTexto(textoEdicion, "marca");
    if (!limpio) return;
    if (limpio === seleccionada.nombre) return setEditando(false);
    setError("");
    const { error: err } = await supabase.from("marcas" as never).update({ nombre: limpio } as never).eq("id", seleccionada.id);
    if (err) return setError(msgDuplicado(err.code, err.message));
    setEditando(false);
    refrescar();
  }

  async function eliminar() {
    if (!seleccionada) return;
    setError("");
    if (!window.confirm(`¿Eliminar la marca «${seleccionada.nombre}»? Los materiales que la usan quedarán con "-".`)) return;
    const { error: err } = await supabase.from("marcas" as never).delete().eq("id", seleccionada.id);
    if (err) return setError(err.message);
    setSel("");
    refrescar();
  }

  const abrirEdicion = () => {
    if (!seleccionada) return;
    setTextoEdicion(seleccionada.nombre);
    setAgregando(false);
    setEditando(true);
    setError("");
  };

  return (
    <div className="flex items-start gap-2">
      <Panel
        titulo="Registro de marcas"
        extra={<span className="font-mono text-[10px] text-muted-foreground">{data.length} marcas</span>}
      >
        <p className="border-b border-line px-5 py-3 text-xs text-muted-foreground">
          Marcas de materiales disponibles en el Maestro de insumos.
        </p>
        {puedeGestionar && agregando && (
          <form onSubmit={agregar} className="flex items-center gap-2 border-b border-dashed border-line px-5 py-2">
            <Input
              autoFocus
              value={nuevo}
              data-formato="marca"
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAgregando(false)}
              placeholder="Nombre de la nueva marca"
              maxLength={60}
            />
            <button type="submit" title="Guardar" className={`${btnIcono} hover:border-primary hover:text-primary`}>
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              title="Cancelar"
              className={`${btnIcono} hover:border-bad hover:text-bad`}
            >
              <X size={14} />
            </button>
          </form>
        )}
        {puedeGestionar && editando && seleccionada && (
          <form onSubmit={renombrar} className="flex items-center gap-2 border-b border-dashed border-line px-5 py-2">
            <Input
              autoFocus
              value={textoEdicion}
              data-formato="marca"
              onChange={(e) => setTextoEdicion(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
              placeholder="Nombre de la marca"
              maxLength={60}
            />
            <button type="submit" title="Guardar" className={`${btnIcono} hover:border-primary hover:text-primary`}>
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              title="Cancelar"
              className={`${btnIcono} hover:border-bad hover:text-bad`}
            >
              <X size={14} />
            </button>
          </form>
        )}
        {data.length === 0 ? (
          <Vacio texto="Aún no hay marcas registradas." />
        ) : visibles.length === 0 ? (
          <Vacio texto={`Sin marcas que coincidan con «${busqueda}».`} />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[70%] px-5 py-2 font-medium">Marca</th>
                <th className="w-[30%] px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSel(m.id)}
                  onDoubleClick={puedeGestionar ? () => { setSel(m.id); setTextoEdicion(m.nombre); setAgregando(false); setEditando(true); setError(""); } : undefined}
                  className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === m.id ? "bg-primary/10" : ""}`}
                >
                  <td className="px-5 py-2 font-semibold text-ink">{m.nombre}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.activo ? "Activa" : "Inactiva"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error && <p className="px-5 py-2 font-mono text-xs text-bad">{error}</p>}
      </Panel>
      <BarraIconosHoja
        objeto="marca"
        filtros={<MenuFiltros activos={busqueda.trim() ? 1 : 0} onLimpiar={() => setBusqueda("")}><Buscador valor={busqueda} onChange={setBusqueda} total={visibles.length} placeholder="Buscar por marca..." /></MenuFiltros>}
        haySeleccion={!!seleccionada}
        onAgregar={puedeGestionar ? () => { setEditando(false); setNuevo(""); setAgregando(true); setError(""); } : undefined}
        onEditar={puedeGestionar ? abrirEdicion : undefined}
        onEliminar={puedeGestionar ? eliminar : undefined}
      />
    </div>
  );
}
