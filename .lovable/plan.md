# Ajustes finos de tipografía en el comprobante

Aplicar cuatro retoques de tamaño y espaciado en la hoja del comprobante, manteniendo la paridad entre edición, vista A4 y PDF, y sin tocar cálculos, datos ni el pie fijo por página.

## Cambios

1. **Cabecera de la tabla de ítems** (fila «#, Código, Descripción, Unidad, Cantidad, Valor unitario, Descuento, Importe total»): bajar 1 punto el tamaño de letra (de 9 a 8).
2. **Descripción de cada ítem**: bajar 1 punto el tamaño de letra de la celda de descripción (de 9 a 8); el resto de columnas conserva su tamaño.
3. **Descripción del desglose**: desplazar el texto de la descripción un poco hacia la derecha (aumentar el sangrado izquierdo de esa celda) para separarla de la columna Código.
4. **Régimen tributario**: bajar 1 punto el tamaño de letra del bloque (título y valores) y reducir el interlineado para que el bloque quede más compacto.

## Detalles técnicos

- `src/components/facturacion/HojaComprobante.tsx` (edición): cabecera de tabla `fontSize 9 → 8`; celda de descripción con `fontSize 8` y `paddingLeft` mayor; bloque RÉGIMEN TRIBUTARIO `fontSize 9.5 → 8.5` y `lineHeight 1.2 → 1.1`.
- `src/routes/_authenticated/comprobante-vista.tsx` (vista A4): mismos ajustes en cabecera, descripción y bloque de régimen.
- `src/components/ComprobantePdf.tsx` (PDF): `s.th` `fontSize 9 → 8`; celda de descripción con `fontSize 8` y padding izquierdo extra; textos del bloque régimen (`s.cardValue`, `s.sub` dentro de la card) `9 → 8` con `lineHeight 1.35 → 1.15`.
- Verificar con la vista previa y descarga del PDF que el pie fijo sigue intacto en cada página.
