# Comentarios de subcategorías: ocultos en el listado, visibles en las ventanas

## Qué cambia
1. **Listado de Subcategorías** (Catálogo Técnico): cada fila muestra solo código y nombre; el comentario gris desaparece de la lista. La búsqueda sigue funcionando por nombre.
2. **Ventana de nueva/editar subcategoría**: se mantiene el campo **Comentario** (ya existe); se actualiza la nota de ayuda para decir que el comentario se muestra al registrar insumos, no en el listado.
3. **Ventana de nuevo/editar insumo**: al elegir la subcategoría aparece debajo un campo **Comentario** de solo lectura (fondo amarillo suave, letra gris) con el texto de esa subcategoría. Si la subcategoría no tiene comentario, el campo no se muestra. La tarjeta flotante al recorrer la lista se conserva.

## Detalles técnicos
- `src/components/HojaSubfamilias.tsx`: quitar el `<span>` con `s.descripcion` de la fila (línea ~112) y ajustar el texto de ayuda del campo Comentario.
- `src/components/InsumoVentana.tsx`: reemplazar la nota suelta (línea ~312) por un `Campo etiqueta="Comentario"` de solo lectura con el mismo estilo `bg-nota`.
- Sin cambios en la base de datos (sigue usando `subfamilias_insumo.descripcion`).
- Actualizar `mem://features/subfamilia-comentario.md`.
