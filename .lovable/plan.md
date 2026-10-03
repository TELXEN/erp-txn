# INSUMO vinculado al Maestro de insumos y alineación de la fila de compra

## Objetivo
En Costos Directos, la fila de captura de compra debe sugerir insumos del **Maestro de insumos completo** (todos los tipos), no solo del APU de la partida, y la fila debe quedar con alineación consistente.

## Cambios

### 1. Origen de sugerencias de INSUMO
- Reemplazar la consulta `apu_insumos_compras` (join a `apu_componentes`) por una consulta directa a `insumos` (id, descripcion, tipo, codigo), ordenada por descripción.
- El buscador `AutoInsumo` recibe el maestro completo: al escribir, filtra por descripción o código (sin tildes, sin mayúsculas), mostrando código + descripción + tipo en cada sugerencia.
- Al elegir un insumo se guarda `insumo_id` y el rubro se deriva de su tipo (como hoy); texto libre sigue permitido (rubro Materiales).
- La columna Insumo del historial de compras usa el mismo mapa del maestro, así los nombres siempre se muestran (hoy sale «—» si el insumo no está en ningún APU).

### 2. Justificación de la fila
- Textos (fecha, comprobante, proveedor, insumo, pago, banco) alineados a la izquierda.
- Cantidad, P.U. compra y Total alineados a la derecha (ya lo están; se verifica visualmente).
- Revisar que las etiquetas en mayúsculas y los campos queden alineados en una sola línea en pantalla ancha y en dos líneas ordenadas en pantalla angosta.

## Verificación
- Vista previa: escribir en INSUMO muestra sugerencias del maestro aunque la partida no tenga APU; elegir una la vincula (aparece su nombre en el historial); Enter/✓ registra; números a la derecha.
- Limpiar cualquier compra de prueba creada.
- Compilación y tipos sin errores.

## Detalles técnicos
- Archivo: `src/routes/_authenticated/gastos-directos.tsx` (consulta, `AutoInsumo`, `nombreInsumo`).
- Sin cambios de base de datos.
