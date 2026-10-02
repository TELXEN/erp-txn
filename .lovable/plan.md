# Banco de partidas maestras: orden de columnas y entrada WYSIWYG

## Qué verás

En **APU › Registro de partidas** (banco de partidas maestras), la tabla pasa a tener exactamente este orden de columnas:

CÓDIGO | PARTIDA | TIPO | ESPECIALIDAD | CATEGORÍA | MARCA | UNIDAD | P.U. (S/) | ESTADO | ACCIONES

- **TIPO** se muestra con el nombre completo (Mano de obra, Materiales, Equipos y maquinaria, Herramientas menores, Subcontratos) en lugar de la sigla; su posición pasa a estar junto a PARTIDA.
- El formulario superior "Nueva partida maestra" desaparece. La captura pasa a ser **WYSIWYG**, igual que en Materiales / Equipos / Subcontratos del Maestro de insumos:
  - **Fila punteada al pie de la tabla** para crear: escribes PARTIDA, eliges TIPO (por defecto Materiales), ESPECIALIDAD (por defecto la última usada), CATEGORÍA, MARCA, UNIDAD y P.U.; **Enter guarda** la fila y deja otra lista para seguir capturando.
  - El **CÓDIGO se genera automáticamente** al guardar (recodificación WBS con el dígito del tipo), no se escribe.
  - **Clic en una fila la vuelve editable en línea** (Enter guarda, Escape/botón X cancela), sin panel de edición.
  - Botones Guardar/Cancelar durante la edición y Eliminar con confirmación en ACCIONES, igual que ahora.
- Se conservan tal cual: el buscador con resaltado, las **flechas de ordenamiento** en la columna CÓDIGO (mover dentro del grupo especialidad/categoría), el botón de APU (calculadora) y el texto explicativo al pie.

## Detalles técnicos

- `src/components/PartidasMaestras.tsx`:
  - Reordenar `<th>`/`<td>`: Tipo se mueve de la 5.ª a la 3.ª columna y muestra el nombre completo del tipo (usar el segundo elemento de `TIPOS_PARTIDA`); ajustar anchos porcentuales (aprox. Código 11 %, Partida 20 %, Tipo 12 %, Especialidad 12 %, Categoría 11 %, Marca 7 %, Und. 5 %, P.U. 8 %, Estado 6 %, Acciones 7 %).
  - Eliminar el `<Panel titulo="Nueva partida maestra">` y su función `crear(e)`; añadir estado `nueva` (patrón `MaterialesWysiwyg` de `src/components/Insumos.tsx`) y `crearDesdeFila()` que hace el mismo insert actual (`codigo: ""`, `orden: ORDEN_FINAL`, marca como texto libre) + `recodificarWbs()` + refresco.
  - Fila fantasma con celdas de entrada (Input/Select reutilizando `opcionesEspecialidad`, `categoriasDe`, `opcionesUnidad`, `TIPOS_PARTIDA`); Enter en la fila dispara el guardado.
  - La edición en línea existente se mantiene; solo se reordenan sus celdas para coincidir con las cabeceras.
  - Sin cambios de base de datos: `partidas_maestras` ya tiene todos los campos (marca es texto libre).
- Verificación: typecheck + Playwright en `/datos-apu` → pestaña Registro de partidas: crear una partida de prueba (Enter), editarla en línea y borrarla.
