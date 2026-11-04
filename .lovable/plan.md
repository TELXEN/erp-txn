# Mejorar el encabezado de la cotización

## Situación actual
El encabezado tiene tres columnas: logo pequeño (96 px), datos de la empresa alineados a la derecha (al centro de la hoja) y un recuadro verde con COTIZACIÓN, RUC, código y debajo «Hoja X de Y» y la revisión. Problemas: los datos de la empresa quedan pegados al recuadro y lejos del logo, «COTIZACIÓN» se ve en letra fina y pequeña (10 px), el RUC está dentro del recuadro del documento en lugar de junto a la empresa, y la fecha no aparece en el encabezado.

## Propuesta

```text
+--------------------------------------------------------------------------+
| [LOGO]  TELXEN SAC                              +----------------------+ |
|         Soluciones integrales en energía...     |     COTIZACIÓN       | |
|         RUC 20xxxxxxxxx                          |    TXN26-C010        | |
|         Dirección · web                          | Rev. 00 · 03/11/2026 | |
|                                                  +----------------------+ |
|=========================== línea del color del tema =====================|
|                                                       Hoja 1 de 2        |
+--------------------------------------------------------------------------+
```

1. Bloque de empresa a la izquierda, junto al logo (alineado a la izquierda): razón social en negrita, eslogan, RUC, dirección y web en una línea separada por «·».
2. Logo un poco más grande (hasta 120 × 64 px) y centrado verticalmente con el texto.
3. Recuadro del documento a la derecha, más compacto (~200 px):
   - «COTIZACIÓN» en negrita y mayor tamaño.
   - Código destacado (13 px, negrita).
   - Revisión y fecha de emisión en una línea; si es retomada, la nota debajo.
4. Línea inferior del color del tema (se mantiene) y «Hoja X de Y» a la derecha, debajo de la línea.
5. Se conservan colores y fuente de documento-tema.ts, para que vista previa, impresión y PDF salgan iguales.

## Detalles técnicos
- Solo se cambia `encabezadoHoja` en `src/routes/_authenticated/cotizacion-vista.tsx`.
- La altura total del encabezado se mantiene similar para no alterar la paginación (que mide el encabezado de la primera hoja).
- Verificación con capturas de la vista previa en A4 vertical y horizontal.
