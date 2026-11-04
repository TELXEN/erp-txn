# Encabezado de la cotización según la imagen de referencia

## 1. Encabezado de la hoja (todas las hojas)
```text
[LOGO]  TELXEN S.A.C                                   +--------------+
        SOLUCIONES INTEGRALES EN ENERGÍA,              |  COTIZACIÓN  |
        AUTOMATIZACIÓN Y CONTROL INDUSTRIAL            |  TXN26-C010  |
        J. Ciro Alegría 136, El Tambo, Huancayo        +--------------+
        www.telxen.com                                         Rev. 00
                                                          Hoja 1 de 2
```
- Logo a la izquierda; datos de la empresa alineados a la izquierda junto al logo (razón social en negrita, eslogan en dos líneas, dirección, web).
- Recuadro a la derecha con borde negro grueso, fondo blanco: «COTIZACIÓN» grande y el código debajo. Se quitan el fondo verde, la franja superior y el RUC de la empresa de ese recuadro.
- «Rev. 00» debajo del recuadro, a la derecha; «Hoja X de Y» debajo, pequeño.

## 2. Datos del cliente (en todas las hojas, junto al encabezado)
Se quitan los títulos actuales «Cliente», «Trabajo a cotizar» y «Configuración». Quedan tres columnas sin título, como en la imagen:
```text
RUC        : ...                                   FECHA DE EMISIÓN  : ...
CLIENTE    : ...        TELÉFONO : ...                     MONEDA    : ...
DIRECCIÓN  : ...                                 CONDICIÓN DE VENTA  : ...
ATENCIÓN   : ...                                  VALIDEZ DE OFERTA  : ...
                                                        TIPO CAMBIO  : ... (solo USD)
PROYECTO   : [ recuadro con borde negro grueso, a todo el ancho ]
```
- Condición de venta y validez (en días, con fecha de vencimiento) salen de los datos ya guardados en la cotización; teléfono del contacto del cliente. Si un dato falta se muestra «—».

## 3. Barra de título de la ventana
En la barra de título de la ventana flotante, a la derecha y alineados encima del recuadro COTIZACIÓN, se muestran dos indicadores:
- Orientación: «A4 vertical» o «A4 horizontal».
- IGV: «Con IGV (18%)» o «Sin IGV».
Se actualizan al cambiar la orientación o el IGV, en Edición y en Vista previa.

## Detalles técnicos
- `encabezadoHoja` y el bloque de `filaDato` en `src/routes/_authenticated/cotizacion-vista.tsx`; se mantienen fuente y colores de documento-tema.ts para que impresión, PDF y vista salgan iguales.
- Subtítulo de `VentanaFlotante` en `cotizaciones.tsx` / `RutaVistaCotizacion` con `orientacion` y `aplica_igv`.
- Revisar que la paginación siga midiendo bien el nuevo alto del encabezado (vertical y horizontal) con capturas y PDF.
