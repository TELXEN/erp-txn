# Codificación de partidas por orden + flechas de ordenamiento

## Formato del código
```text
EE . CC . NNN
01 . 02 . 003
 |    |    └─ correlativo de la partida dentro de la categoría
 |    └────── orden de la categoría dentro de su especialidad
 └─────────── orden de la especialidad (es su código)
```
- El orden de la especialidad ES su código (01, 02, 03…), así nunca se contradicen.
- Ejemplo: Instalaciones Eléctricas (orden 3) › Tableros (orden 2) › 5.ª partida = **03.02.005**.
- Partidas sin categoría usan `00` en el segundo nivel (03.00.001).

## Orden único con flechas
- **Especialidad de partidas**: cada fila tiene flechas arriba/abajo; se elimina el campo "orden" manual. Al mover, se intercambia con la vecina y los códigos se recalculan.
- **Categorías de partidas**: flechas arriba/abajo dentro de su especialidad (el orden es único por especialidad).
- **Registro de partidas**: flechas arriba/abajo dentro de su categoría; define el correlativo. Nueva columna CÓDIGO visible y buscable.
- Altas nuevas van al final; al borrar, se compactan los números (sin huecos).
- Cambiar la especialidad o categoría de una partida la manda al final del nuevo grupo y recodifica.

## Recodificación automática
- Mover especialidad/categoría recodifica en cascada todas sus categorías y partidas del Registro de partidas.
- Las cotizaciones y proyectos ya creados conservan sus códigos (tienen su propio botón Renumerar WBS), para no alterar documentos emitidos.
- Botón "Recalcular códigos" en Registro de partidas para normalizar los datos existentes una sola vez.

## Detalles técnicos
- Migración: índices únicos `especialidades_partida(orden)`, `categorias_partida(especialidad, orden)`, `partidas_maestras(especialidad, categoria, orden)` (añadir columna `orden` a partidas_maestras), diferibles para permitir intercambios.
- Función SQL `security definer` `mover_item_wbs(tabla, id, direccion)` restringida a admin/gerente: intercambia orden en una transacción y llama `recodificar_wbs()` que reescribe `codigo` de especialidades, categorías y partidas maestras. Normalización inicial de órdenes existentes (row_number) en la misma migración.
- UI: componente `FlechasOrden` reutilizable (ChevronUp/ChevronDown, deshabilitado en extremos) en los tres paneles; listas ordenadas por `orden`.
- `categorias.ts`/`especialidades.ts`: helpers de código pasan a leer el código ya calculado; padding 2-2-3.

## Verificación
- Mover una especialidad y comprobar que sus categorías y partidas cambian de prefijo; mover partidas y ver el correlativo; build limpio.
