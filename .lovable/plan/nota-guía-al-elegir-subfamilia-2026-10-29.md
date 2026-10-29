# Nota guía al elegir subfamilia

## Qué verás
- **Ventana de insumo (nuevo o editar):** debajo del campo Subfamilia aparece una nota de fondo amarillo suave y letra gris con la explicación de la subfamilia elegida. Por ejemplo, para «20 Bandejas Portacables» dice «Tipo escalerilla pesada de aluminio/fierro galvanizado». La nota cambia cuando eliges otra subfamilia y no aparece si esa subfamilia no tiene explicación.
- **Lista desplegable de Subfamilia en las tablas del Maestro de Insumos:** cuando pasas el cursor o te mueves con las flechas por una opción, se muestra la misma nota amarilla al pie de la lista. Así puedes leer la guía antes de elegir.
- **Celda de la tabla ya elegida:** la explicación aparece como texto al pasar el cursor, para no ocupar más espacio en la fila.

## Detalle técnico
- `SelectorBuscable`: nueva propiedad opcional `nota` por opción. El pie del panel muestra la nota de la opción activa o de la elegida, con tokens semánticos: se añade un token de fondo amarillo suave (`--nota`) en styles.css y se usa `text-muted-foreground`.
- `CeldaSubfamilia`, `CeldasClasificacion` y `opcionesSubfamilia` pasan `s.descripcion` como `nota`, y también como `title` del campo.
- `InsumoVentana`: debajo del `<Select>` de Subfamilia se muestra la caja de nota con la descripción de la subfamilia elegida.
