import type { CSSProperties, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { fecha as fmtFecha } from "@/lib/format";
import { totalesCotizacion, vigenciaHasta, type Cotizacion, type CotizacionItem } from "@/lib/cotizaciones";

/** Paleta corporativa compartida con la hoja de facturación electrónica. */
const C = { ink: "#000000", muted: "#000000", line: "#cbd5e1", soft: "#f8fafc", green: "#047857", greenSoft: "#ecfdf5", white: "#ffffff" };

const ed: CSSProperties = { border: "none", borderBottom: `1px dashed ${C.line}`, background: "transparent", font: "inherit", fontSize: 13, color: "inherit", width: "100%", padding: "4px 0", outline: "none" };
const edSel: CSSProperties = { ...ed, cursor: "pointer" };
const liviano = '"Calibri Light", Calibri, Carlito, sans-serif';

const money = (n: number) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 12, color: C.muted, fontFamily: liviano, fontWeight: 600, letterSpacing: ".04em" }}>{titulo}</span>
      <div style={{ marginTop: 7, display: "grid", gap: 7 }}>{children}</div>
    </div>
  );
}
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "112px 1fr", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11.5, color: C.muted, fontFamily: liviano, fontWeight: 400, textTransform: "uppercase" }}>{etiqueta}</span>
      {children}
    </label>
  );
}

/**
 * Hoja A4 editable de la cotización: mismo formato corporativo del comprobante
 * electrónico. Cada campo guarda directamente en la cotización al salir del foco.
 */
export function HojaCotizacion({
  cot,
  items,
  clientes,
  children,
}: {
  cot: Cotizacion;
  items: CotizacionItem[];
  clientes: { id: string; razon_social: string }[];
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const { data: empresa } = useEmpresa();
  const totales = totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad));
  const conIgv = cot.aplica_igv !== false;
  const igv = conIgv ? Math.round(totales.total * 0.18 * 100) / 100 : 0;

  async function guardar(campos: Record<string, unknown>) {
    await supabase.from("cotizaciones").update(campos as never).eq("id", cot.id);
    await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    await qc.invalidateQueries({ queryKey: ["cotizacion"] });
  }
  const alSalir = (campo: string, valor: unknown, actual: unknown) => {
    if (String(valor ?? "") === String(actual ?? "")) return;
    void guardar({ [campo]: valor });
  };

  return (
    <div style={{ overflowX: "auto", padding: "18px 0", background: C.soft }}>
      <section
        style={{
          width: "100%", maxWidth: 1500, boxSizing: "border-box",
          margin: "0 auto",
          padding: "36px 38px",
          background: C.white,
          color: C.ink,
          fontFamily: 'Calibri, Carlito, "Segoe UI", sans-serif',
          fontWeight: 400,
          fontSize: 12.5,
          boxShadow: "0 12px 35px rgba(15,23,42,.18)",
        }}
      >
        <header style={{ display: "flex", gap: 22, alignItems: "flex-start", borderBottom: `3px solid ${C.green}`, paddingBottom: 14 }}>
          <div style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt="" style={{ maxWidth: 92, maxHeight: 54 }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 9, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>TX</div>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 76, textAlign: "right", paddingRight: 10 }}>
            <b style={{ fontSize: 11, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN SAC"}</b>
            <div style={{ fontFamily: liviano, fontWeight: 300, fontSize: 8, marginTop: 2, lineHeight: 1.15 }}>{empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"}</div>
            <div style={{ fontFamily: liviano, fontWeight: 300, fontSize: 8.5, marginTop: 2, lineHeight: 1.15 }}>{empresa?.direccion || "—"}</div>
            <div style={{ fontFamily: liviano, fontWeight: 300, fontSize: 8.5, marginTop: 2, lineHeight: 1.15 }}>{empresa?.web || "—"}</div>
          </div>
          <div style={{ width: 248, textAlign: "center", flexShrink: 0 }}>
            <div style={{ background: C.greenSoft, borderTop: `4px solid ${C.green}`, borderRadius: 5, padding: "10px 8px" }}>
              <div style={{ fontFamily: liviano, fontSize: 10, fontWeight: 300 }}>COTIZACIÓN</div>
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4 }}>RUC: {empresa?.ruc || "—"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{cot.codigo || "—"}</div>
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 4, display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
              REV.
              <input
                key={`rev-${cot.id}-${cot.revision ?? "01"}`}
                defaultValue={cot.revision ?? "01"}
                maxLength={6}
                title="Revisión impresa de la cotización"
                onBlur={(e) => alSalir("revision", e.target.value.trim().toUpperCase() || "01", cot.revision ?? "01")}
                style={{ ...ed, width: 44, textAlign: "left", fontWeight: 700 }}
              />
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr .8fr", gap: 16, background: C.soft, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: 13, marginTop: 17, fontSize: 10 }}>
          <Bloque titulo="CLIENTE">
            <Linea etiqueta="Registrado">
              <select
                value={cot.cliente_id ?? ""}
                onChange={(e) => {
                  const c = clientes.find((x) => x.id === e.target.value);
                  void guardar({ cliente_id: e.target.value || null, cliente: c?.razon_social ?? cot.cliente });
                }}
                style={edSel}
              >
                <option value="">Cliente no registrado</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.razon_social}</option>
                ))}
              </select>
            </Linea>
            <Linea etiqueta="Razón social">
              <input key={`cli-${cot.id}-${cot.cliente}`} defaultValue={cot.cliente} onBlur={(e) => alSalir("cliente", e.target.value.trim(), cot.cliente)} style={{ ...ed, fontWeight: 700 }} />
            </Linea>
            <Linea etiqueta="Ubicación">
              <input key={`ubi-${cot.id}-${cot.ubicacion}`} defaultValue={cot.ubicacion} onBlur={(e) => alSalir("ubicacion", e.target.value.trim(), cot.ubicacion)} style={ed} />
            </Linea>
          </Bloque>
          <Bloque titulo="TRABAJO A COTIZAR">
            <Linea etiqueta="Descripción">
              <input key={`nom-${cot.id}-${cot.nombre}`} defaultValue={cot.nombre} onBlur={(e) => alSalir("nombre", e.target.value.trim(), cot.nombre)} style={{ ...ed, fontWeight: 700 }} />
            </Linea>
            <Linea etiqueta="Validez (días)">
              <input key={`val-${cot.id}-${cot.validez_dias}`} type="number" min="1" defaultValue={Number(cot.validez_dias)} onBlur={(e) => alSalir("validez_dias", Number(e.target.value || 0), Number(cot.validez_dias))} style={ed} />
            </Linea>
            <Linea etiqueta="Vigente hasta">
              <span style={{ fontWeight: 700 }}>{fmtFecha(vigenciaHasta(cot.fecha_emision, Number(cot.validez_dias)))}</span>
            </Linea>
          </Bloque>
          <Bloque titulo="">
            <Linea etiqueta="Emisión">
              <input key={`fec-${cot.id}-${cot.fecha_emision}`} type="date" defaultValue={cot.fecha_emision} onBlur={(e) => alSalir("fecha_emision", e.target.value, cot.fecha_emision)} style={ed} />
            </Linea>
            <Linea etiqueta="Moneda"><span style={{ fontWeight: 700 }}>Soles (PEN)</span></Linea>
            <Linea etiqueta="IGV">
              <select value={conIgv ? "si" : "no"} onChange={(e) => void guardar({ aplica_igv: e.target.value === "si" })} style={edSel}>
                <option value="si">Con IGV (18%)</option>
                <option value="no">Sin IGV</option>
              </select>
            </Linea>
          </Bloque>
        </div>

        <div style={{ marginTop: 16 }}>{children}</div>

        <div style={{ width: 320, marginLeft: "auto", marginTop: 18, fontSize: 10 }}>
          {[
            ["COSTO DIRECTO", money(totales.costoDirecto), false] as const,
          ].map(([t, v]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px", borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}><span>{t}</span><span>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Gastos generales
              <input key={`gg-${cot.id}-${cot.pct_gastos_generales}`} type="number" step="0.5" min="0" defaultValue={Number(cot.pct_gastos_generales)} onBlur={(e) => alSalir("pct_gastos_generales", Number(e.target.value || 0), Number(cot.pct_gastos_generales))} style={{ ...ed, width: 48, borderBottom: "none", textAlign: "right" }} />%
            </span>
            <span>{money(totales.gastosGenerales)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Utilidad
              <input key={`ut-${cot.id}-${cot.pct_utilidad}`} type="number" step="0.5" min="0" defaultValue={Number(cot.pct_utilidad)} onBlur={(e) => alSalir("pct_utilidad", Number(e.target.value || 0), Number(cot.pct_utilidad))} style={{ ...ed, width: 48, borderBottom: "none", textAlign: "right" }} />%
            </span>
            <span>{money(totales.utilidad)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px", borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}><span>SUBTOTAL</span><span>{money(totales.total)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px", borderBottom: `1px solid ${C.line}` }}><span>IGV {conIgv ? "18%" : "0%"}</span><span>{money(igv)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: 11, border: "1.4px solid #006648", borderRadius: 6, marginTop: 4, color: "#006648", fontWeight: 700, fontSize: 12 }}>
            <span>IMPORTE TOTAL</span><span>{money(totales.total + igv)}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, fontSize: 9.5 }}>
          {([
            ["recursos_humanos", "RECURSOS HUMANOS"],
            ["tiempo_ejecucion", "TIEMPO DE EJECUCIÓN"],
            ["condiciones_pago", "CONDICIONES DE PAGO"],
            ["condiciones", "CONDICIONES COMERCIALES"],
          ] as const).map(([campo, etiqueta]) => {
            const valor = String((cot as unknown as Record<string, unknown>)[campo] ?? "");
            return (
              <div key={campo} style={{ borderTop: `3px solid ${C.green}`, padding: 11 }}>
                <b style={{ fontSize: 8, color: C.muted }}>{etiqueta}</b>
                <textarea
                  key={`${cot.id}-${campo}-${valor}`}
                  rows={3}
                  defaultValue={valor}
                  placeholder="Una línea por punto"
                  onBlur={(e) => alSalir(campo, e.target.value.trim(), valor)}
                  style={{ ...ed, marginTop: 4, resize: "vertical", borderBottom: "none" }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, borderTop: `1px solid ${C.line}`, paddingTop: 12, fontSize: 9, color: C.muted }}>
          <b>PROPUESTA COMERCIAL</b>
          <div style={{ marginTop: 5 }}>Lo que escribes en esta hoja es exactamente lo que saldrá impreso.</div>
        </div>
      </section>
    </div>
  );
}
