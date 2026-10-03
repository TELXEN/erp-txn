# Rediseño de Control por Partida y Registro de Compras

## Qué cambia para el usuario
Costos Directos se ve más ordenado: el resumen de cada partida queda separado de sus compras, el consumo se muestra con una barra de color y las compras se registran en una ventana con más espacio, sin la fila de captura apretada dentro de la tabla.

## 1. Tablas más claras
- La tabla de compras de cada partida (al expandirla) tiene su propio encabezado con fondo gris suave: FECHA · COMPROBANTE · PROVEEDOR · INSUMO · PAGO · BANCO · CANTIDAD · P.U. COMPRA · COSTO REAL · acciones. Así no se confunde con el encabezado de las partidas.
- El badge de «% consumo» pasa a ser una **barra de progreso pequeña con el porcentaje**:
  - verde por debajo del 80 %
  - amarillo entre 80 % y 100 %
  - rojo por encima del 100 %
- Fechas en formato peruano DD/MM/AAAA en todo el historial.
- INSUMO siempre se muestra en MAYÚSCULAS.

## 2. Ventana «Registrar compra» (en lugar de la fila en línea)
- «+ Compra» en la fila de la partida o «+ Añadir otra compra» dentro de la partida abren una ventana.
- **Arriba:** resumen de la partida (CÓDIGO, PARTIDA, UND., PRESUPUESTO, COSTO REAL, SALDO y barra de consumo).
- **Campos**, ordenados en una cuadrícula fija: FECHA (DD/MM/AAAA, hoy por defecto) · COMPROBANTE · PROVEEDOR · INSUMO (buscador del Maestro de insumos; también acepta texto libre, que se guarda en MAYÚSCULAS) · PAGO (Contado/Crédito) · BANCO (cuenta y N° de operación si es Contado; días y vencimiento si es Crédito) · CANTIDAD · P.U. COMPRA · **COSTO REAL** (bloqueado y calculado al momento como Cantidad × P.U.).
- **Vista previa en vivo:** muestra cómo quedarían el costo real, el saldo y el % de consumo si se registra la compra. Si el saldo se volvería negativo, aparece en rojo suave con el aviso «Sobregiro de S/ X».
- Botones **Guardar** (o Enter) y **Cancelar**, con estilo claro. Tras guardar, la ventana sigue abierta con los campos limpios para registrar otra compra y muestra el aviso «Compra registrada». Se cierra con Cancelar, X, clic fuera o Escape.
- Se mantienen las validaciones actuales.

## 3. Cálculos automáticos
- Al guardar o eliminar una compra se recalculan enseguida, sin recargar la página: el costo real de la partida (suma de sus compras), el costo real del grupo (por ejemplo, SUMINISTRO DE TABLEROS), el saldo (Presupuesto − Costo real) y el % de consumo (Costo real ÷ Presupuesto × 100).
- El saldo negativo se resalta en rojo suave con la etiqueta «Sobregiro».
- Los montos se calculan en céntimos enteros para evitar errores de redondeo y se muestran siempre como «S/ 0.00».

## 4. Pago y banco
- Pago (Contado/Crédito), cuenta bancaria y N° de operación siguen guardándose en campos separados, como hoy. Así Tesorería puede seguir leyéndolos sin cambios.

## Fuera de alcance
- No hay cambios en la base de datos ni en Exportar a Excel.
- El término «Emisión de comprobantes electrónicos» corresponde a otro módulo. Aquí solo se revisa que no aparezca otro nombre en este módulo.

## Detalles técnicos
- Archivo: `src/routes/_authenticated/gastos-directos.tsx`.
  - Se quitan el estado multi-fila `filas`, `FilaCompra` en línea y los botones ✓/✕.
  - Se crea un modal propio (`fixed inset-0 z-50`, el mismo patrón que ApuPartida) que reutiliza `AutoInsumo`, PLAZOS/`datosCondicion` y el cálculo del rubro por tipo.
- Componentes nuevos dentro del mismo archivo: `BarraConsumo` y `ResumenPartida`.
  - Los colores salen de los tokens `good`, `bad` y `accent`; si hace falta, se añade un token de advertencia en styles.css.
- Fecha: se cambia el input nativo por el datepicker de shadcn (Popover + Calendar) con formato `dd/MM/yyyy` de date-fns, para que se vea igual en cualquier navegador.
- Redondeo: helper `cent = (n) => Math.round(n * 100)`. Las sumas se hacen en enteros y se dividen entre 100 para mostrarlas. No hace falta Big.js.
- Los totales ya se derivan de la consulta de compras. Después de guardar o eliminar se invalida esa consulta, así que la partida y el grupo se actualizan solos.

## Verificación
- Con Playwright en /gastos-directos:
  - abrir la ventana y registrar dos compras seguidas, una al Contado y otra a Crédito
  - comprobar el costo real bloqueado, la barra y el aviso de sobregiro
  - comprobar que la partida y el grupo se actualizan y que las fechas salen en DD/MM/AAAA
  - eliminar las compras de prueba
- Revisión de tipos y compilación sin errores.
