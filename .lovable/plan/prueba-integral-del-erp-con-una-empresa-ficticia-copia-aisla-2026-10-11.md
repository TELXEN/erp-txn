# Prueba integral del ERP con una empresa ficticia (copia aislada)

## Dónde
Se crea una **copia aislada** del proyecto (borrador) con su propia base de datos. Tus datos reales (Poza de Relaves, usuarios, catálogos) no se tocan. Al terminar recibirás un informe; la copia puede descartarse sin afectar nada.

## Empresa de prueba
"CONSTRUCTORA DEMO ANDINA SAC" (RUC ficticio), con cuenta bancaria, cuenta BN de detracciones y usuarios de prueba con los tres roles (Gerente, Administrador, Ingeniero).

## Flujos a probar (en pantalla, como un usuario real)
1. **Cotización a obra**: insumos (materiales, mano de obra, equipos, subcontratos), márgenes APU, cotización multidisciplinaria con partidas y APU, PDF/Excel, aprobación y conversión a proyecto con sus partidas y techo de costo directo.
2. **Compras y bloqueos**: requerimiento desde la cotización aprobada, orden de compra, compras por rubro hasta superar el 10%, verificación del bloqueo, solicitud y aprobación de Gerencia, registro de la compra autorizada y edición.
3. **Personal y tareo**: trabajadores obreros, staff y locador, tareo diario y vehicular, boletas de nómina, recibos por honorarios, validación y registro de pago.
4. **Ventas y tesorería**: factura con detracción, cobranza, gastos generales al contado y a crédito, cuentas por pagar, flujo de caja, caja chica, y revisión de ambos dashboards (CD, GG, utilidad real, semáforos, gráfico de gastos generales).

## Entregable
- Informe PDF con lo que funcionó, los errores encontrados (con capturas) y su prioridad.
- Los errores se corrigen en la copia; tú decides si se aplican al sistema real.

## Detalles técnicos
- Se usa `drafts--create` con backend aislado; datos de demostración insertados vía SQL en el borrador y flujos recorridos con Playwright usando sesiones de prueba (`lovable auth-session`).
- Sin llamadas pagadas a Decolecta/SUNAT: tipo de cambio y comisiones AFP se cargan manualmente; emisión SUNAT/SIRE se prueba solo hasta la generación del documento.
