import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Boton, Input } from "@/components/ui-kit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { rpc: (f: string, a: object) => any };

type Ficha = {
  compras: { fecha: string; codigo: string; proveedor: string | null; cantidad: number; precio: number; estado: string }[];
  promedio: number | null;
  cantidad_total: number;
  num_ordenes: number;
  consumo: { mes: string; cantidad: number; monto: number }[];
  modificaciones: { fecha: string; usuario: string | null }[];
  aprobaciones: { fecha: string; accion: string; motivo: string | null; usuario: string | null }[];
  creador: { fecha: string; usuario: string | null } | null;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
const num = (n: number, d = 2) => Number(n ?? 0).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });
const fecha = (f: string) => new Date(f.length <= 10 ? `${f}T12:00:00` : f).toLocaleDateString("es-PE");
const fechaHora = (f: string) => new Date(f).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

export const useFichaInsumo = (id: string | undefined) =>
  useQuery({
    queryKey: ["ficha_insumo", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await db.rpc("ficha_insumo", { _id: id });
      if (error) throw error;
      return data as Ficha;
    },
  });

const titulo = "mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** Historial de solo lectura de la ficha: compras, consumo, autoría y aprobaciones. */
export function FichaInsumoHistorial({ id, precioBase, estado }: { id: string; precioBase: number; estado: string }) {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const aprueba = rol === "administrador" || rol === "gerente";
  const { data: f, isLoading } = useFichaInsumo(id);
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");

  async function decidir(aprobar: boolean) {
    setAviso("");
    const { error } = await db.rpc("aprobar_insumo", { _id: id, _aprobar: aprobar, _motivo: motivo });
    if (error) return setAviso(error.message);
    setMotivo("");
    qc.invalidateQueries({ queryKey: ["ficha_insumo", id] });
    qc.invalidateQueries({ queryKey: ["insumo_ficha_extra"] });
    qc.invalidateQueries({ queryKey: ["insumos_estado"] });
  }

  if (isLoading || !f) return <p className="px-5 pb-4 text-xs text-muted-foreground">Cargando historial…</p>;
  const desv = f.promedio && precioBase > 0 ? ((f.promedio - precioBase) / precioBase) * 100 : null;
  const totalCons = f.consumo.reduce((s, c) => s + Number(c.cantidad), 0);
  const totalMonto = f.consumo.reduce((s, c) => s + Number(c.monto), 0);

  return (
    <div className="grid gap-4 border-t border-line px-5 py-4 lg:grid-cols-2">
      <section>
        <p className={titulo}>Últimas órdenes de compra</p>
        <div className="rounded-md border border-line">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left label-mono">
              <th className="px-2 py-0.5">Fecha</th><th className="px-2 py-0.5">N.º OC</th><th className="px-2 py-0.5">Proveedor</th>
              <th className="px-2 py-0.5 text-right">Cant.</th><th className="px-2 py-0.5 text-right">P.U. S/</th>
            </tr></thead>
            <tbody>
              {f.compras.length === 0 && <tr><td colSpan={5} className="px-2 py-2 text-muted-foreground">Sin compras registradas.</td></tr>}
              {f.compras.map((c, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-0.5">{fecha(c.fecha)}</td><td className="px-2 py-0.5 font-mono">{c.codigo}</td>
                  <td className="max-w-[9rem] truncate px-2 py-0.5" title={c.proveedor ?? ""}>{c.proveedor ?? "—"}</td>
                  <td className="px-2 py-0.5 text-right">{num(c.cantidad)}</td><td className="px-2 py-0.5 text-right">{num(c.precio, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>Precio promedio: <b>{f.promedio != null ? `S/ ${num(f.promedio, 4)}` : "—"}</b></span>
          <span>Comprado: <b>{num(f.cantidad_total)}</b> en {f.num_ordenes} OC</span>
          {desv != null && Math.abs(desv) > 10 && <span className="text-destructive">{desv > 0 ? "+" : ""}{num(desv)}% vs precio base</span>}
        </div>
      </section>

      <section>
        <p className={titulo}>Consumo de los últimos 6 meses</p>
        <div className="rounded-md border border-line">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left label-mono">
              <th className="px-2 py-0.5">Mes</th><th className="px-2 py-0.5 text-right">Cantidad</th><th className="px-2 py-0.5 text-right">Monto S/</th>
            </tr></thead>
            <tbody>
              {f.consumo.map((c) => { const [a, m] = c.mes.split("-"); return (
                <tr key={c.mes} className="border-b border-line/60"><td className="px-2 py-0.5">{MESES[Number(m) - 1]} {a}</td>
                  <td className="px-2 py-0.5 text-right">{num(c.cantidad)}</td><td className="px-2 py-0.5 text-right">{num(c.monto)}</td></tr>
              ); })}
              <tr className="font-semibold"><td className="px-2 py-0.5">Total</td><td className="px-2 py-0.5 text-right">{num(totalCons)}</td><td className="px-2 py-0.5 text-right">{num(totalMonto)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="text-xs">
        <p className={titulo}>Registro</p>
        <p>Creado por: {f.creador ? <><b>{f.creador.usuario ?? "—"}</b> · {fechaHora(f.creador.fecha)}</> : <span className="text-muted-foreground">Creador no registrado</span>}</p>
        {f.modificaciones.length === 0 ? <p className="text-muted-foreground">Sin modificaciones registradas.</p> :
          f.modificaciones.map((m, i) => <p key={i}>Modificado por: <b>{m.usuario ?? "—"}</b> · {fechaHora(m.fecha)}</p>)}
      </section>

      <section className="text-xs">
        <p className={titulo}>Aprobación de ingreso · <span className={estado === "Aprobado" ? "text-primary" : estado === "Rechazado" ? "text-destructive" : "text-foreground"}>{estado}</span></p>
        {f.aprobaciones.length === 0 && <p className="text-muted-foreground">Insumo registrado antes del control de aprobaciones.</p>}
        {f.aprobaciones.map((a, i) => (
          <p key={i}><b>{a.accion}</b> por {a.usuario ?? "—"} · {fechaHora(a.fecha)}{a.motivo ? ` — ${a.motivo}` : ""}</p>
        ))}
        {aprueba && estado !== "Aprobado" && (
          <div className="mt-2 flex items-center gap-2">
            <Input className="h-7 flex-1" placeholder="Motivo (obligatorio para rechazar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <Boton type="button" className="py-1" onClick={() => void decidir(true)}>Aprobar</Boton>
            {estado !== "Rechazado" && <Boton type="button" variante="linea" className="py-1" onClick={() => void decidir(false)}>Rechazar</Boton>}
          </div>
        )}
        {aviso && <p className="mt-1 text-destructive">{aviso}</p>}
      </section>
    </div>
  );
}
