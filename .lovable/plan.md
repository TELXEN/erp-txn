# Registro de Marcas y columna MARCA en Materiales

## Qué verá el usuario
- **Catálogos Maestros › Marcas**: nueva lista con los iconos añadir, editar y eliminar (igual que Prioridades y Tipos de presupuesto). Gerente y Administrador gestionan; los demás solo consultan.
- **Maestro de insumos › Materiales**: nueva columna **MARCA** justo después de DESCRIPCIÓN. Columnas: CÓDIGO, DESCRIPCIÓN, MARCA, UNIDAD, P. COMPRA, MARGEN %, C. UNITARIO.
  - Se elige de un desplegable con las marcas activas del catálogo.
  - Si no se elige ninguna, se muestra y guarda "-".
  - Editable en línea y en la fila de captura, como el resto de celdas.
- Si se elimina una marca usada, los materiales que la tenían vuelven a mostrar "-".

## Detalles técnicos
- Migración: tabla `marcas` (nombre único, activo, orden, timestamps + trigger updated_at), GRANTs, RLS (lectura autenticados; escritura `is_admin_o_gerente`).
- Columna `insumos.marca_id uuid null` con FK a `marcas(id) ON DELETE SET NULL`; null se representa como "-" en la interfaz.
- `src/lib/datos.ts`: hook `useMarcas` con query `["marcas"]`.
- `src/routes/_authenticated/datos.tsx`: nueva sección Marcas usando `ListaEditable`.
- `src/components/Insumos.tsx` (`MaterialesWysiwyg`): columna MARCA con select, valor por defecto "-", incluida en guardado/edición.
