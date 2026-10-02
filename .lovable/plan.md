# Captura WYSIWYG superior en todo Análisis de Precios Unitarios

## Objetivo
Que todas las pantallas de APU capturen datos igual que el Registro de partidas: una fila de captura fija en la parte superior de la tabla (bajo el encabezado), sin formularios separados.

## Cambios

### 1. Maestro de insumos (`src/components/Insumos.tsx`)
Mover la fila fantasma (punteada) de captura desde el pie del `<tbody>` a la **primera fila del tbody** en las cuatro tablas:
- **ManoObraWysiwyg**: fila de captura + su fila de vista previa del Costo HH van arriba, antes de los registros.
- **MaterialesWysiwyg** (Materiales y Subcontratos): fila de captura arriba.
- **EquiposWysiwyg**: fila de captura arriba.
- **HerramientasWysiwyg**: fila de captura arriba.
- Al guardar con Enter, la fila de captura queda lista para seguir capturando (ya funciona así).
- El formulario genérico superior (rama "Nuevo insumo") ya no se alcanza porque todos los tipos tienen tabla propia; se elimina esa rama muerta junto con `crear`, `form` y estados asociados si quedan sin uso.

### 2. Especialidades de partidas (`src/components/EspecialidadesPartida.tsx`)
- Eliminar el panel "Nuevo registro de especialidades".
- Añadir fila de captura como primera fila del listado: campo Nombre; Enter guarda (código y orden automáticos, recodificación WBS incluida).
- Se conservan edición en línea, selección de fila, flechas de orden y borrado.

### 3. Categorías de partidas (`src/components/CategoriasPartida.tsx`)
- Eliminar el panel "Nuevo registro de categorías".
- Fila de captura superior con Especialidad (selector) + Nombre; Enter guarda. La especialidad elegida se conserva para capturas seguidas.
- Se conservan filtro por especialidad, flechas, edición en línea y borrado.

### 4. Unidades de medida (`src/components/UnidadesMedida.tsx`)
- Eliminar el panel "Nueva unidad de medida".
- Fila de captura superior con Símbolo, Descripción y Orden (orden por defecto = siguiente); Enter guarda.

## Verificación
- `bunx tsgo --noEmit` limpio y build OK.
- Playwright en `/datos-apu`: crear y borrar un registro de prueba en cada pantalla (insumo, especialidad, categoría, unidad) desde la fila superior, dejando los datos limpios.
