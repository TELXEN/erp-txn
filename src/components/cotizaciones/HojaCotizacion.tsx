import type { CSSProperties, ReactNode } from "react";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { fecha as fmtFecha } from "@/lib/format";
import { simboloMoneda, totalesCotizacion, useTipoCambioActual, vigenciaHasta, type Cotizacion, type CotizacionItem } from "@/lib/cotizaciones";

/** Paleta corporativa compartida con la hoja de facturación electrónica. */
const C = { ink: DOC.ink, muted: DOC.ink, line: DOC.line, soft: DOC.soft, green: DOC.green, greenSoft: DOC.white, white: DOC.white };

const ed: CSSProperties = { border: "none", borderBottom: `1px dashed ${C.line}`, background: "transparent", font: "inherit", fontSize: 10.33, color: "inherit", width: "100%", padding: "4px 0", outline: "none" };
const edSel: CSSProperties = { ...ed, cursor: "pointer" };
const liviano = "var(--font-global)";

const money = (sim: string, n: number) => `${sim} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 9.33, color: C.muted, fontFamily: liviano, fontWeight: 600, letterSpacing: ".04em" }}>{titulo}</span>
      <div style={{ marginTop: 7, display: "grid", gap: 7 }}>{children}</div>
    </div>
  );
}
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "112px 1fr", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 8.83, color: C.muted, fontFamily: liviano, fontWeight: 400, textTransform: "uppercase" }}>{etiqueta}</span>
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
  const { data: tcActual = 0 } = useTipoCambioActual();
  const totales = totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad));
  const conIgv = cot.aplica_igv !== false;
  const igv = conIgv ? Math.round(totales.total * 0.18 * 100) / 100 : 0;
  const esUsd = cot.moneda === "USD";
  const sim = simboloMoneda(cot.moneda);
  const tc = Number(cot.tipo_cambio) || tcActual;
  const totalConIgv = totales.total + igv;

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
          fontFamily: DOC_FUENTE_CSS,
          fontWeight: 400,
          fontSize: 12.5,
          boxShadow: "0 12px 35px rgba(15,23,42,.18)",
        }}
      >
        <header style={{ display: "flex", gap: 22, alignItems: "flex-start", borderBottom: `2px solid ${C.green}`, paddingBottom: 14 }}>
          <div style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt="" style={{ maxWidth: 92, maxHeight: 54 }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 9, background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>TX</div>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 76, textAlign: "right", paddingRight: 10 }}>
            <b style={{ fontSize: 16, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN SAC"}</b>
            <div style={{ fontFamily: liviano, fontWeight: 400, fontSize: 11.5, marginTop: 3, lineHeight: 1.3 }}>{empresa?.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL"}</div>
            <div style={{ fontFamily: liviano, fontWeight: 400, fontSize: 12, marginTop: 3, lineHeight: 1.3 }}>{empresa?.direccion || "—"}</div>
            <div style={{ fontFamily: liviano, fontWeight: 400, fontSize: 12, marginTop: 3, lineHeight: 1.3 }}>{empresa?.web || "—"}</div>
          </div>
          <div style={{ width: 248, textAlign: "center", flexShrink: 0 }}>
            <div style={{ background: C.white, border: `1px solid ${C.line}`, borderTop: `4px solid ${C.green}`, borderRadius: 6, padding: "10px 8px" }}>
              <div style={{ fontFamily: liviano, fontSize: 13, fontWeight: 600 }}>COTIZACIÓN</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 5 }}>RUC: {empresa?.ruc || "—"}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{cot.codigo || "—"}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
              REV.
              <input
                key={`rev-${cot.id}-${cot.revision ?? "01"}`}
                defaultValue={cot.revision ?? "01"}
                maxLength={6}
                title="Revisión impresa de la cotización"
                onBlur={(e) => alSalir("revision", e.target.value.trim().toUpperCase() || "01", cot.revision ?? "01")}
                style={{ ...ed, width: 54, textAlign: "left", fontWeight: 700 }}
              />
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr .8fr", gap: 20, background: C.soft, border: `1px solid ${C.line}`, borderLeft: `3px solid ${DOC.accent}`, borderRadius: 6, padding: 16, marginTop: 18, fontSize: 10.33 }}>
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
            <Linea etiqueta="Moneda">
              <select
                value={esUsd ? "USD" : "PEN"}
                onChange={(e) => {
                  const moneda = e.target.value as "PEN" | "USD";
                  void guardar(moneda === "USD" && !Number(cot.tipo_cambio) ? { moneda, tipo_cambio: tcActual || 3.75 } : { moneda });
                }}
                style={edSel}
              >
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </Linea>
            {esUsd && (
              <Linea etiqueta="T. cambio">
                <input
                  key={`tc-${cot.id}-${cot.tipo_cambio}`}
                  type="number"
                  step="0.001"
                  min="0"
                  defaultValue={Number(cot.tipo_cambio) || tcActual || ""}
                  onBlur={(e) => alSalir("tipo_cambio", Number(e.target.value || 0), Number(cot.tipo_cambio))}
                  style={ed}
                />
              </Linea>
            )}
            <Linea etiqueta="IGV">
              <select value={conIgv ? "si" : "no"} onChange={(e) => void guardar({ aplica_igv: e.target.value === "si" })} style={edSel}>
                <option value="si">Con IGV (18%)</option>
                <option value="no">Sin IGV</option>
              </select>
            </Linea>
          </Bloque>
        </div>

        <div style={{ marginTop: 16 }}>{children}</div>

        <div style={{ width: 380, marginLeft: "auto", marginTop: 20, fontSize: 13, background: DOC.total, borderRadius: 6, padding: 6 }}>
          {[
            ["COSTO DIRECTO", money(sim, totales.costoDirecto), false] as const,
          ].map(([t, v]) => (
            <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}><span>{t}</span><span>{v}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Gastos generales
              <input key={`gg-${cot.id}-${cot.pct_gastos_generales}`} type="number" step="0.5" min="0" defaultValue={Number(cot.pct_gastos_generales)} onBlur={(e) => alSalir("pct_gastos_generales", Number(e.target.value || 0), Number(cot.pct_gastos_generales))} style={{ ...ed, width: 58, borderBottom: "none", textAlign: "right" }} />%
            </span>
            <span>{money(sim, totales.gastosGenerales)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Utilidad
              <input key={`ut-${cot.id}-${cot.pct_utilidad}`} type="number" step="0.5" min="0" defaultValue={Number(cot.pct_utilidad)} onBlur={(e) => alSalir("pct_utilidad", Number(e.target.value || 0), Number(cot.pct_utilidad))} style={{ ...ed, width: 58, borderBottom: "none", textAlign: "right" }} />%
            </span>
            <span>{money(sim, totales.utilidad)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}><span>SUBTOTAL</span><span>{money(sim, totales.total)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", borderBottom: `1px solid ${C.line}` }}><span>IGV {conIgv ? "18%" : "0%"}</span><span>{money(sim, igv)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderTop: `1px solid ${DOC.green}`, marginTop: 3, color: DOC.green, fontWeight: 700, fontSize: 13, lineHeight: 1.15 }}>
            <span>IMPORTE TOTAL</span><span>{money(sim, totalConIgv)}</span>
          </div>
          {esUsd && tc > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", color: C.muted, fontSize: 12 }}>
              <span>Equivalente en soles (T.C. {tc.toFixed(3)})</span><span>{money("S/", totalConIgv * tc)}</span>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18, fontSize: 12.5 }}>
          {([
            ["recursos_humanos", "RECURSOS HUMANOS"],
            ["tiempo_ejecucion", "TIEMPO DE EJECUCIÓN"],
            ["condiciones_pago", "CONDICIONES DE PAGO"],
            ["condiciones", "CONDICIONES COMERCIALES"],
          ] as const).map(([campo, etiqueta]) => {
            const valor = String((cot as unknown as Record<string, unknown>)[campo] ?? "");
            return (
              <div key={campo} style={{ borderTop: `3px solid ${C.green}`, padding: 11 }}>
                <b style={{ fontSize: 12, color: C.muted, letterSpacing: ".03em" }}>{etiqueta}</b>
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

        <div style={{ marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 14, fontSize: 12, color: C.muted }}>
          <b>PROPUESTA COMERCIAL</b>
          <div style={{ marginTop: 5 }}>Lo que escribes en esta hoja es exactamente lo que saldrá impreso.</div>
        </div>
      </section>
    </div>
  );
}
