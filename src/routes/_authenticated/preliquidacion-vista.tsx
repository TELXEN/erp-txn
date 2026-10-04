import { createFileRoute, Link } from "@tanstack/react-router";
import { DOC, DOC_ALIAS, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Link2 } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton, Panel, Vacio } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { calcularMontos, type Preliquidacion, type TipoTributario } from "@/components/Preliquidaciones";
import { descargarPreliquidacionPdf } from "@/components/PreliquidacionPdf";

export const Route = createFileRoute("/_authenticated/preliquidacion-vista")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? search["id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Vista previa de preliquidación — ERP TELXEN" },
      { name: "description", content: "Previsualización del documento de preliquidación con detracciones y datos de cobro." },
      { property: "og:title", content: "Vista previa de preliquidación — ERP TELXEN" },
      { property: "og:description", content: "Documento comercial de preliquidación listo para descargar en PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaPreliquidacion,
});

/** Paleta del documento (misma del PDF: esmeralda + pizarra). */
const C = DOC_ALIAS;


const F = (v: string) => {
  if (!v) return "—";
  const [a, m, d] = v.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : v;
};
const N = (v: number, dec = 2) =>
  Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec });

type ItemFila = { id: string; descripcion: string; unidad: string; cantidad: number; precio_unitario: number };
type CuentaBanco = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

/** Separa el ítem jerárquico (01.02.01) de la descripción y lo vuelve código compacto (010201). */
export function separarCodigo(descripcion: string) {
  const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(descripcion || "");
  if (!m || !m[1] || !m[2]) return { codigo: "", texto: (descripcion || "").trim() };
  return {
    codigo: m[1].split(".").map((p) => p.padStart(2, "0")).join(""),
    texto: m[2].trim(),
  };
}


function VistaPreliquidacion() {
  const { id } = Route.useSearch();
  const { data: empresa, isLoading: cargandoEmpresa } = useEmpresa();
  const { fuente } = useFuenteDocumento();
  const [pdfCargando, setPdfCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { data: pl, isLoading: cargandoPl } = useQuery({
    queryKey: ["preliquidacion", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("preliquidaciones").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Preliquidacion | null;
    },
  });

  const { data: lineas = [], isLoading: cargandoItems } = useQuery({
    queryKey: ["preliquidacion_items", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preliquidacion_items")
        .select("id, descripcion, unidad, cantidad, precio_unitario")
        .eq("preliquidacion_id", id)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as ItemFila[];
    },
  });

  const { data: cliente } = useQuery({
    queryKey: ["tercero-preliquidacion", pl?.cliente_id],
    enabled: Boolean(pl?.cliente_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terceros")
        .select("razon_social, numero_documento, direccion")
        .eq("id", pl?.cliente_id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: proyecto } = useQuery({
    queryKey: ["proyecto-preliquidacion", pl?.proyecto_id],
    enabled: Boolean(pl?.proyecto_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("nombre, codigo").eq("id", pl?.proyecto_id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cuentas = [] } = useQuery({
    queryKey: ["bancos", "cuentas-cobro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bancos")
        .select("nombre, numero_cuenta, cci, tipo_cuenta, monedas, activo")
        .eq("activo", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CuentaBanco[];
    },
  });

  const cargando = cargandoPl || cargandoItems || cargandoEmpresa;

  if (cargando) {
    return (
      <Panel titulo="Vista previa de preliquidación">
        <div className="p-6 font-mono text-xs text-muted-foreground">Cargando documento…</div>
      </Panel>
    );
  }

  if (!id || !pl) {
    return (
      <Panel titulo="Vista previa de preliquidación">
        <div className="p-5"><Vacio texto="Selecciona una preliquidación registrada para visualizarla." /></div>
        <div className="border-t border-line p-4">
          <Link to="/valorizaciones"><Boton variante="linea"><ArrowLeft size={13} /> Volver a facturación</Boton></Link>
        </div>
      </Panel>
    );
  }

  const bruto = lineas.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio_unitario), 0);
  const amortizacion = Number(pl.amortizacion ?? 0);
  const neto = bruto - amortizacion;
  const tc = Number(pl.tipo_cambio || 1);
  const tipo = (pl.tipo_tributario ?? "detraccion") as TipoTributario;
  const mm = calcularMontos(neto, Number(pl.pct_detraccion || 0), tc, tipo);
  const simbolo = pl.moneda === "USD" ? "US$" : "S/";
  const D = (v: number) => `${simbolo} ${N(v)}`;
  const ctaDetraccion = cuentas.find((c) => c.tipo_cuenta === "Detracciones") ?? null;
  const cuentasOrdenadas = [...cuentas].sort((a, b) => Number(a.tipo_cuenta === "Detracciones") - Number(b.tipo_cuenta === "Detracciones"));
  const descuento = mm.detraccionPen > 0 ? `S/ ${N(mm.detraccionPen, 0)}` : mm.retencionPen > 0 ? `S/ ${N(mm.retencionPen)}` : "No aplica";

  function copiarEnlace() {
    const url = `${window.location.origin}/preliquidacion-vista?id=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2500);
      })
      .catch(() => window.prompt("Copia este enlace de vista previa:", url));
  }

  async function descargarPdf() {
    if (!pl) return;
    setPdfCargando(true);
    try {
      await descargarPreliquidacionPdf({
        codigo: pl.codigo,
        fecha: pl.fecha,
        estado: pl.estado,
        fuentePdf: fuente.id,
        empresa: {
          razonSocial: empresa?.razon_social || "TELXEN SAC",
          eslogan: empresa?.eslogan || "",
          ruc: empresa?.ruc || "",
          direccion: empresa?.direccion || "",
          telefono: empresa?.telefono || "",
          email: empresa?.email || "",
          web: empresa?.web || "",
          logoUrl: empresa?.logo_url || "",
        },
        cliente: {
          razonSocial: cliente?.razon_social || "—",
          ruc: cliente?.numero_documento || "",
          direccion: cliente?.direccion || "",
        },
        proyecto: proyecto?.nombre || "—",
        ordenCompra: pl.concepto,
        moneda: pl.moneda,
        tipoCambio: tc,
        lineas: lineas.map((l) => ({
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precio_unitario),
        })),
        valorEjecutado: bruto,
        amortizacion,
        valorNeto: mm.neto,
        igv: mm.igv,
        total: mm.total,
        tipoTributario: tipo,
        porcentajeTributario: Number(pl.pct_detraccion || 0),
        aplicaTributo: mm.aplica,
        detraccionPen: mm.detraccionPen,
        retencionPen: mm.retencionPen,
        netoDepositar: mm.cobrar,
        condicionPago: pl.condicion_pago,
        diasCredito: Number(pl.dias_credito || 0),
        fechaVencimiento: pl.fecha_vencimiento || "",
        cuentaDetracciones: ctaDetraccion ? { nombre: ctaDetraccion.nombre, numero: ctaDetraccion.numero_cuenta, cci: ctaDetraccion.cci } : null,
        cuentasTodas: cuentasOrdenadas.map((c) => ({ nombre: c.nombre, numero: c.numero_cuenta, cci: c.cci, moneda: c.monedas, tipoCuenta: c.tipo_cuenta, esDetraccion: c.tipo_cuenta === "Detracciones" })),
        observacion: pl.observacion || "",
      });
    } catch (err) {
      window.alert(err instanceof Error ? `No se pudo generar el PDF: ${err.message}` : "No se pudo generar el PDF.");
    } finally {
      setPdfCargando(false);
    }
  }

  const etiqueta = { fontSize: 7.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase" as const, color: C.slate500, marginBottom: 3 };
  const valor = { fontSize: 10, fontWeight: 700, color: C.slate950, lineHeight: 1.3 };
  const subvalor = { fontSize: 9, color: C.slate500, lineHeight: 1.35, marginTop: 2 };
  const tituloSeccion = { fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const, color: C.emerald800, marginBottom: 7 };
  const celda = { padding: "7px 7px", borderBottom: `1px solid ${C.slate300}`, fontSize: 9.5 };

  return (
    <>
      <Encabezado
        titulo="Vista previa de preliquidación"
        subtitulo={`${pl.codigo} · ${cliente?.razon_social || "Cliente sin registrar"}`}
        acciones={
          <div className="flex flex-wrap gap-2">
            <Link to="/valorizaciones">
              <Boton variante="linea"><ArrowLeft size={13} /> Volver</Boton>
            </Link>
            <Boton variante="linea" onClick={copiarEnlace}>
              <Link2 size={14} /> {copiado ? "Enlace copiado" : "Copiar enlace"}
            </Boton>
            <Boton variante="accion" onClick={() => void descargarPdf()} disabled={pdfCargando}>
              <FileDown size={14} /> {pdfCargando ? "Generando..." : "Descargar PDF"}
            </Boton>
          </div>
        }
      />

      <div className="overflow-x-auto pb-8">
        <div className="mx-auto" style={{ width: 700 }}>
          <section
            style={{
              width: 794,
              minHeight: 1123,
              margin: "0 auto",
              background: C.white,
              color: C.slate700,
              fontFamily: DOC_FUENTE_CSS,
              fontSize: 9.5,
              padding: "38px 40px 34px",
              boxSizing: "border-box",
              boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="flex items-start justify-between gap-5" style={{ borderBottom: `2px solid ${C.emerald700}`, paddingBottom: 14, marginBottom: 18 }}>
              <div className="flex items-center" style={{ minWidth: 150 }}>
                {empresa?.logo_url ? (
                  <img src={empresa.logo_url} alt="Logotipo de la empresa" style={{ display: "block", maxWidth: 150, maxHeight: 62, objectFit: "contain" }} />
                ) : (
                  <div className="flex items-center justify-center" style={{ width: 62, height: 62, borderRadius: 12, background: C.emerald700, color: C.white, fontWeight: 700, fontSize: 20 }}>
                    {(empresa?.razon_social || "TELXEN").split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, textAlign: "right", paddingTop: 2 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.emerald800, letterSpacing: 0.4, lineHeight: 1.35, textAlign: "right" }}>
                  {empresa?.razon_social || "TELXEN"}
                </div>
                {empresa?.eslogan?.trim()
                  ? (() => {
                      const es = empresa.eslogan.trim();
                      const idx = es.indexOf(",");
                      const linea1 = idx >= 0 ? es.slice(0, idx + 1) : es;
                      const linea2 = idx >= 0 ? es.slice(idx + 1).trim() : "";
                      return (
                        <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontSize: 9.5, fontWeight: 300, color: C.emerald800, letterSpacing: 0.4, lineHeight: 1.3, textAlign: "right" }}>
                          <span style={{ display: "block" }}>{linea1}</span>
                          {linea2 && <span style={{ display: "block" }}>{linea2}</span>}
                        </div>
                      );
                    })()
                  : (
                      <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontSize: 9.5, fontWeight: 300, color: C.emerald800, letterSpacing: 0.4, lineHeight: 1.3, textAlign: "right" }}>
                        <span style={{ display: "block" }}>SOLUCIONES INTEGRALES EN ENERGÍA,</span>
                        <span style={{ display: "block" }}>AUTOMATIZACIÓN Y CONTROL INDUSTRIAL</span>
                      </div>
                    )}
                {empresa?.direccion && (
                  <div style={{ marginTop: 4, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: C.slate700 }}>Dirección: {empresa.direccion}</div>
                )}
                {empresa?.telefono && (
                  <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: C.slate700 }}>Teléfono: {empresa.telefono}</div>
                )}
                {empresa?.web && <div style={{ marginTop: 2, fontFamily: DOC_FUENTE_CSS, fontWeight: 300, fontSize: 9.5, color: C.emerald800 }}>{empresa.web}</div>}
              </div>

              <div style={{ minWidth: 200 }}>
                <div style={{ background: DOC.white, border: `1px solid ${DOC.line}`, borderTop: `4px solid ${DOC.green}`, borderRadius: 6, padding: "10px 16px", textAlign: "center", color: C.slate950 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, lineHeight: 1.15 }}>PRELIQUIDACIÓN</div>
                  <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
                  <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800, letterSpacing: 0.6 }}>{pl.codigo}</div>
                </div>
                <div className="flex justify-between" style={{ marginTop: 5, fontSize: 9.5, color: C.slate500 }}>
                  <span>{pl.estado.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div
              className="flex"
              style={{ gap: 18, padding: 13, background: DOC.soft, border: `1px solid ${DOC.line}`, borderLeft: `3px solid ${DOC.accent}`, borderRadius: 6, marginBottom: 14 }}
            >
              <div style={{ flex: 1 }}>
                <div style={etiqueta}>Cliente</div>
                <div style={valor}>{cliente?.razon_social || "—"}</div>
                <div style={subvalor}>RUC {cliente?.numero_documento || "—"}</div>
                <div style={subvalor}>{cliente?.direccion || "Dirección no registrada"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={etiqueta}>Proyecto / obra</div>
                <div style={valor}>{proyecto?.nombre || "—"}</div>
                <div style={{ ...etiqueta, marginTop: 8 }}>Orden de compra</div>
                <div style={valor}>{pl.concepto || "—"}</div>
              </div>
              <div style={{ width: "23%" }}>
                <div style={etiqueta}>Fecha de emisión</div>
                <div style={valor}>{F(pl.fecha)}</div>
                <div style={{ ...etiqueta, marginTop: 8 }}>Moneda</div>
                <div style={valor}>{pl.moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"}</div>
                {pl.moneda === "USD" && <div style={subvalor}>T.C. {N(tc, 3)}</div>}
              </div>
            </div>

            <div style={tituloSeccion}>Detalle de la preliquidación</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: C.slate950, color: C.white }}>
                  {[
                    { h: "#", a: "center" },
                    { h: "Código", a: "left" },
                    { h: "Descripción", a: "left" },
                    { h: "Und.", a: "center" },
                    { h: "Cant.", a: "right" },
                    { h: "P. Unit.", a: "right" },
                    { h: "Subtotal", a: "right" },
                  ].map(({ h, a }) => (
                    <th key={h} style={{ padding: "8px 7px", fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.3, textAlign: a as "left" | "right" | "center" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 && (
                  <tr><td colSpan={7} style={{ ...celda, textAlign: "center", color: C.slate500 }}>Sin líneas registradas.</td></tr>
                )}
                {lineas.map((l, i) => {
                  const { codigo, texto } = separarCodigo(l.descripcion);
                  return (
                  <tr key={l.id} style={{ background: i % 2 === 1 ? C.slate50 : C.white }}>
                    <td style={{ ...celda, textAlign: "center" }}>{i + 1}</td>
                    <td style={{ ...celda, textAlign: "left", color: C.slate500, whiteSpace: "nowrap" }}>{codigo || "—"}</td>
                    <td style={{ ...celda, wordBreak: "break-word" }}>{texto}</td>
                    <td style={{ ...celda, textAlign: "center" }}>{l.unidad}</td>
                    <td style={{ ...celda, textAlign: "right" }}>{N(Number(l.cantidad))}</td>
                    <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{D(Number(l.precio_unitario))}</td>
                    <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{D(Number(l.cantidad) * Number(l.precio_unitario))}</td>
                  </tr>
                  );
                })}

              </tbody>
            </table>

            <div className="flex items-start justify-between" style={{ marginBottom: 18 }}>
              <div style={{ width: "52%", padding: 12, border: `1px solid ${C.slate300}`, borderRadius: 5 }}>
                <div style={tituloSeccion}>Condición comercial</div>
                <div className="flex justify-between" style={{ marginTop: 5 }}><span>Condición de pago</span><span style={valor}>{pl.condicion_pago}</span></div>
                {pl.condicion_pago === "Crédito" && (
                  <>
                    <div className="flex justify-between" style={{ marginTop: 5 }}><span>Plazo</span><span>{Number(pl.dias_credito || 0)} días</span></div>
                    <div className="flex justify-between" style={{ marginTop: 5 }}><span>Vencimiento estimado</span><span>{F(pl.fecha_vencimiento || "")}</span></div>
                  </>
                )}
                {pl.moneda === "USD" && (
                  <div className="flex justify-between" style={{ marginTop: 5 }}><span>Total referencial en PEN</span><span>S/ {N(mm.total * tc)}</span></div>
                )}
              </div>
              <div style={{ width: "42%" }}>
                {amortizacion > 0 && (
                  <>
                    <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${C.slate300}` }}><span>Valor ejecutado</span><span>{D(bruto)}</span></div>
                    <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${C.slate300}` }}><span>Amortización (−)</span><span>{D(amortizacion)}</span></div>
                  </>
                )}
                <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${C.slate300}` }}><span>Valor neto</span><span>{D(mm.neto)}</span></div>
                <div className="flex justify-between" style={{ padding: "5px 0", borderBottom: `1px solid ${C.slate300}` }}><span>IGV 18%</span><span>{D(mm.igv)}</span></div>
                <div className="flex justify-between" style={{ marginTop: 6, padding: "6px 4px", color: DOC.green, borderTop: `1px solid ${DOC.green}`, fontWeight: 700, fontSize: 11 }}>
                  <span>TOTAL</span><span>{D(mm.total)}</span>
                </div>
              </div>
            </div>

            <div style={tituloSeccion}>Liquidación y cobro</div>
            <div className="flex" style={{ gap: 9, marginBottom: 16 }}>
              {[
                { t: "Régimen tributario", v: mm.aplica ? `${tipo === "detraccion" ? "Detracción" : "Retención"} ${N(Number(pl.pct_detraccion || 0))}%` : "No aplica" },
                { t: mm.aplica ? (tipo === "detraccion" ? "Detracción" : "Retención") : "Importe descontado", v: descuento },
                { t: "Neto a depositar", v: D(mm.cobrar) },
              ].map((c) => (
                <div key={c.t} style={{ flex: 1, padding: 11, border: `1px solid ${DOC.line}`, borderRadius: 6 }}>
                  <div style={etiqueta}>{c.t}</div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: C.emerald800, marginTop: 4 }}>{c.v}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, background: C.slate50, marginBottom: 14, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={tituloSeccion}>Datos bancarios</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, textTransform: "uppercase" }}>
                {cuentasOrdenadas.length === 0 && <div style={valor}>NO HAY CUENTAS BANCARIAS REGISTRADAS.</div>}
                {cuentasOrdenadas.map((c, i) => (
                  <div key={i} style={{ marginTop: 1 }}>
                    {c.tipo_cuenta === "Detracciones" && <div style={{ ...etiqueta, marginTop: 3 }}>Cuenta de detracciones · Banco de la Nación</div>}
                    <div style={valor}>
                      {c.tipo_cuenta === "Detracciones"
                        ? `${c.nombre} · ${c.tipo_cuenta} · Cta. ${c.numero_cuenta || "—"}`
                        : `${c.nombre} · ${c.tipo_cuenta} · ${c.monedas} · Cta. ${c.numero_cuenta || "—"} · CCI ${c.cci || "—"}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {pl.observacion && (
              <div style={{ padding: 11, borderLeft: `3px solid ${DOC.accent}`, background: DOC.soft, borderRadius: 6, marginBottom: 14 }}>
                <div style={etiqueta}>Observaciones</div>
                <div>{pl.observacion}</div>
              </div>
            )}

            <div style={{ fontSize: 8, lineHeight: 1.45, color: C.slate500, paddingTop: 12, borderTop: `1px solid ${C.slate300}` }}>
              Documento referencial previo a la emisión del comprobante electrónico. No constituye comprobante de pago ni tiene valor tributario.
            </div>
            <div className="flex justify-between" style={{ marginTop: 10, fontSize: 7.5, color: C.slate500 }}>
              <span>{empresa?.razon_social || "TELXEN SAC"} · {pl.codigo}</span>
              <span>Página 1 de 1</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
