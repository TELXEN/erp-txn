# Rediseño de Caja Chica

Pantalla más limpia: el formulario de nueva entrega pasa a una ventana, y las cajas se muestran en una tabla. Mismos datos, mismo guardado, sin cambios de base de datos.

## Qué cambia

1. **Encabezado y totales**
   - Título «Caja Chica» a la izquierda.
   - 3 tarjetas con montos grandes: ENTREGADO EN EFECTIVO, RENDIDO CON COMPROBANTES y PENDIENTE POR RENDIR (con «n caja(s) abierta(s)» en gris).

2. **Barra sobre la tabla**
   - Izquierda: buscador amplio con lupa («Buscar por responsable, obra o número de operación…»). Ahora también busca por N° de operación.
   - Derecha: «Exportar a Excel» (se mueve aquí desde el encabezado) y el botón principal «+ Nueva Entrega de Efectivo», con el color del menú.

3. **Tabla de cajas chicas**
   - Columnas: Líder responsable (negrita) · Obra / Detalle (obra + motivo en gris) · Fecha de entrega (DD/MM/AAAA) · Origen / Operación («BCP • Op. 235124») · Monto entregado · Rendido · Saldo (más destacado) · Estado.
   - Montos alineados a la derecha. Estado como pastilla: «Abierta» en azul claro y «Liquidada» en verde. Si hay que devolver dinero, el saldo sale en rojo como «Reembolsar».
   - Al pulsar una fila se sigue abriendo debajo su detalle: rendiciones, registro de comprobantes, y los botones liquidar, reabrir y eliminar, igual que hoy.
   - En móvil, la tabla se puede desplazar hacia los lados.

4. **Ventana «Nueva entrega de efectivo»**
   - Fondo oscurecido, botón X y cierre al hacer clic fuera.
   - Arriba, un aviso azul suave: «Nota: El efectivo entregado aún no es costo de obra: se convierte en costo directo o gasto general recién cuando se rinde cada comprobante.»
   - Campos en 2 columnas: Obra, Monto entregado (S/) y Fecha de entrega a la izquierda; Líder responsable, Motivo y Cuenta bancaria de origen a la derecha. N° de operación bancaria ocupa todo el ancho.
   - Abajo a la derecha: «Cancelar» y «Registrar entrega». Al guardar bien, la ventana se cierra; si hay un error, se muestra dentro de la ventana.
   - El formulario fijo que hoy aparece en la página se elimina.

## Detalles técnicos
- Solo cambia `src/routes/_authenticated/caja-chica.tsx`. `crearCaja` sigue igual y solo cierra la ventana cuando el guardado sale bien.
- La ventana usa el mismo estilo de ventana que ya usa el proyecto (`fixed inset-0 z-50 bg-foreground/40`). La tabla usa tokens semánticos, y la pastilla azul usa el token de información existente, o uno nuevo `--info` en styles.css si no existe.
- Se conservan la búsqueda, `Resaltar`, la exportación y la lógica de rendición.
