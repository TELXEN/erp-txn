# Información del crédito dentro de FORMA DE PAGO

Aplica en editor, vista previa, impresión y PDF.

1. **Recuadro FORMA DE PAGO**: cuando la condición es Crédito, dentro del mismo rectángulo va toda la información del crédito, con el formato de la imagen:

```text
FORMA DE PAGO
Información del crédito          :
Monto neto pendiente de pago     :   $ 9,576.53
Total de Cuotas                  :   1

Nº Cuota  Fec. Venc.   Monto | Nº Cuota  Fec. Venc.  Monto | Nº Cuota  Fec. Venc.  Monto
   1      28/03/2025  9,576.53
```
   - Dos puntos alineados en la misma vertical; monto neto = total menos detracción/retención, con símbolo de moneda.
   - Cuotas en tres grupos de columnas lado a lado (1-2-3 en la primera fila, 4-5-6 en la siguiente…), fechas dd/mm/aaaa, montos a la derecha.
   - En el editor se conservan agregar/quitar cuotas y editar fecha/monto dentro de esta tabla.
2. **Quitar la palabra «Crédito»** que aparece a la derecha de FORMA DE PAGO (en el editor, la condición se sigue eligiendo en la franja fuera de la hoja).
3. **Quitar «Neto a Pagar» y su monto** del bloque de detracciones (el dato queda solo en el recuadro de crédito).
4. **Bajar el bloque de detracciones** para que su última línea quede alineada con la fila TOTAL del desglose.

Con Contado, el recuadro muestra solo FORMA DE PAGO con «Contado».

## Detalle técnico
- Archivos: comprobante-vista.tsx, ComprobantePdf.tsx, HojaComprobante.tsx; selector de condición pasa a la franja del editor.
- Helper puro `gruposCuotas(cuotas, 3)` en src/lib/facturacion.ts con prueba; neto vía netoComprobante.
- Detracción: columna izquierda con justifyContent flex-end para que su base coincida con TOTAL.
- Actualizar mem://design/comprobante-forma-pago.md.
