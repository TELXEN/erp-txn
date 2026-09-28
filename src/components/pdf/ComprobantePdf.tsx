import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { DatosComprobanteElectronico } from "../../types/comprobantes";
import { pdfStyles, PDF_COLORS } from "./ComprobantePdfStyles";

const formatoFecha = (valor: string) => {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : valor;
};

const numero = (valor: number, decimales = 2) =>
  Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export function ComprobantePdfDocument({ datos }: { datos: DatosComprobanteElectronico }) {
  const simbolo = datos.moneda === "USD" ? "US$" : "S/";
  const dinero = (valor: number) => `${simbolo} ${numero(valor)}`;

  return (
    <Document title={`${datos.tipoDocumento} ${datos.codigo}`} author={datos.empresa.razonSocial}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header Reused from Preliquidación */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.brand}>
            {datos.empresa.logoUrl ? (
              <Image src={datos.empresa.logoUrl} style={pdfStyles.logo} />
            ) : (
              <Text style={pdfStyles.logoFallback}>LOGO</Text>
            )}
          </View>
          <View style={pdfStyles.company}>
            <Text style={pdfStyles.companyName}>{datos.empresa.razonSocial}</Text>
            {datos.empresa.eslogan ? <Text style={pdfStyles.slogan}>{datos.empresa.eslogan}</Text> : null}
            <Text style={pdfStyles.companyLine}>{datos.empresa.direccion}</Text>
            {datos.empresa.telefono ? <Text style={pdfStyles.companyLineMt}>Telf: {datos.empresa.telefono}</Text> : null}
          </View>
          <View style={pdfStyles.titleCol}>
            <View style={pdfStyles.titleBox}>
              <Text style={pdfStyles.boxTitle}>{datos.tipoDocumento.replace('_', ' ')}</Text>
              <Text style={pdfStyles.boxRuc}>RUC: {datos.empresa.ruc}</Text>
              <Text style={pdfStyles.boxCode}>{datos.codigo}</Text>
            </View>
          </View>
        </View>

        {/* Info Band Reused from Preliquidación */}
        <View style={pdfStyles.infoBand}>
          <View style={pdfStyles.infoColumn}>
            <Text style={pdfStyles.label}>Adquiriente</Text>
            <Text style={pdfStyles.value}>{datos.cliente.razonSocial}</Text>
            <Text style={pdfStyles.subvalue}>RUC/DNI {datos.cliente.ruc}</Text>
            <Text style={pdfStyles.subvalue}>{datos.cliente.direccion}</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={pdfStyles.label}>Fecha de Emisión</Text>
            <Text style={pdfStyles.value}>{formatoFecha(datos.fechaEmision)}</Text>
            <Text style={[pdfStyles.label, { marginTop: 8 }]}>Moneda</Text>
            <Text style={pdfStyles.value}>{datos.moneda === "USD" ? "Dólares (USD)" : "Soles (PEN)"}</Text>
          </View>
        </View>

        {/* Table Reused from Preliquidación */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader} fixed>
            <Text style={[pdfStyles.cell, pdfStyles.number]}>#</Text>
            <Text style={[pdfStyles.cell, pdfStyles.description, { width: '55%' }]}>DESCRIPCIÓN</Text>
            <Text style={[pdfStyles.cell, pdfStyles.unit]}>UND.</Text>
            <Text style={[pdfStyles.cell, pdfStyles.quantity]}>CANT.</Text>
            <Text style={[pdfStyles.cell, pdfStyles.price]}>P. UNIT.</Text>
            <Text style={[pdfStyles.cell, pdfStyles.subtotal]}>TOTAL</Text>
          </View>
          {datos.lineas.map((linea, index) => (
            <View key={index} style={[pdfStyles.tableRow, index % 2 === 1 ? pdfStyles.tableRowAlt : {}]} wrap={false}>
              <Text style={[pdfStyles.cell, pdfStyles.number]}>{index + 1}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.description, { width: '55%' }]}>{linea.descripcion}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.unit]}>{linea.unidad}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.quantity]}>{numero(linea.cantidad)}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.price]}>{dinero(linea.precioUnitario)}</Text>
              <Text style={[pdfStyles.cell, pdfStyles.subtotal]}>{dinero(linea.cantidad * linea.precioUnitario)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Reused from Preliquidación */}
        <View style={pdfStyles.summaryWrap} wrap={false}>
          <View style={{ width: '55%' }}>
            {datos.montoEnLetras && (
              <Text style={[pdfStyles.label, { marginBottom: 10 }]}>SON: {datos.montoEnLetras}</Text>
            )}
            {datos.qrCodeUrl && (
              <View style={pdfStyles.qrContainer}>
                <Image src={datos.qrCodeUrl} style={pdfStyles.qrImage} />
                <View>
                  <Text style={pdfStyles.hashText}>Hash: {datos.hash || '—'}</Text>
                  <Text style={pdfStyles.hashText}>Representación impresa de la {datos.tipoDocumento.toLowerCase()}.</Text>
                </View>
              </View>
            )}
          </View>
          <View style={pdfStyles.totals}>
            <View style={pdfStyles.totalRow}><Text>Op. Gravada</Text><Text>{dinero(datos.subtotal)}</Text></View>
            <View style={pdfStyles.totalRow}><Text>IGV 18%</Text><Text>{dinero(datos.igv)}</Text></View>
            <View style={pdfStyles.totalStrong}><Text>TOTAL</Text><Text>{dinero(datos.total)}</Text></View>
          </View>
        </View>

        {/* Footer Reused from Preliquidación */}
        <Text style={pdfStyles.legal}>Este documento es una representación impresa de un comprobante electrónico emitido en el sistema de la SUNAT.</Text>
        <View style={pdfStyles.footer} fixed>
          <Text>{datos.empresa.razonSocial} · {datos.codigo}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
