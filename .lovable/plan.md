# Rediseño de la pantalla Gastos Generales

Aplicar el diseño del documento subido a la pantalla Gastos Generales existente, usando los datos reales (no los montos de ejemplo) y los colores del tema activo.

## Qué verá el usuario

1. **Encabezado**: título "Gastos Generales" a la izquierda; a la derecha, filtro de rango de fechas (icono calendario, Desde/Hasta) y botón secundario "Exportar a Excel". Debajo, pestañas "Gastos generales (n)", "Mantenimiento (n)", "Combustible (n)" con los conteos reales.
2. **Indicadores en 2 columnas**:
   - Izquierda: TOTAL GASTOS grande, PAGADO en verde suave, POR PAGAR (CRÉDITO) en rojo suave (gris si es 0).
   - Derecha: lista compacta por categoría con barra horizontal proporcional y monto (incluye Mantenimiento vehicular y Combustible).
3. **Barra sobre la tabla** (una fila): selector Ámbito ("Todas las imputaciones" / proyecto / oficina), buscador amplio con lupa "Buscar por descripción o proveedor..." y, a la derecha, botón principal "+ Registrar Gasto" con el color del menú.
4. **Tabla en acordeón por categoría**:
   - Encabezado de grupo: nombre, "n comprobante(s)" y total a la derecha; se abre y cierra.
   - Columnas: Fecha, Comprobante, Detalle (descripción en negrita + línea atenuada "Imputación | Proveedor"), Estado, Monto, Acciones.
   - Estado como pastilla: verde "Pagado", ámbar "Crédito".
   - Lápiz y tacho con buen espacio, alineados a la derecha.
5. Textos secundarios con buen contraste, diseño adaptable a móvil, montos en "S/".

Las pestañas Mantenimiento y Combustible reciben el mismo estilo de tabla y estados. El registro y la edición de gastos funcionan como hoy.

## Fuera de alcance
Sin cambios en la base de datos ni en cómo se calculan o guardan los gastos.

## Detalles técnicos
- Archivo: `src/routes/_authenticated/gastos-generales.tsx` (solo presentación); se reutilizan `Panel`, `Boton`, `Etiqueta`, iconos lucide y tokens semánticos (`good`, `bad`, `primary`, nuevo token ámbar en `src/styles.css` si no existe).
- El filtro de fechas y el buscador filtran en el cliente la lista ya cargada; los indicadores se recalculan con el filtro.
- "+ Registrar Gasto" abre el formulario actual (pestaña "nuevo").
- Verificación con Playwright en escritorio y móvil.
