# Factura: el editor igual a la vista de impresión

La vista de impresión no se toca. El editor se ajusta para verse como ella.

## Qué cambia en el editor
- El editor ya no es una hoja A4 pequeña: ocupa todo el ancho de la ventana y escala la hoja en proporción, así el diseño se mantiene igual a la impresión pero más grande.
- La letra crece en la misma proporción, con un mínimo de unos 13 px para que se lea bien. La impresión y el PDF no cambian de tamaño.
- Las secciones van en el mismo orden y lugar: encabezado con logo y recuadro de FACTURA ELECTRÓNICA, datos del cliente, recuadro de 5 datos, tabla de ítems, Observaciones y detracción a la izquierda con el desglose a la derecha, Forma de pago y régimen, y Cuentas bancarias.
- Se usan los mismos tamaños de letra, márgenes, anchos de columna, bordes y colores.
- La descripción de cada ítem crece hacia abajo mientras escribes: el texto largo pasa a la segunda, tercera o más líneas y la fila se agranda, sin barra de desplazamiento ni texto cortado, igual que al imprimir.
- Los campos editables quedan integrados en la hoja: sin caja ni sombra, con un subrayado tenue solo al pasar el cursor o al escribir. Así el texto queda donde aparece al imprimir.
- Los controles que solo sirven para editar (agregar o quitar ítems y cuotas, buscar RUC, elegir proyecto) quedan pequeños y discretos, junto a su sección, sin mover el diseño.
- Lo que hoy existe solo en el editor y no se imprime (por ejemplo la modalidad de anticipo) va en una franja compacta fuera de la hoja, para no alterar la página.

## Cómo se comprueba
- Capturas del editor y de la vista previa de la misma factura, comparadas sección por sección hasta que coincidan.

## Detalles técnicos
- Solo se modifica `HojaComprobante.tsx`, tomando como referencia los estilos de `comprobante-vista.tsx` (mismas constantes de `documento-tema.ts`). No se cambia la lógica de cálculo ni el guardado.
- Se usa un estilo base común para los campos (`campoHoja`: transparent, border 0, font inherit) en lugar de los estilos de casilla actuales.
- La descripción usa un textarea autoajustable (`rows=1`, altura igual a scrollHeight al escribir y al cargar, `resize: none`, `overflow: hidden`) con el mismo ajuste de línea que la vista previa (`white-space: pre-wrap`, `word-break`). Los saltos de línea se guardan.
- La hoja del editor se mide en el ancho disponible (ResizeObserver) y aplica un factor de escala a tamaños y espaciados mediante una variable CSS. No se usa zoom de imagen, así los campos siguen nítidos y editables.
- Se verifica con Playwright, con el ancho actual de 1378 px, en la factura de prueba F001-00000006.
