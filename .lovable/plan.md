# Factura: ubicación elegible de una lista y una sola hoja para editar e imprimir

## 1. Departamento, Provincia y Distrito desde listas de Perú
- En el editor, los tres campos pasan de texto libre a listas desplegables encadenadas:
  - Departamento: los 25 departamentos (incluye Callao).
  - Provincia: solo las provincias del departamento elegido.
  - Distrito: solo los distritos de la provincia elegida.
- Si cambias el departamento, se limpian la provincia y el distrito; si cambias la provincia, se limpia el distrito.
- Al buscar un RUC, lo que trae SUNAT se busca en la lista sin importar mayúsculas ni tildes («JUNIN» = «Junín») y queda seleccionado. Si no se encuentra, el campo queda vacío para elegirlo a mano.
- Las facturas guardadas no cambian. Si un nombre antiguo no está en la lista, se sigue mostrando hasta que lo cambies.
- Las mismas listas se usarán en el encabezado de la cotización, donde también están estos campos.

## 2. La impresión igual al modo edición
Hoy la vista previa/impresión y el editor se dibujan por separado, por eso se ven distintos (posiciones, tamaños, recuadros).
- La vista previa y la impresión usarán la misma hoja del editor en modo solo lectura. En ese modo los campos se muestran como texto, sin casillas, flechas ni botones.
- Así, cualquier ajuste futuro del formato aparece igual en ambos lugares.
- El PDF descargado se revisará contra esa misma hoja y se corregirán las diferencias que queden.

## Detalles técnicos
- Catálogo de ubigeo INEI (departamento > provincia > distrito, con código) en un archivo estático que se carga solo cuando se necesita. Lo leen un componente `SelectorUbigeo` y helpers puros de búsqueda que pliegan mayúsculas y tildes (claveNombre). Las columnas actuales de texto se mantienen y no hace falta migración.
- `HojaComprobante` recibe la prop `soloLectura`. `comprobante-vista.tsx` arma la hoja desde el comprobante guardado y la renderiza dentro de `#comprobante-impresion`, así el flujo de impresión actual se mantiene. Se retira el marcado duplicado de la vista previa.
- Se añaden pruebas para la búsqueda de ubigeo (match con o sin tildes, cascada) y una verificación con Playwright comparando el editor con la vista previa.
