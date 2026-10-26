# Progreso más angosto y tarjeta Presupuesto optimizada

## 1. Progreso más angosto
- Columnas de la fila inferior: de `1fr / 1.3fr / 1.2fr` a `0.7fr / 1.3fr / 1.5fr`. La tarjeta Progreso queda más angosta y el espacio que sobra pasa a Presupuesto.
- El medidor mantiene su alto; solo se ajusta su ancho para que no se deforme.

## 2. Tarjeta Presupuesto (con el espacio ganado)
- **Anillo**: un poco más grande (h-24), trazo más delgado y fondo del anillo más suave.
- **Porcentaje**: con un decimal y tamaño adecuado para que nunca toque el trazo (por ejemplo 87.8%); debajo, «gastado».
- **Color del anillo** según el consumo: verde (good) por debajo del 85 %, ámbar (warn) desde el 85 % y rojo (bad) si hay sobrecosto o pasa el 100 %. El porcentaje toma el mismo color.
- **Filas Costo directo / Gastos generales**: cada una pasa a una cuadrícula con columnas alineadas y barras verticales finas como separador:
  `● Costo directo | S/ real | S/ presupuesto | 87.8%`
  Los importes van alineados a la derecha y en números de ancho fijo, para que los soles de ambas filas coincidan en vertical.

## Detalles técnicos
- Archivo: `src/routes/_authenticated/dashboard-proyectos.tsx` (columnas de la sección, `Anillo`, `FilaSemaforo`).
- Separadores con `border-l border-line` en una cuadrícula `grid-cols-[auto_1fr_1fr_auto]`.
- Verificar con Playwright a 1377×842 que la página siga sin barra de desplazamiento.
