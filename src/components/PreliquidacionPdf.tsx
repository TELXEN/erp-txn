import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { familiaReactPdf } from "@/lib/fuentes-documentos-pdf";
import type { FuenteDocumentoId } from "@/lib/fuentes-documentos";
import { DOC } from "@/lib/documento-tema";
import { cuentasDelComprobante, tituloCuenta, type CuentaCpe } from "@/lib/cuentas-comprobante";

type LineaPdf = {
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
};

type CuentaPdf = {
  nombre: string;
  numero: string;
  cci: string;
} | null;

export type DatosPreliquidacionPdf = {
  codigo: string;
  fecha: string;
  estado: string;
  empresa: {
    razonSocial: string;
    eslogan: string;
    ruc: string;
    direccion: string;
    telefono: string;
    email: string;
    web: string;
    logoUrl: string;
  };
  cliente: { razonSocial: string; ruc: string; direccion: string };
  proyecto: string;
  ordenCompra: string;
  concepto?: string;
  moneda: "PEN" | "USD";
  tipoCambio: number;
  lineas: LineaPdf[];
  valorEjecutado: number;
  amortizacion: number;
  valorNeto: number;
  igv: number;
  total: number;
  tipoTributario: "detraccion" | "retencion" | "ninguno";
  porcentajeTributario: number;
  aplicaTributo: boolean;
  detraccionPen: number;
  retencionPen: number;
  netoDepositar: number;
  condicionPago: string;
  diasCredito: number;
  fechaVencimiento: string;
  cuentaDetracciones: CuentaPdf;
  cuentasTodas: { nombre: string; numero: string; cci: string; moneda: string; tipoCuenta: string; esDetraccion?: boolean }[];
  observacion: string;
  fuentePdf?: FuenteDocumentoId;
};

/** Separa el ítem jerárquico (01.02.01) de la descripción y lo vuelve código compacto (010201). */
function separarCodigoPartida(descripcion: string) {
  const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(descripcion || "");
  if (!m || !m[1] || !m[2]) return { codigo: "", texto: (descripcion || "").trim() };
  return { codigo: m[1].split(".").map((p) => p.padStart(2, "0")).join(""), texto: m[2].trim() };
}

const N = (valor: number, decimales = 2) =>
  Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const F = (v: string) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "");

function PreliquidacionDocument({ datos }: { datos: DatosPreliquidacionPdf }) {
  const ff = familiaReactPdf(datos.fuentePdf);
  const s = StyleSheet.create({
    page: { padding: "27 28 190", fontFamily: ff, fontSize: 6.8, color: DOC.ink },
    b: { fontFamily: ff, fontWeight: 700 },
    card: { borderWidth: 1.1, borderColor: DOC.gris, borderRadius: 7 },
  });
  const simbolo = datos.moneda === "USD" ? "$" : "S/";
  const money = (v: number) => `${simbolo} ${N(v)}`;
  const det = datos.tipoTributario === "detraccion";
  const cuentas: CuentaCpe[] = cuentasDelComprobante(datos.cuentasTodas.map((c) => ({ nombre: c.nombre, numero_cuenta: c.numero, cci: c.cci, monedas: c.moneda, tipo_cuenta: c.tipoCuenta })));
  const filas: { e: string; v: number; t?: boolean }[] = [
    { e: "VALOR EJECUTADO", v: datos.valorEjecutado },
    ...(datos.amortizacion > 0 ? [{ e: "AMORTIZACIÓN (−)", v: datos.amortizacion }] : []),
    { e: "SUB TOTAL", v: datos.valorNeto },
    { e: "IGV 18%", v: datos.igv },
    { e: "TOTAL", v: datos.total, t: true },
  ];
  const Linea = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
    <View style={{ flexDirection: "row", marginTop: 1 }}><Text style={[s.b, { width: 56 }]}>{l}</Text><Text style={{ width: 7 }}>:</Text><Text style={[{ flex: 1 }, bold ? s.b : {}]}>{v}</Text></View>
  );
  const cols = [["CÓDIGO", "10%", "left"], ["DESCRIPCIÓN", "47%", "left"], ["UNIDAD", "8%", "center"], ["CANTIDAD", "10%", "right"], ["P. UNITARIO", "12%", "right"], ["V. VENTA", "13%", "right"]] as const;

  return (
    <Document title={`Preliquidación ${datos.codigo}`} author={datos.empresa.razonSocial} subject="Preliquidación comercial">
      <Page size="A4" style={s.page}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 4, color: "#000" }}>
          <View style={{ width: 104, alignSelf: "flex-start" }}>
            {datos.empresa.logoUrl ? <Image src={datos.empresa.logoUrl} style={{ maxWidth: 99, maxHeight: 58, objectFit: "contain" }} /> : <Text style={s.b}>TX</Text>}
          </View>
          <View style={{ flex: 1, lineHeight: 1.15, alignSelf: "flex-start" }}>
            <Text style={[s.b, { fontSize: 9.8 }]}>{datos.empresa.razonSocial.toUpperCase()}</Text>
            <Text style={{ fontSize: 5.3, marginTop: 1.5 }}>{(datos.empresa.eslogan || "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL").toUpperCase()}</Text>
            <Text style={{ fontSize: 5.6, marginTop: 1.5 }}>{(datos.empresa.direccion || "—").toUpperCase()}</Text>
            <Text style={{ fontSize: 5.6, marginTop: 1.5 }}>{(datos.empresa.web || "—").toUpperCase()}</Text>
          </View>
          <View style={{ width: 186, alignItems: "center" }}>
            <View style={{ width: "100%", borderWidth: 0.8, borderColor: "#000", borderRadius: 6, padding: 7, alignItems: "center", lineHeight: 1.15 }}>
              <Text style={[s.b, { fontSize: 7.5 }]}>RUC: {datos.empresa.ruc || "—"}</Text>
              <Text style={[s.b, { fontSize: 9, marginTop: 4 }]}>PRELIQUIDACIÓN</Text>
              <Text style={[s.b, { fontSize: 9.8, marginTop: 4 }]}>{datos.codigo}</Text>
            </View>
            <Text style={[s.b, { marginTop: 4, fontSize: 6, color: DOC.accentText, backgroundColor: DOC.accentSoft, borderWidth: 0.8, borderColor: DOC.accent, borderRadius: 8, paddingVertical: 1.5, paddingHorizontal: 8 }]}>{datos.estado.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[s.card, { flexDirection: "row", gap: 9, padding: 9, marginTop: 6, lineHeight: 1.15 }]}>
          <View style={{ flex: 1 }}>
            <Linea l="RUC" v={datos.cliente.ruc || "—"} />
            <Linea l="NOMBRE" v={datos.cliente.razonSocial.toUpperCase()} bold />
            <Linea l="DIRECCIÓN" v={(datos.cliente.direccion || "—").toUpperCase()} />
            <Linea l="PROYECTO" v={(datos.proyecto || "—").toUpperCase()} />
            {datos.concepto ? <Linea l="DESCRIPCIÓN" v={datos.concepto.toUpperCase()} /> : null}
          </View>
          <View style={{ width: 90 }}>
            <Linea l="MONEDA" v={datos.moneda} />
            {datos.moneda === "USD" ? <Linea l="T. CAMBIO" v={N(datos.tipoCambio, 3)} /> : null}
            <Linea l="IGV" v="18.00%" />
          </View>
        </View>

        <View style={[s.card, { flexDirection: "row", marginTop: 7, textAlign: "center" }]}>
          {([["Fecha de Emisión", F(datos.fecha)], ["Forma de Pago", datos.condicionPago || "—"], ["Orden de Compra", datos.ordenCompra], ["Fecha de Vencimiento", datos.condicionPago === "Crédito" ? F(datos.fechaVencimiento) : ""]] as [string, string][]).map(([l, v], i) => (
            <View key={l} style={{ flex: 1, padding: 4, borderLeftWidth: i ? 1.1 : 0, borderLeftColor: DOC.gris }}>
              <Text style={s.b}>{l}:</Text><Text style={{ marginTop: 2, minHeight: 8 }}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 13 }}>
          <View style={{ flexDirection: "row", backgroundColor: DOC.gris, color: DOC.white, paddingVertical: 3 }} fixed>
            {cols.map(([h, w, a]) => <Text key={h} style={[s.b, { width: w, textAlign: a, fontSize: 5, paddingHorizontal: 3 }]}>{h}</Text>)}
          </View>
          {datos.lineas.map((l, i) => {
            const p = separarCodigoPartida(l.descripcion);
            const vals = [p.codigo || "—", p.texto, l.unidad, N(l.cantidad), money(l.precioUnitario), money(l.cantidad * l.precioUnitario)];
            return (
              <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.7, borderBottomColor: DOC.line, backgroundColor: i % 2 ? DOC.soft : DOC.white }}>
                {cols.map(([h, w, a], k) => <Text key={h} style={[{ width: w, textAlign: a, paddingHorizontal: 3 }, k === 1 ? { fontSize: 5.3, lineHeight: 1.25, paddingLeft: 7 } : {}, k === 5 ? s.b : {}]}>{vals[k]}</Text>)}
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 13 }} wrap={false}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>{datos.observacion ? <><Text style={[s.b, { fontSize: 6, color: DOC.green }]}>OBSERVACIONES</Text><Text style={{ marginTop: 2 }}>{datos.observacion}</Text></> : null}</View>
          </View>
          <View style={{ width: 225, fontSize: 7.5 }}>
            {filas.map((f) => (
              <View key={f.e} style={{ flexDirection: "row", gap: 4, marginTop: 2.2 }}>
                <Text style={{ flex: 1, backgroundColor: f.t ? DOC.totalDesglose : DOC.grisClaro, borderRadius: 5, paddingVertical: 2, textAlign: "center" }}>{f.e}</Text>
                <Text style={{ flex: 1, borderWidth: 1.1, borderColor: f.t ? DOC.totalDesglose : DOC.gris, borderRadius: 5, paddingVertical: 1.5, paddingHorizontal: 6, textAlign: "right" }}>{money(f.v)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ position: "absolute", left: 28, right: 28, bottom: 21 }} fixed>
            {datos.aplicaTributo ? (
              <View style={{ fontSize: 7.5, color: "#4B5563", marginBottom: 6 }}>
                {det ? <View style={{ flexDirection: "row" }}><Text style={[s.b, { width: 130 }]}>Cta. Cte. Banco de la Nación</Text><Text style={s.b}>{datos.cuentaDetracciones?.numero || "—"}</Text></View> : null}
                <View style={{ flexDirection: "row" }}><Text style={[s.b, { width: 130 }]}>{det ? "Detracción" : "Retención"} ({N(datos.porcentajeTributario)}%)</Text><Text style={s.b}>S/ {N(det ? datos.detraccionPen : datos.retencionPen)}</Text></View>
              </View>
            ) : null}

          <View style={{ borderWidth: 0.8, borderColor: DOC.line, borderRadius: 6, padding: 6, fontSize: 7.5, lineHeight: 1.25 }}>
            <Text style={s.b}>{datos.condicionPago === "Crédito" ? "Información del crédito" : "Información del pago"}</Text>
            <View style={{ flexDirection: "row", marginTop: 1.5 }}><Text style={{ width: 150 }}>Monto neto pendiente de pago</Text><Text style={{ width: 10 }}>:</Text><Text>{money(datos.netoDepositar)}</Text></View>
            {datos.condicionPago === "Crédito" ? <>
              <View style={{ flexDirection: "row" }}><Text style={{ width: 150 }}>Plazo</Text><Text style={{ width: 10 }}>:</Text><Text>{datos.diasCredito} días</Text></View>
              <View style={{ flexDirection: "row" }}><Text style={{ width: 150 }}>Fecha de vencimiento</Text><Text style={{ width: 10 }}>:</Text><Text>{F(datos.fechaVencimiento) || "—"}</Text></View>
            </> : null}
          </View>
          {cuentas.length > 0 ? (
            <View style={{ borderWidth: 0.8, borderColor: DOC.line, borderRadius: 6, padding: 6, marginTop: 6 }}>
              <Text style={[s.b, { fontSize: 6.5, marginBottom: 3 }]}>CUENTAS BANCARIAS</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {cuentas.map((c, i) => (
                  <View key={i} style={{ flex: 1, fontSize: 6.2 }}>
                    <Text style={s.b}>{tituloCuenta(c)}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 1 }}><Text>CTA: {c.numero_cuenta || "—"}</Text>{c.cci ? <Text>CCI: {c.cci}</Text> : null}</View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <Text style={{ marginTop: 7, paddingTop: 5, borderTopWidth: 0.7, borderTopColor: DOC.line, fontSize: 6 }}>Documento referencial previo a la emisión del comprobante electrónico. No constituye comprobante de pago ni tiene valor tributario.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function descargarPreliquidacionPdf(datos: DatosPreliquidacionPdf) {
  const blob = await pdf(<PreliquidacionDocument datos={datos} />).toBlob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${datos.codigo.replace(/[^a-zA-Z0-9-_]/g, "-")}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}