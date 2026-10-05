# Descarga masiva de facturas de compra desde SUNAT

## Objetivo
Desde SIRE → pestaña RCE (compras), descargar en lote el XML, PDF y CDR de las facturas recibidas de proveedores del período, archivarlas en el ERP y registrarlas como compra/gasto con sus ítems.

## Cómo funciona para el usuario
1. En RCE, tras sincronizar la propuesta, aparece el botón **«Descargar comprobantes»**. Se puede marcar todo o elegir filas.
2. Una barra de progreso muestra «12 de 48 descargados»; las fallidas se marcan en rojo con el motivo y se pueden reintentar.
3. Cada fila muestra iconos XML / PDF / CDR para ver o bajar el archivo; también **«Descargar ZIP del período»**.
4. Botón **«Registrar en el ERP»**: abre una ventana por lote donde se elige, por factura, si va a **Costo Directo** (proyecto + partida) o **Gasto General** (categoría). Proveedor, fecha, serie-número, moneda, tipo de cambio, base, IGV, total e ítems se precargan desde el XML.
5. Facturas ya registradas quedan marcadas «Registrada» y no se duplican (clave RUC + tipo + serie + número).
6. Si el proveedor no existe en Proveedores, se crea automáticamente con RUC y razón social del XML.

## Límites a tener en cuenta
- SUNAT entrega XML y PDF de comprobantes recibidos mediante su API de consulta de comprobantes con las mismas credenciales API SOL. El **CDR** de una factura recibida solo lo entrega SUNAT en algunos casos; cuando no esté disponible se indicará «CDR no disponible» sin bloquear el resto.
- Las facturas de proveedores que emiten fuera de SUNAT (vía OSE) pueden no tener PDF en SUNAT; en ese caso se genera una representación simple desde el XML.

## Detalles técnicos
- Token OAuth con scope adicional `https://api-cpe.sunat.gob.pe` (mismas credenciales de `sire_credenciales`).
- Endpoint de descarga: `api-cpe.sunat.gob.pe/v1/contribuyente/consultacpe/comprobantes/{rucEmisor}-{tipo}-{serie}-{numero}-2/{01|02}` (XML/PDF); se verificará contra la documentación vigente y una prueba real.
- Server function autenticada `descargarComprobantesSire` (admin/gerente) procesa lotes de ~10 por llamada para no exceder tiempos; el cliente encadena lotes.
- Bucket privado `comprobantes-compra` (ruta `periodo/ruc-tipo-serie-numero.xml|pdf|cdr.zip`); URLs firmadas para ver/descargar.
- Nueva tabla `comprobantes_recibidos`: emisor RUC/razón, tipo, serie, número, fecha, moneda, TC, base, IGV, total, rutas de archivos, estado de descarga, error, `registrado_en` (gasto_directo/gasto_general) + id; ítems en `comprobantes_recibidos_items` parseados del XML UBL (descripción, unidad, cantidad, P.U., valor). RLS admin/gerente, con GRANTs.
- Parser UBL 2.1 en servidor (XML liviano compatible con el entorno).
- Registro: inserta en `gastos_directos` o `gastos_generales` reutilizando los campos existentes y enlaza al proveedor en `terceros`.
- ZIP del período generado en servidor con `fflate`.
