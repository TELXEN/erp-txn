## Detalles de los iconos con el color oscuro del tema (solo Word, Excel y PowerPoint)

### Qué cambia
- **Microsoft Word**: los detalles de los iconos de la cinta pasan a azul oscuro Word (#103F91).
- **Microsoft Excel**: detalles en verde oscuro Excel (#0A5C30).
- **Microsoft PowerPoint**: detalles en rojo oscuro PowerPoint (#9C3014).
- **Resto de temas** (TELXEN Industrial, Obsidiana, Gris oscuro, Negro): siguen con el azul #0072BB.
- El contorno de los iconos sigue negro; el botón activo mantiene el color claro del tema.

### Detalles técnicos
- En `src/lib/temas.ts`, añadir la variable `--color-cinta-icono-acento` solo en los temas `word`, `excel` y `powerpoint` (con su color `panel`, el más oscuro de cada tema), pasando un valor opcional a `temaOffice` para no tocar Gris oscuro ni Negro.
- `src/styles.css` conserva `#0072bb` como valor por defecto, así los demás temas no cambian.
- Verificar en pantalla cambiando entre los tres temas y uno TELXEN.
