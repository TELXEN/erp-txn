# Color del botón activo de la cinta según el tema

Hoy el botón/icono activo de la cinta siempre se resalta en amarillo #F2C12E, sin importar el tema. Pasará a usar el color más claro de cada tema (y el hover, ese mismo color al 20 %).

| Tema | Color activo |
|---|---|
| TELXEN Industrial | Amarillo #FFC709 |
| TELXEN Obsidiana | Amarillo #FFC709 |
| Microsoft Word | Azul claro #D0E0F7 |
| Microsoft Excel | Verde claro #CDEBD9 |
| Microsoft PowerPoint | Salmón claro #F8D6CB |
| Microsoft 365 Gris oscuro | Gris claro #D0D0D0 |
| Microsoft 365 Negro | Gris claro #C8C8C8 |

El texto y las líneas del icono activo siguen en negro (legibles sobre todos esos tonos). Afecta también a los selectores Edición/Vista previa de cotizaciones y Gastos Generales, que usan el mismo resaltado.

## Detalles técnicos
- `src/lib/temas.ts`: añadir `--cinta-seleccion` a cada tema (`temaOffice` usa `c.muted`; TELXEN/Obsidiana `#FFC709`).
- `src/styles.css`: `--color-cinta-seleccion: var(--cinta-seleccion, #f2c12e)` para que lo tome dinámicamente.
- Actualizar la memoria `mem://design/cinta-seleccion.md` (activo = color más claro del tema).
