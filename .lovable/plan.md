# Preliquidación: panel de Régimen y pago encima de «Información del crédito»

## Qué cambia (solo en el editor de preliquidación)
- El panel con Régimen, Condición de pago, Plazo y Vencimiento estimado deja de estar suelto debajo de la hoja. Pasa a ir justo encima del detalle de detracción y del recuadro «Información del crédito / del pago», en la misma zona inferior de la hoja.
- Como no se imprime, solo aparece mientras editas. En la vista previa, la impresión y el PDF sigues viendo el detalle de detracción y el recuadro de crédito, igual que ahora.
- Presentación más ordenada:
  - Recuadro redondeado con borde gris tenue y fondo muy claro, del mismo ancho que el recuadro de crédito, con el título pequeño «CONDICIONES DE PAGO» en gris.
  - Dos columnas: Régimen y % aplicado a la izquierda; Condición de pago, Plazo (lista + días) y Vencimiento estimado a la derecha.
  - Las etiquetas van en gris, a ancho fijo y con los dos puntos alineados. Los valores van en negrita, alineados a la izquierda (sin quedar pegados al borde derecho).
  - Si eliges Contado, se ocultan Plazo y Vencimiento y el recuadro se acorta.
  - Si Régimen está en «No aplica», el % queda atenuado.
- Los cálculos, el guardado y las opciones de las listas no cambian.

## Botones fijos arriba
- «Guardar borrador» (o «Guardar cambios») y «Cancelar» pasan a la cabecera del editor, al lado de «Cerrar editor». Desaparecen de debajo de la hoja.
- La cabecera queda fija: se mantiene visible mientras te desplazas por la hoja.

## Detalle técnico
- `HojaPreliquidacion.tsx`: dejar de renderizar `props.editorCondicion` tras la hoja y renderizarlo dentro del bloque absoluto inferior, antes del bloque de detracción, solo si `editable`. Envolverlo en un contenedor con estilo de recuadro y una clase de exclusión de impresión (no forma parte del A4 impreso; la vista previa usa `editable=false`).
- La hoja tiene posición absoluta abajo. Si el bloque crece, se reserva altura extra en edición con `paddingBottom` en la hoja para que no tape el desglose.
- `Preliquidaciones.tsx`: rehacer el JSX de `editorCondicion` como una grilla de 2 columnas, con filas `etiqueta 110px | : | valor` y los mismos controles/handlers (`edHoja`), y tamaño de letra 10.
- `Preliquidaciones.tsx`: darle a `<form>` un `id`. Mover los botones al `extra` del `Panel` (Guardar con `type="submit" form={id}`, más Cancelar y Cerrar editor) y quitarlos del pie. La cabecera del Panel queda `sticky top-0 z-10 bg-card` dentro del contenedor que se desplaza, y el mensaje de error sigue bajo la hoja.
- Añadir la tarea en roadmap.md.
