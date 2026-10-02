# Tipos de insumo dinámicos (crear nuevos tipos con el botón +)

## Objetivo
El botón **+** de «Codificación automática de insumos» permitirá crear un **tipo de insumo nuevo e independiente** (al mismo nivel que Mano de obra, Materiales, Equipos y maquinaria, Herramientas manuales y Subcontratos). El tipo nuevo:

- Aparece como **pestaña propia en el Maestro de insumos** con su captura WYSIWYG.
- Tiene **dígito de código automático** (siguiente libre: 6, 7, 8, 9), editable después con el lápiz.
- Tiene su **propio correlativo** y genera códigos de 8 dígitos como los demás.
- Tiene **grupo propio en los totales del APU** (columna y subtotal independientes).
- Tiene su **propio margen** en Márgenes APU (editable solo por Gerente).

## Cambios en la base de datos (una migración)

1. **Nueva tabla `tipos_insumo`**: clave (texto corto único, ej. `MO`, `MAT`, `T6`), nombre visible, dígito (0–9 único), correlativo, orden, marca de sistema. Con GRANTs, RLS (lectura a usuarios conectados; crear/editar/borrar solo Administrador y Gerente) y trigger de `updated_at`.
2. **Semilla**: los 5 tipos actuales se insertan como filas de sistema (no borrables ni renombrables en clave), copiando dígitos y correlativos actuales de `codificacion_insumo`.
3. **`siguiente_codigo_insumo(_tipo)`** se reescribe: valida el tipo contra `tipos_insumo`, incrementa su correlativo con bloqueo de fila y devuelve dígito + correlativo de 7 cifras (mismo formato actual).
4. **`recodificar_wbs()`** se reescribe: el dígito de cada partida se obtiene del tipo vía `tipos_insumo` (join por clave) en lugar del CASE fijo MO/MAT/EQ/HT/SC.
5. **Trigger de protección** en `tipos_insumo`: los tipos de sistema no se pueden borrar ni cambiar de clave; un tipo personalizado solo se borra si no tiene insumos asociados.
6. `margenes_insumo`: al crear un tipo nuevo se inserta su fila de margen con valor por defecto (0 %).

## Cambios en la aplicación

1. **`src/lib/apu.ts`**: `TIPOS_INSUMO` deja de ser una lista fija; pasa a un hook/consulta `useTiposInsumo()` que lee la tabla `tipos_insumo` (con caché de React Query). `TipoInsumo` pasa de unión fija a `string`.
2. **`CodificacionInsumos.tsx`**: la tabla se alimenta de `tipos_insumo`; el botón **+** del encabezado (junto al título) abre la fila de captura para un tipo nuevo (nombre + clave sugerida automática); dígito se asigna solo (siguiente libre) y queda editable con el lápiz; botón eliminar por fila solo en tipos personalizados sin insumos.
3. **`Insumos.tsx` (Maestro de insumos)**: pestañas dinámicas según `tipos_insumo` (los 5 de sistema primero, luego los personalizados); cada tipo nuevo usa la tabla WYSIWYG genérica (código, descripción, unidad, C. unitario, margen, P. venta).
4. **`MargenesApu.tsx`**: una fila de margen por cada tipo de la tabla, incluidos los nuevos.
5. **`ApuPartida.tsx` / `calcularApu`**: los totales por tipo se calculan de forma dinámica (agrupación por tipo en vez de las 5 sumas fijas); la ventana APU muestra un subtotal por cada tipo presente en la partida.
6. **`CotizacionHoja.tsx`, `apu-vista.tsx` (dossier), `BuscadorInsumo.tsx`, `requerimientos.tsx`**: reemplazan las referencias a la lista fija por la consulta dinámica (etiquetas, filtros por tipo, agrupaciones).
7. **Partidas maestras**: el selector de tipo de partida incluye los tipos nuevos; la recodificación usa su dígito.

## Lo que no cambia

- Formato de código de insumo (dígito + 7 cifras) y de partidas (T + especialidad + categoría + correlativo).
- Los 5 tipos actuales conservan clave, dígito, correlativos y márgenes.
- Herramientas manuales sigue con su % de MO propio.
- Los insumos, partidas y APU existentes no se modifican.

## Verificación

- `tsgo --noEmit` y build limpios.
- Playwright: crear un tipo nuevo («Mano de obra especializada»), comprobar que aparece como pestaña en el maestro, registrar un insumo (código con dígito 6), usarlo en un APU y ver su subtotal propio, y verificar su margen en Márgenes APU.
