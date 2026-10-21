# Nuevas especialidades y títulos al final de la lista

## Problema
Hoy cada fila nueva se inserta justo debajo de la fila seleccionada. Si estás en una partida a mitad de la hoja y agregas un título, ese título "absorbe" las partidas que estaban debajo y que pertenecían a otro título.

## Qué cambia
- **Especialidad nueva**: siempre va al final de toda la hoja.
- **Título nuevo**:
  - Si la hoja tiene especialidades, va al final de la especialidad seleccionada (o de la que contiene la fila seleccionada) y nunca toma partidas de otro título.
  - Si no hay especialidades, va al final de toda la hoja.
- **Subtítulo y partida**: siguen como ahora, dentro del bloque de la fila seleccionada.
- La numeración (1.0, 1.1…) se recalcula sola después de insertar.

## Detalles técnicos
- `HojaNiveles.tsx` › `guardar()`: reemplazar el cálculo de `pos` por una función `posicionInsercion(orden, nivel, seleccionado)`:
  - `especialidad` → `orden.length`.
  - `titulo` → busca hacia arriba la especialidad ancestro de la fila seleccionada y usa `bloqueDe(orden, esp.id)[1]` (fin de su bloque). Si no hay especialidad, usa `orden.length`.
  - Otros niveles → `bloqueDe(orden, seleccionado.id)[1]`, igual que hoy.
- La función va en `src/lib/niveles-cotizacion.ts`, con pruebas unitarias que cubren: título agregado desde una partida intermedia queda al final y no cambia el padre de esas partidas; especialidad siempre al final; título al final de su especialidad.
- No hay cambios en datos: las filas que hoy están mal agrupadas se corrigen moviéndolas con ↑/↓.
