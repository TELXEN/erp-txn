# Borrador, edición y confirmación en Generar Requerimiento

## Qué cambia
1. **Guardar como borrador**: las ventanas «Requerimiento por rubro» y «Términos de referencia» tendrán dos botones: «Guardar borrador» (estado Borrador, no llega a Gerencia ni suma a la alerta de Aprobaciones) y «Enviar a Gerencia».
2. **Confirmación al enviar**: al pulsar «Enviar a Gerencia» aparece un aviso: «¿Estás seguro de enviar el requerimiento REQ-… a Gerencia? Una vez enviado no podrás editarlo.» con Cancelar / Sí, enviar.
3. **Icono Editar** (lápiz) en la barra derecha: opaco sin selección; activo al seleccionar un requerimiento en Borrador o Rechazado. Abre la misma ventana con rubro, obra, ítems y observación cargados; desde ahí se vuelve a guardar como borrador o se envía (con la misma confirmación). En Rechazado, reenviar limpia el motivo de rechazo.
4. **Icono Eliminar siempre visible**: se muestra opaco (desactivado) mientras no haya fila seleccionada, o si el requerimiento seleccionado no se puede borrar; se activa al seleccionar uno permitido (Borrador, Enviado a Gerencia o Rechazado; Gerencia cualquiera). Sigue al final de la barra.
5. En la lista, los borradores muestran la etiqueta «Borrador» en gris.

## Detalles técnicos
- `estado` es texto libre: no requiere migración; nuevo valor «Borrador».
- `VentanaRequerimientoRubro`: prop opcional `editar` (requerimiento + ítems); al guardar, update del encabezado y reemplazo de ítems en lugar de insert; parámetro de estado destino.
- TDR en `generar-requerimiento.tsx`: mismo patrón (borrador / editar / confirmar).
- `BarraIconosHoja`: añadir prop `eliminarHabilitado` para renderizar el botón aunque no aplique (disabled), sin afectar otras pantallas.
- Confirmación con el diálogo de alerta existente (AlertDialog).
- Verificar con Playwright: crear borrador, editarlo, enviarlo con confirmación, comprobar estados del icono eliminar.
