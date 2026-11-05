# Observaciones a la izquierda del desglose de precios

Aplica al editor, la vista previa, la impresión y el PDF de facturas, boletas y notas.

## Cambio

- Debajo de la tabla de ítems se arma una sola fila:
  - **Izquierda:** recuadro «OBSERVACIONES» alineado al margen izquierdo de la página, con el texto justificado a la izquierda y ocupando el espacio libre.
  - **Derecha:** el desglose de precios (Sub Total, IGV, Total…), igual que hoy.
- En el editor, el campo de observaciones sale de su sitio actual (debajo de las cuentas bancarias) y pasa a esa posición.
- En la vista previa y la impresión, las observaciones aparecen ahí (hoy no se muestran).
- En el PDF, salen del pie y pasan a ese mismo lugar.
- Si no hay observación, en la vista previa y el PDF el espacio queda vacío y el desglose no se mueve.

## Detalles técnicos

- `HojaComprobante.tsx`: envolver el bloque de totales (`width: 300, marginLeft: auto`) en un `display: flex; gap; align-items: flex-start` con la observación (`flex: 1`, `textAlign: left`, un textarea) a la izquierda; quitar el input de OBSERVACIONES de la línea 361.
- `comprobante-vista.tsx`: mismo envoltorio flex con `c.observacion`.
- `ComprobantePdf.tsx`: `View` en fila con la observación (`flex: 1`) y `s.totals` (quitar `marginLeft: auto`); quitar el bloque OBSERVACIONES del pie.
