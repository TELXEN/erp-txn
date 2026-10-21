# Cabecera de edición de cotización más limpia

Hoy la barra superior tiene 9–11 controles: Volver, Vigencia, Revisión, Estado, Nueva revisión, Encabezado, Vista previa A4, Dossier APU, Guardar como plantilla, Excel y Convertir en obra. La propuesta deja arriba solo lo que se usa a diario y pasa el resto a iconos en la columna derecha.

## Barra superior (se queda)
- **Volver**
- **Vigencia**, solo como etiqueta informativa
- **Revisión**: el selector Rev. 00 / 01 / 02 (aparece solo si hay varias)
- **Estado**: Borrador, Enviada, Aprobada…
- **Encabezado**: es lo más usado al editar
- **Vista previa A4**
- **Convertir en obra**: único botón de color sólido; se activa solo si la cotización está aprobada

Pasa de 11 a 7 controles. En pantallas angostas caben en una sola línea.

## Columna derecha de iconos (se añade un bloque abajo)
La columna actual (Agregar, Editar, Copiar, Subir, Bajar, Eliminar) actúa sobre la fila elegida. Debajo, separado por una línea, va un bloque nuevo **«Documento»** que actúa sobre toda la cotización y siempre está activo:

```text
 [+]  Agregar
 [✎]  Editar
 [⧉]  Copiar
 ───
 [↑]  Subir
 [↓]  Bajar
 ───
 [🗑]  Eliminar
 ═══  Documento
 [⟲]  Nueva revisión
 [∑]  Dossier APU
 [▤]  Guardar como plantilla
 [⤓]  Exportar a Excel
```

- Cada icono muestra al pasar el mouse un aviso con su nombre, por ejemplo «Exportar a Excel».
- «Nueva revisión» pide confirmación antes de clonar. Se oculta si no es la última revisión o si ya hay obra generada (la misma regla de hoy).
- El clic derecho sobre la hoja también incluirá estas cuatro opciones en una sección «Documento».

## Sin cambios
Lo que hace cada botón, los permisos, los datos y la vista previa siguen igual. Solo cambia dónde está cada botón.

## Detalles técnicos
- `src/routes/_authenticated/cotizaciones.tsx`: quitar de `acciones` Nueva revisión, Dossier APU, Guardar como plantilla y Excel. Pasarlos a `HojaNiveles` con una prop `accionesDocumento: { etiqueta, icono, onClick, oculto? }[]`.
- `src/components/cotizaciones/HojaNiveles.tsx`: dibujar esas acciones al final de `barra` con `BotonIcono` (iconos lucide `History`, `Calculator`, `Library`, `FileSpreadsheet`), y agregarlas al menú contextual.
- Revisar en pantalla con TXN26-C004 sin pulsar acciones que cambien datos.
