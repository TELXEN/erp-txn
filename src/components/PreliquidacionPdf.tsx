import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";

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
};

/** Separa el ítem jerárquico (01.02.01) de la descripción y lo vuelve código compacto (010201). */
function separarCodigoPartida(descripcion: string) {
  const m = /^\s*(\d{1,2}(?:\.\d{1,2})*)\s+(.*)$/.exec(descripcion || "");
  if (!m || !m[1] || !m[2]) return { codigo: "", texto: (descripcion || "").trim() };
  return { codigo: m[1].split(".").map((p) => p.padStart(2, "0")).join(""), texto: m[2].trim() };
}

const colors = {
  slate950: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate300: "#cbd5e1",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  emerald800: "#065f46",
  emerald700: "#047857",
  emerald100: "#d1fae5",
  emerald50: "#ecfdf5",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: { padding: "32 34 30", fontFamily: "Helvetica", fontSize: 8.5, color: colors.slate700 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: colors.emerald700, paddingBottom: 12, marginBottom: 16 },
  brand: { width: 96, alignItems: "center", justifyContent: "center" },
  logo: { maxWidth: 96, maxHeight: 46, objectFit: "contain" },
  logoFallback: { width: 46, height: 46, borderRadius: 9, backgroundColor: colors.emerald700, color: colors.white, fontFamily: "Helvetica-Bold", fontSize: 14, textAlign: "center", lineHeight: 46 },
  company: { flex: 1, alignItems: "flex-end", paddingTop: 2 },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: colors.emerald800, letterSpacing: 0.3, textAlign: "right" },
  slogan: { fontFamily: "Helvetica", fontSize: 7, color: colors.emerald800, letterSpacing: 0.3, textAlign: "right", lineHeight: 1.3, marginTop: 2 },
  companyLine: { fontFamily: "Helvetica", fontSize: 7, color: colors.slate700, textAlign: "right", lineHeight: 1.35, marginTop: 3 },
  companyLineMt: { fontFamily: "Helvetica", fontSize: 7, color: colors.slate700, textAlign: "right", lineHeight: 1.35, marginTop: 1.5 },
  companyWeb: { fontFamily: "Helvetica", fontSize: 7, color: colors.emerald800, textAlign: "right", lineHeight: 1.35, marginTop: 1.5 },
  titleCol: { width: 145 },
  titleBox: { alignItems: "center", backgroundColor: colors.emerald50, borderTopWidth: 3, borderTopColor: colors.emerald700, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 },
  boxTitle: { fontFamily: "Helvetica-Bold", fontSize: 14, color: colors.slate950, letterSpacing: 1.4, lineHeight: 1.15 },
  boxRuc: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: colors.slate950, marginTop: 2 },
  boxCode: { fontFamily: "Helvetica-Bold", fontSize: 10, color: colors.slate950, marginTop: 1.5, letterSpacing: 0.5 },
  statusLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  statusText: { fontFamily: "Helvetica-Bold", fontSize: 7, color: colors.slate500, letterSpacing: 0.8 },
  infoBand: { flexDirection: "row", gap: 16, padding: 12, backgroundColor: colors.slate50, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.slate300, marginBottom: 17 },
  infoColumn: { flex: 1 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 6.7, color: colors.slate500, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 3 },
  value: { fontFamily: "Helvetica-Bold", fontSize: 9, color: colors.slate950, lineHeight: 1.3 },
  subvalue: { fontSize: 7.8, color: colors.slate500, lineHeight: 1.35, marginTop: 2 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: colors.emerald800, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7 },
  table: { marginBottom: 15 },
  tableHeader: { flexDirection: "row", backgroundColor: colors.slate950, color: colors.white, minHeight: 24, alignItems: "center" },
  tableRow: { flexDirection: "row", minHeight: 27, alignItems: "center", borderBottomWidth: 0.7, borderBottomColor: colors.slate300 },
  tableRowAlt: { backgroundColor: colors.slate50 },
  cell: { paddingHorizontal: 6 },
  number: { width: "5%", textAlign: "center" },
  codeCell: { width: "10%", textAlign: "left" },
  description: { width: "35%" },
  unit: { width: "9%", textAlign: "center" },
  quantity: { width: "11%", textAlign: "right" },
  price: { width: "14%", textAlign: "right" },
  subtotal: { width: "16%", textAlign: "right" },
  summaryWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  paymentCard: { width: "52%", padding: 11, borderWidth: 1, borderColor: colors.slate300, borderRadius: 4 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  totals: { width: "42%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: colors.slate300 },
  totalStrong: { flexDirection: "row", justifyContent: "space-between", padding: "8 7", backgroundColor: colors.slate950, color: colors.white, fontFamily: "Helvetica-Bold", fontSize: 10 },
  settlement: { flexDirection: "row", gap: 8, marginBottom: 15 },
  settlementCard: { flex: 1, padding: 10, backgroundColor: colors.emerald50, borderTopWidth: 2, borderTopColor: colors.emerald700 },
  settlementValue: { fontFamily: "Helvetica-Bold", fontSize: 11, color: colors.emerald800, marginTop: 4 },
  banking: { padding: 11, backgroundColor: colors.slate50, marginBottom: 13, flexGrow: 1 },
  bankList: { flexGrow: 1 },
  bankLabel: { fontFamily: "Helvetica-Bold", fontSize: 6.7, color: colors.slate500, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 1, marginTop: 2 },
  bankValue: { fontFamily: "Helvetica-Bold", fontSize: 9, color: colors.slate950, lineHeight: 1.2, marginTop: 1 },
  notes: { padding: 10, borderLeftWidth: 3, borderLeftColor: colors.emerald700, backgroundColor: colors.emerald50, marginBottom: 14 },
  legal: { fontSize: 7, lineHeight: 1.4, color: colors.slate500, marginTop: "auto", paddingTop: 12, borderTopWidth: 0.7, borderTopColor: colors.slate300 },
  footer: { position: "absolute", left: 34, right: 34, bottom: 14, flexDirection: "row", justifyContent: "space-between", color: colors.slate500, fontSize: 6.5 },
});

const formatoFecha = (valor: string) => {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor;
};

const numero = (valor: number, decimales = 2) =>
  Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function PreliquidacionDocument({ datos }: { datos: DatosPreliquidacionPdf }) {
  const simbolo = datos.moneda === "USD" ? "US$" : "S/";
  const dinero = (valor: number) => `${simbolo} ${numero(valor)}`;
  const descuento = datos.detraccionPen > 0 ? `S/ ${numero(datos.detraccionPen, 0)}` : datos.retencionPen > 0 ? `S/ ${numero(datos.retencionPen)}` : "No aplica";

  return (
    <Document title={`Preliquidación ${datos.codigo}`} author={datos.empresa.razonSocial} subject="Preliquidación comercial">
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            {datos.empresa.logoUrl ? <Image src={datos.empresa.logoUrl} style={styles.logo} /> : null}
            <View style={styles.company}>
              <Text style={styles.companyName}>{datos.empresa.razonSocial}</Text>
              <Text style={styles.companyLine}>RUC {datos.empresa.ruc || "—"}</Text>
              <Text style={styles.companyLine}>{datos.empresa.direccion || "Dirección no registrada"}</Text>
              <Text style={styles.companyLine}>{[datos.empresa.telefono, datos.empresa.email, datos.empresa.web].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>DOCUMENTO COMERCIAL</Text>
            <Text style={styles.title}>PRELIQUIDACIÓN</Text>
            <Text style={styles.code}>{datos.codigo}</Text>
            <Text style={styles.status}>{datos.estado.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoBand}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{datos.cliente.razonSocial}</Text>
            <Text style={styles.subvalue}>RUC {datos.cliente.ruc || "—"}</Text>
            <Text style={styles.subvalue}>{datos.cliente.direccion || "Dirección no registrada"}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Proyecto / obra</Text>
            <Text style={styles.value}>{datos.proyecto}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Orden de compra</Text>
            <Text style={styles.value}>{datos.ordenCompra || "—"}</Text>
          </View>
          <View style={{ width: "23%" }}>
            <Text style={styles.label}>Fecha de emisión</Text>
            <Text style={styles.value}>{formatoFecha(datos.fecha)}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Moneda</Text>
            <Text style={styles.value}>{datos.moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"}</Text>
            {datos.moneda === "USD" ? <Text style={styles.subvalue}>T.C. {numero(datos.tipoCambio, 3)}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle de la preliquidación</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.cell, styles.number]}>#</Text><Text style={[styles.cell, styles.codeCell]}>CÓDIGO</Text><Text style={[styles.cell, styles.description]}>DESCRIPCIÓN</Text>
            <Text style={[styles.cell, styles.unit]}>UND.</Text><Text style={[styles.cell, styles.quantity]}>CANT.</Text>
            <Text style={[styles.cell, styles.price]}>P. UNIT.</Text><Text style={[styles.cell, styles.subtotal]}>SUBTOTAL</Text>
          </View>
          {datos.lineas.map((linea, index) => {
            const partes = separarCodigoPartida(linea.descripcion);
            return (
            <View key={`${linea.descripcion}-${index}`} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]} wrap={false}>
              <Text style={[styles.cell, styles.number]}>{index + 1}</Text><Text style={[styles.cell, styles.codeCell]}>{partes.codigo || "—"}</Text><Text style={[styles.cell, styles.description]}>{partes.texto}</Text>
              <Text style={[styles.cell, styles.unit]}>{linea.unidad}</Text><Text style={[styles.cell, styles.quantity]}>{numero(linea.cantidad)}</Text>
              <Text style={[styles.cell, styles.price]}>{dinero(linea.precioUnitario)}</Text><Text style={[styles.cell, styles.subtotal]}>{dinero(linea.cantidad * linea.precioUnitario)}</Text>
            </View>
            );
          })}

        </View>

        <View style={styles.summaryWrap} wrap={false}>
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Condición comercial</Text>
            <View style={styles.paymentRow}><Text>Condición de pago</Text><Text style={styles.value}>{datos.condicionPago}</Text></View>
            {datos.condicionPago === "Crédito" ? <><View style={styles.paymentRow}><Text>Plazo</Text><Text>{datos.diasCredito} días</Text></View><View style={styles.paymentRow}><Text>Vencimiento estimado</Text><Text>{formatoFecha(datos.fechaVencimiento)}</Text></View></> : null}
            {datos.moneda === "USD" ? <View style={styles.paymentRow}><Text>Total referencial en PEN</Text><Text>S/ {numero(datos.total * datos.tipoCambio)}</Text></View> : null}
          </View>
          <View style={styles.totals}>
            {datos.amortizacion > 0 ? <><View style={styles.totalRow}><Text>Valor ejecutado</Text><Text>{dinero(datos.valorEjecutado)}</Text></View><View style={styles.totalRow}><Text>Amortización (−)</Text><Text>{dinero(datos.amortizacion)}</Text></View></> : null}
            <View style={styles.totalRow}><Text>Valor neto</Text><Text>{dinero(datos.valorNeto)}</Text></View>
            <View style={styles.totalRow}><Text>IGV 18%</Text><Text>{dinero(datos.igv)}</Text></View>
            <View style={styles.totalStrong}><Text>TOTAL</Text><Text>{dinero(datos.total)}</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Liquidación y cobro</Text>
        <View style={styles.settlement} wrap={false}>
          <View style={styles.settlementCard}><Text style={styles.label}>Régimen tributario</Text><Text style={styles.settlementValue}>{datos.aplicaTributo ? `${datos.tipoTributario === "detraccion" ? "Detracción" : "Retención"} ${numero(datos.porcentajeTributario)}%` : "No aplica"}</Text></View>
          <View style={styles.settlementCard}><Text style={styles.label}>{datos.aplicaTributo ? (datos.tipoTributario === "detraccion" ? "Detracción" : "Retención") : "Importe descontado"}</Text><Text style={styles.settlementValue}>{descuento}</Text></View>
          <View style={styles.settlementCard}><Text style={styles.label}>Neto a depositar</Text><Text style={styles.settlementValue}>{dinero(datos.netoDepositar)}</Text></View>
        </View>

        <View style={styles.banking} wrap={false}>
          <Text style={styles.sectionTitle}>DATOS BANCARIOS</Text>
          <View style={styles.bankList}>
            {datos.cuentasTodas.length === 0 ? <Text style={styles.bankValue}>NO HAY CUENTAS BANCARIAS REGISTRADAS.</Text> : null}
            {datos.cuentasTodas.map((c, i) => (
              <View key={i}>
                {c.esDetraccion ? <Text style={styles.bankLabel}>CUENTA DE DETRACCIONES · BANCO DE LA NACIÓN</Text> : null}
                <Text style={styles.bankValue}>{(c.esDetraccion ? `${c.nombre} · ${c.tipoCuenta} · CTA. ${c.numero || "—"}` : `${c.nombre} · ${c.tipoCuenta} · ${c.moneda} · CTA. ${c.numero || "—"} · CCI ${c.cci || "—"}`).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {datos.observacion ? <View style={styles.notes} wrap={false}><Text style={styles.label}>Observaciones</Text><Text>{datos.observacion}</Text></View> : null}
        <Text style={styles.legal}>Documento referencial previo a la emisión del comprobante electrónico. No constituye comprobante de pago ni tiene valor tributario.</Text>
        <View style={styles.footer} fixed><Text>{datos.empresa.razonSocial} · {datos.codigo}</Text><Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} /></View>
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