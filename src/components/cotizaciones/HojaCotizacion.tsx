import { EncabezadoCotizacion } from "@/components/cotizaciones/EncabezadoCotizacion";
import { useState, type CSSProperties, type ReactNode } from "react";
import { VentanaFlotante } from "@/components/ui-kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { fecha as fmtFecha } from "@/lib/format";
import { cambiarModoCotizacion, convertirMonedaCotizacion, simboloMoneda, totalesCotizacion, useTipoCambioActual, vigenciaHasta, type Cotizacion, type CotizacionItem } from "@/lib/cotizaciones";
import { useTotalGGHoja } from "@/lib/gastos-generales-total";

/** Paleta corporativa compartida con la hoja de facturación electrónica. */
const C = { ink: DOC.ink, muted: DOC.ink, line: DOC.line, soft: DOC.soft, green: DOC.green, greenSoft: DOC.white, white: DOC.white };

const ed: CSSProperties = { border: "none", borderBottom: `1px dashed ${C.line}`, background: "transparent", font: "inherit", fontSize: 10.5, color: "inherit", width: "100%", padding: "4px 0", outline: "none" };
const edSel: CSSProperties = { ...ed, cursor: "pointer" };
const liviano = "var(--font-global)";

const money = (sim: string, n: number) => `${sim} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Eslogan en dos líneas: se corta en la primera coma. */
function esloganDosLineas(texto: string): ReactNode {
  const i = texto.indexOf(",");
  if (i < 0 || i >= texto.length - 1) return texto;
  return (
    <>
      {texto.slice(0, i + 1)}
      <br />
      {texto.slice(i + 1).trim()}
    </>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 11, color: C.muted, fontFamily: liviano, fontWeight: 600, letterSpacing: ".04em" }}>{titulo}</span>
      <div style={{ marginTop: 7, display: "grid", gap: 7 }}>{children}</div>
    </div>
  );
}
function Linea({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "112px 1fr", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 9.5, color: C.muted, fontFamily: liviano, fontWeight: 400, textTransform: "uppercase" }}>{etiqueta}</span>
      {children}
    </label>
  );
}

function TituloBloque({ titulo, color }: { titulo: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
      <span aria-hidden="true" style={{ width: 4, height: 22, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 10.5, color: C.ink, fontFamily: liviano, fontWeight: 700, textTransform: "uppercase" }}>{titulo}</span>
    </div>
  );
}

function EtiquetaCampo({ children }: { children: ReactNode }) {
  return <span style={{ display: "block", marginBottom: 5, fontSize: 9, color: DOC.mute, fontFamily: liviano, fontWeight: 700, textTransform: "uppercase" }}>{children}</span>;
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
  mostrarEncabezado = true,
  ventanaEncabezado,
}: {
  cot: Cotizacion;
  items: CotizacionItem[];
  clientes: { id: string; razon_social: string; numero_documento: string }[];
  children: ReactNode;
  /** En modo edición se oculta el encabezado corporativo y la ficha de cliente. */
  mostrarEncabezado?: boolean;
  /** Si se indica, el encabezado se edita en una ventana flotante en vez de en la hoja. */
  ventanaEncabezado?: { abierta: boolean; onCerrar: () => void };
}) {
  const [condicionesAbiertas, setCondicionesAbiertas] = useState(false);
  const [consultaRuc, setConsultaRuc] = useState("");
  const qc = useQueryClient();
  const { data: empresa } = useEmpresa();
  const { data: tcActual = 0 } = useTipoCambioActual();
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const multi = Boolean(cot.multidisciplinaria);

  async function cambiarModo(nuevo: boolean) {
    if (nuevo === multi) return;
    let esp = "";
    if (nuevo) {
      const opciones = especialidades.filter((e) => e.activo).map((e) => e.nombre);
      esp = (window.prompt(`Especialidad para las partidas actuales:\n${opciones.join(", ")}`, opciones[0] ?? "") ?? "").trim();
      if (!esp) return;
    } else if (!window.confirm("La hoja se reagrupará por Suministro / Montaje y se dejará de mostrar la especialidad. ¿Continuar?")) return;
    await cambiarModoCotizacion(cot.id, nuevo, esp);
    await qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    await qc.invalidateQueries({ queryKey: ["cotizacion_items"] });
  }
  const totales = totalesCotizacion(items, Number(cot.pct_gastos_generales), Number(cot.pct_utilidad), useTotalGGHoja(cot.id));
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
    <div style={{ overflowX: "auto", padding: mostrarEncabezado ? "18px 0" : 0, background: C.soft }}>
      <section
        style={{
          width: "100%", maxWidth: 1500, boxSizing: "border-box",
          margin: "0 auto",
          padding: mostrarEncabezado ? "36px 38px" : "0 8px 8px",
          background: C.white,
          color: C.ink,
          fontFamily: DOC_FUENTE_CSS,
          fontWeight: 400,
          fontSize: 12.5,
          boxShadow: mostrarEncabezado ? "0 12px 35px rgba(15,23,42,.18)" : "none",
        }}
      >
        {(ventanaEncabezado ? ventanaEncabezado.abierta : mostrarEncabezado) && (
          <EnvolturaEncabezado ventana={ventanaEncabezado}>
        <EncabezadoCotizacion cot={cot} editable clientes={clientes} />
          </EnvolturaEncabezado>
        )}

        <div style={{ marginTop: mostrarEncabezado ? 16 : 0 }}>{children}</div>


        {children && <div style={{ marginTop: 18 }}>
          <button type="button" onClick={() => setCondicionesAbiertas(true)} className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-background px-3 text-xs font-medium hover:bg-muted">
            Condiciones de la propuesta (recursos humanos, tiempo, pago y comerciales)
          </button>
        </div>}
        <Dialog open={condicionesAbiertas} onOpenChange={setCondicionesAbiertas}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Condiciones de la propuesta</DialogTitle></DialogHeader>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 4, fontSize: 10.5 }}>
              {([
                ["recursos_humanos", "RECURSOS HUMANOS"],
                ["tiempo_ejecucion", "TIEMPO DE EJECUCIÓN"],
                ["condiciones_pago", "CONDICIONES DE PAGO"],
                ["condiciones", "CONDICIONES COMERCIALES"],
              ] as const).map(([campo, etiqueta]) => {
                const valor = String((cot as unknown as Record<string, unknown>)[campo] ?? "");
                return (
                  <div key={campo} style={{ borderTop: `3px solid ${C.green}`, padding: 11 }}>
                    <b style={{ fontSize: 11, color: C.muted, letterSpacing: ".03em" }}>{etiqueta}</b>
                    <textarea
                      key={`${cot.id}-${campo}-${valor}`}
                      rows={5}
                      defaultValue={valor}
                      placeholder="Una línea por punto"
                      onBlur={(e) => alSalir(campo, e.target.value.trim(), valor)}
                      style={{ ...ed, marginTop: 4, resize: "vertical", borderBottom: "none" }}
                    />
                  </div>
                );
              })}
            </div>

          </DialogContent>
        </Dialog>

        {children && <div style={{ marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 14, fontSize: 10.5, color: C.muted }}>
          <b>PROPUESTA COMERCIAL</b>
          <div style={{ marginTop: 5 }}>Lo que escribes en esta hoja es exactamente lo que saldrá impreso.</div>
        </div>}
      </section>
    </div>
  );
}

function EnvolturaEncabezado({ ventana, children }: { ventana?: undefined | { abierta: boolean; onCerrar: () => void }; children: ReactNode }) {
  if (!ventana) return <>{children}</>;
  return (
    <VentanaFlotante titulo="Encabezado de la cotización" subtitulo="Los cambios se guardan al salir de cada campo" abierta={ventana.abierta} onCerrar={ventana.onCerrar} ancho="max-w-6xl" superpuesta>
      <div style={{ background: C.white, color: C.ink, fontFamily: DOC_FUENTE_CSS, fontSize: 12.5, padding: "20px 24px" }}>{children}</div>
    </VentanaFlotante>
  );
}
