# Dossier APU desde la vista de impresión (incluye revisiones históricas)

## Qué cambia
1. En la **Vista previa A4** de cualquier cotización, actual o histórica (Rev. 00, 01…), aparece un botón **«Dossier APU»** junto a «Descargar PDF». Abre el dossier de esa misma revisión, con sus partidas y análisis guardados.
2. El Dossier APU tiene **«Volver a la vista previa»**, que regresa a la misma revisión.
3. Nuevo botón **«PDF cotización + dossier»** en la vista previa: descarga un solo PDF con la cotización y, a continuación, el Dossier APU de esa revisión.
4. Las revisiones históricas siguen siendo de solo lectura: solo se ven y se imprimen.

## Detalles técnicos
- `cotizacion-vista.tsx`: un `Link` a `/apu-vista` con `{ id, item: "" }` en la barra `no-print`, y la acción del PDF combinado. Esta acción carga el dossier en un iframe oculto (`/apu-vista?id=…`), captura sus hojas con el mismo html2canvas + `onclone` (de oklab a RGB) y las añade al `jsPDF` de la cotización; cada hoja conserva su orientación.
- `apu-vista.tsx`: el botón Volver apunta a `/cotizacion-vista?id=…`. El dossier ya filtra por `cotizacion_id`, así que cada revisión muestra sus propios datos.
- No hay cambios en la base de datos.
