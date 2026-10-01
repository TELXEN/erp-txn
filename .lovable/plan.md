# Materiales: entrada en línea estilo cotizaciones

## Qué verá el usuario
En APU › Maestro de insumos › pestaña **Materiales**, una tabla editable igual a la de Mano de obra, con columnas:

| CÓDIGO | DESCRIPCIÓN | UNIDAD | P. COMPRA | MARGEN % | C. UNITARIO | Acciones |

- **Código**: automático (20000001, 20000002…) según la codificación de Catálogos Maestros; solo lectura.
- **Descripción**: texto libre.
- **Unidad**: lista desplegable con las unidades activas de "Unidades de medida"; por defecto **und**.
- **P. Compra**: número (S/, sin IGV).
- **Margen %**: porcentaje.
- **C. Unitario**: calculado en vivo = P. Compra + P. Compra × Margen %. Es el valor que usan los APU.
- Fila punteada al pie: escribir descripción, elegir unidad, precio y margen, Enter guarda y deja otra fila lista.
- Clic en una fila la vuelve editable (Enter guarda, Escape cancela); botón borrar con confirmación.
- Se quitan la columna "Tipo" y el formulario "Nuevo insumo" en esta pestaña. Las demás pestañas (Equipos, Herramientas, Subcontratos) no cambian.

## Detalles técnicos
- `src/components/Insumos.tsx`: nuevo componente `MaterialesWysiwyg` (mismo patrón que `ManoObraWysiwyg`), renderizado cuando `filtro === "MAT"`.
- Código vía `reservarCodigoInsumo({ tipo: "MAT" })`; unidades vía `useUnidadesMedida()` (solo activas, default "und").
- Se guarda `precio` (compra) y `margen_pct`; `precioVenta()` ya calcula el C. Unitario, sin cambios en base de datos.
- Verificación con Playwright: crear, editar y borrar un material de prueba.
