# Suavizar el color del menú lateral en Cobalto, Zafiro y Obsidiana

## Objetivo
Reducir la intensidad del color del menú lateral izquierdo en los temas **Cobalto y Naranja**, **Zafiro y Cian** y **TELXEN Obsidiana**, dejando tonos menos saturados y menos duros, manteniendo el texto blanco legible y la coherencia con los botones centrales (que usan el color del menú).

## Cambios (solo `src/lib/temas.ts`, sin cambios de base de datos)

### Cobalto y Naranja
- `--sidebar`: #1E40AF (azul muy vivo) → **#27356E** (azul cobalto apagado, más profundo y menos saturado).
- `--primary`: #1E40AF → **#27356E** (los botones siguen el color del menú, como regla actual).
- Ajustes derivados: `--sidebar-border` → #4A5C9E, `--sidebar-hover` → #2F4080, `--sidebar-panel` → #202C5A.

### Zafiro y Cian
- `--sidebar`: #09090B (casi negro puro) → **#1B1D24** (grafito suave con leve tinte azul zafiro).
- `--primary`: #09090B → **#1B1D24**.
- Ajustes derivados: `--sidebar-border` → #30333D, `--sidebar-hover` → #262933, `--sidebar-panel` → #23252D.

### TELXEN Obsidiana
- `--sidebar`: #09090B → **#1C1C1F** (grafito neutro suave).
- `--primary`: #09090B → **#1C1C1F**.
- Ajustes derivados: `--sidebar-border` → #333338, `--sidebar-hover` → #262629, `--sidebar-panel` → #242427.
- El acento amarillo (#FFC709) se mantiene igual.

## Sin cambios
- TELXEN Industrial (#003352) y Esmeralda y Pizarra (#1E293B) quedan igual.
- Texto del menú (blanco #FAFAFA) y colores de acento no cambian.
- La franja del menú sigue siendo continua desde el borde superior hasta el final de la página.

## Verificación
- Compilación limpia (tsgo) y build OK.
- Revisión en la vista previa con Playwright cambiando entre los tres temas en Configuración del Sistema: menú más suave, texto legible, botones centrales acordes.
