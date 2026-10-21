# Barra de iconos a la derecha en todo el ERP

Las pantallas que aún tienen botones de editar/eliminar dentro de cada fila pasan al mismo formato que Cotizaciones y Banco APU: hoja limpia, clic en fila para seleccionar (resaltada), doble clic para editar, y columna vertical fija a la derecha con Agregar, Editar, Copiar (si aplica) y Eliminar (rojo), con el estilo nítido ya aprobado.

## Pantallas a convertir (por etapas)
1. **Comercial y catálogos:** Clientes y Proveedores, Cuentas bancarias, Rubros de ingreso, Codificación de documentos, Codificación de insumos, Usuarios y roles.
2. **Obras y costos:** Obras (proyectos), Gastos directos, Gastos generales, Requerimientos, Órdenes de compra, Almacén, Importaciones, Preliquidaciones.
3. **Personal:** Personal, Tareo, Vehículos, Nómina, Honorarios, Beneficios, EMO.
4. **Finanzas:** Caja chica, Facturación electrónica.

## Reglas
- Editar, Copiar y Eliminar se activan solo con una fila seleccionada; los tooltips dicen el objeto («Editar cliente»).
- Copiar solo donde tiene sentido (registros de catálogo); en documentos emitidos (facturas, boletas, pagos) no se ofrece Copiar, y Eliminar respeta los bloqueos actuales (por ejemplo, nómina cerrada).
- Acciones especiales de cada pantalla (ver PDF, pagar, validar, convertir) se agrupan en un bloque inferior de la barra, igual que «Documento» en Cotizaciones.
- Las ventanas de alta/edición actuales se reutilizan; no cambian datos ni reglas del negocio.
- Las hojas internas de edición (APU dentro de cotización, hoja de preliquidación, detalle de comprobante) mantienen sus controles por fila.

## Detalles técnicos
- Generalizar `BarraIconosHoja` para aceptar `copiar` opcional y `extras` (bloque inferior), usando `BarraLateralIconos`/`BotonIcono variante="barra"`.
- En cada pantalla: estado `sel`, fila resaltada `bg-primary/10`, quitar columna de acciones, layout `flex items-start gap-3`.
- Sin cambios de base de datos. Verificación por captura en una pantalla de cada etapa, sin ejecutar eliminaciones reales.
