import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Input, Panel, SinAcceso, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { usePartidas, useProyectos } from "@/lib/datos";
import { soles } from "@/lib/format";
import { useSolicitudesDesbloqueo, useToleranciaAvance } from "@/lib/sobrecosto";
import { useItemsReq, useRequerimientos } from "@/lib/logistica";

export const Route = createFileRoute("/_authenticated/aprobaciones")({
  head: () => ({
    meta: [
      { title: "Aprobaciones de desbloqueo — TELXEN ERP" },
      { name: "description", content: "Gerencia aprueba o rechaza compras bloqueadas por sobrecosto." },
      { property: "og:title", content: "Aprobaciones de desbloqueo — TELXEN ERP" },
      { property: "og:description", content: "Gerencia aprueba o rechaza compras bloqueadas por sobrecosto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aprobaciones,
});

const db = supabase as unknown as { from: (t: string) => any };

function Aprobaciones() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: solicitudes = [] } = useSolicitudesDesbloqueo();
  const { data: proyectos = [] } = useProyectos();
  const { data: partidas = [] } = usePartidas();
  const { data: tolerancia = 15 } = useToleranciaAvance();
  const [tol, setTol] = useState("15");
  const [msg, setMsg] = useState("");
  useEffect(() => setTol(String(tolerancia)), [tolerancia]);
  const { data: reqs = [] } = useRequerimientos();
  const { data: itemsReq = [] } = useItemsReq();
  const [verReq, setVerReq] = useState<string | null>(null);

  if (rol !== "gerente" && rol !== "administrador") return <SinAcceso />;

  const reqPendientes = reqs.filter((r) => r.estado === "Enviado a Gerencia");
  async function resolverReq(id: string, aprobar: boolean) {
    let motivo = "";
    if (!aprobar) {
      motivo = window.prompt("Motivo del rechazo") ?? "";
      if (!motivo.trim()) return;
    }
    const { error } = await db.from("requerimientos").update({ estado: aprobar ? "Aprobado" : "Rechazado", motivo_rechazo: motivo.trim() }).eq("id", id);
    setMsg(error ? error.message : aprobar ? "Requerimiento aprobado: pasó a la Bandeja de Requerimientos de Logística." : "Requerimiento rechazado.");
    qc.invalidateQueries({ queryKey: ["requerimientos"] });
    qc.invalidateQueries({ queryKey: ["aprobaciones-pendientes"] });
  }

  const obra = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : "—";
  };
  const partida = (id: string | null) => {
    const p = partidas.find((x) => x.id === id);
    return p ? `${p.codigo ?? ""} ${p.nombre}`.trim() : "—";
  };

  async function resolver(id: string, aprobar: boolean) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("solicitudes_desbloqueo").update({
      estado: aprobar ? "Aprobada" : "Rechazada",
      resuelto_por: u.user?.id,
      resuelto_en: new Date().toISOString(),
      vence_en: aprobar ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null,
    }).eq("id", id);
    setMsg(error ? error.message : aprobar ? "Aprobada: la compra puede registrarse una vez en las próximas 48 h." : "Solicitud rechazada.");
    qc.invalidateQueries({ queryKey: ["solicitudes_desbloqueo"] });
    qc.invalidateQueries({ queryKey: ["aprobaciones-pendientes"] });
  }

  async function guardarTol() {
    const { error } = await db.from("control_sobrecosto").upsert({ id: true, tolerancia_pct: Number(tol) || 0, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Tolerancia actualizada.");
    qc.invalidateQueries({ queryKey: ["control_sobrecosto"] });
  }

  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente");
  const historial = solicitudes.filter((s) => s.estado !== "Pendiente");
  const color: Record<string, string> = { Aprobada: "bg-good/10 text-good", Usada: "bg-muted text-muted-foreground", Rechazada: "bg-bad/10 text-bad" };

  return (
    <div className="font-sans">
      <Encabezado titulo="Aprobaciones" subtitulo="Compras bloqueadas por sobrecosto (avance físico + tolerancia)" />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-4 text-xs">
          <label className="w-40"><span className="mb-1 block font-semibold uppercase text-muted-foreground">Tolerancia (%)</span>
            <Input type="number" min={0} max={100} step="0.5" value={tol} onChange={(e) => setTol(e.target.value)} className="h-9" /></label>
          <Boton onClick={guardarTol}>Guardar</Boton>
          <p className="text-muted-foreground">Límite de compra por partida = presupuesto × (avance físico % + tolerancia %).</p>
          {msg && <p className="ml-auto text-primary">{msg}</p>}
        </div>
      </Panel>

      <Panel titulo={`Requerimientos de obra por aprobar (${reqPendientes.length})`} className="mb-4">
        {reqPendientes.length === 0 ? <Vacio texto="No hay requerimientos enviados a Gerencia." /> : (
          <div className="divide-y divide-line">
            {reqPendientes.map((r) => {
              const its = itemsReq.filter((i) => i.requerimiento_id === r.id);
              const tdr = (r as { clase?: string; tdr?: { tipo?: string; alcance?: string; entregables?: string; plazo?: string } });
              return (
                <div key={r.id} className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setVerReq(verReq === r.id ? null : r.id)}>
                      <p className="font-semibold text-ink">{r.codigo} · {obra(r.proyecto_id)}</p>
                      <p className="text-muted-foreground">{tdr.clase === "tdr" ? `Términos de referencia · ${tdr.tdr?.tipo ?? ""}` : "Materiales del APU"} · {its.length} ítem(s) · {r.fecha} · {r.observacion}</p>
                    </button>
                    <p className="text-sm font-bold tabular-nums text-ink">{soles(its.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_referencial), 0))}</p>
                    {rol === "gerente" ? (
                      <>
                        <Boton onClick={() => resolverReq(r.id, true)}><Check size={13} /> Aprobar</Boton>
                        <Boton variante="linea" onClick={() => resolverReq(r.id, false)}><X size={13} /> Rechazar</Boton>
                      </>
                    ) : <span className="text-muted-foreground">Solo Gerencia aprueba</span>}
                  </div>
                  {verReq === r.id && (
                    <table className="mt-2 w-full font-mono text-[11px]">
                      <tbody>
                        {its.map((i) => (
                          <tr key={i.id} className="border-t border-line/30">
                            <td className="py-1">{i.descripcion}</td>
                            <td className="py-1 text-muted-foreground">{i.unidad}</td>
                            <td className="py-1 text-right">{Number(i.cantidad).toLocaleString("es-PE", { maximumFractionDigits: 4 })}</td>
                            <td className="py-1 text-right">{soles(Number(i.cantidad) * Number(i.precio_referencial))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {verReq === r.id && tdr.clase === "tdr" && (
                    <p className="mt-1 text-muted-foreground">Alcance: {tdr.tdr?.alcance || "—"} · Entregables: {tdr.tdr?.entregables || "—"} · Plazo: {tdr.tdr?.plazo || "—"}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel titulo={`Desbloqueos pendientes (${pendientes.length})`} className="mb-4">
        {pendientes.length === 0 ? <Vacio texto="No hay solicitudes pendientes." /> : (
          <div className="divide-y divide-line">
            {pendientes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{obra(s.proyecto_id)} · {s.partida_id ? partida(s.partida_id) : s.rubro}</p>
                  <p className="text-muted-foreground">{s.rubro} · {s.descripcion || "—"} · {s.proveedor || "sin proveedor"} · {new Date(s.created_at).toLocaleString("es-PE")}</p>
                  {s.motivo && <p className="mt-0.5 italic text-ink/80">«{s.motivo}»</p>}
                </div>
                <p className="text-sm font-bold tabular-nums text-ink">{soles(s.monto)}</p>
                <Boton onClick={() => resolver(s.id, true)}><Check size={13} /> Aprobar</Boton>
                <Boton variante="linea" onClick={() => resolver(s.id, false)}><X size={13} /> Rechazar</Boton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel titulo="Historial">
        {historial.length === 0 ? <Vacio texto="Sin historial." /> : (
          <div className="divide-y divide-line">
            {historial.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color[s.estado] ?? ""}`}>{s.estado}</span>
                <p className="min-w-0 flex-1 truncate text-ink">{obra(s.proyecto_id)} · {s.partida_id ? partida(s.partida_id) : s.rubro} · {s.descripcion}</p>
                <p className="tabular-nums">{soles(s.monto)}</p>
                <p className="text-muted-foreground">{s.resuelto_en ? new Date(s.resuelto_en).toLocaleDateString("es-PE") : ""}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
