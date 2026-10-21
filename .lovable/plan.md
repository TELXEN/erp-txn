# Gastos generales detallados en la cotización

## Qué verá el usuario
- En la cabecera de edición de la cotización, junto a «Encabezado», un botón **Gastos generales** (también en el menú de clic derecho). Abre una ventana flotante grande, igual a las demás del ERP.
- Arriba, tarjetas de resumen: **Costo directo**, **Total gastos generales** y **% GG** (total GG ÷ costo directo × 100), calculado en vivo.
- Debajo, una hoja en árbol colapsable con la estructura del documento:
  - 1. GASTOS VARIABLES → 1.1 Licitación y contratación, 1.2 Indirectos varios
  - 2. GASTOS FIJOS → 2.1 Administración de obra (con Supervisión, Ing. de Seguridad, Ing. de Calidad), 2.2 Administración de oficina, 2.3 Financieros
- Columnas por ítem: Código, Descripción, Unidad, Cantidad, Meses (o tiempo), Precio unitario, Parcial. Subtotales por grupo y por bloque.
- Barra de iconos a la derecha (Agregar, Editar, Copiar, Eliminar, Subir, Bajar) actuando sobre la fila elegida: se pueden añadir grupos o ítems, editarlos y quitarlos. Numeración automática por posición.
- La primera vez que se abre en una cotización se precarga la estructura estándar con cantidades en cero.
- Al guardar, el % GG de la cotización se reemplaza por el % calculado, de modo que el desglose (Costo directo, GG, Utilidad, Subtotal, IGV, Total), la vista previa, el PDF y Excel usan ese valor. Si la hoja de GG queda vacía, se mantiene el % manual de hoy.
- Las revisiones copian también sus gastos generales; las revisiones anteriores los muestran solo lectura. El Dossier/vista previa puede incluir opcionalmente una hoja «Desagregado de gastos generales».

## Detalles técnicos
- Nueva tabla `cotizacion_gastos_generales` (cotizacion_id, orden, nivel `bloque|grupo|item`, descripcion, unidad, cantidad, tiempo, precio_unitario) con GRANT + RLS igual que `cotizacion_items` (personal autenticado).
- Componente `GastosGeneralesCotizacion.tsx` en VentanaFlotante; reutiliza BarraIconosHoja y lógica de orden/nivel plana similar a niveles-cotizacion.
- Al cambiar ítems: `pct_gastos_generales = round(totalGG / costoDirecto × 100, 4)` guardado en la cotización; nueva revisión clona las filas.
- Unidades desde `unidades_medida` (agregar «und-mes», «mes», «año» si faltan).
- Prueba unitaria del cálculo de % GG (ej.: GG 1,500 / CD 10,000 = 15 %).
- Verificación en pantalla con una cotización de prueba creada por SQL y borrada al final.
