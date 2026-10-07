# SIRE: rectángulo de sincronización a la derecha y botón alineado con Registros/Configuración

## Objetivo
En la cabecera de SIRE, separar el bloque de sincronización en dos partes:

1. **Botón «Sincronizar Compras y Ventas»**: ubicado en la misma fila y a la misma altura que los botones «Registros» y «Configuración» (junto a ellos, lado izquierdo).
2. **Rectángulo a la derecha**: un recuadro con borde que contenga, justificado (repartido dentro del cuadro), los estados verdes de sincronización (RVIE/RCE), el selector de **Mes** y el selector de **Año**.

## Cambios (solo `src/routes/_authenticated/sire.tsx`)

- En la fila superior de la cabecera sticky (`flex justify-between`):
  - Izquierda: botones «Registros» / «Configuración» seguidos del botón «Sincronizar Compras y Ventas» (mismo alto, mismo grupo visual).
  - Derecha: nuevo recuadro (`rounded-md border border-line bg-card px-3 py-1.5`) con `flex items-center justify-between gap-3`: textos de estado RVIE/RCE a la izquierda del recuadro, Mes y Año a la derecha.
- `SincronizacionGlobal` se divide en dos piezas exportadas del mismo componente (o dos componentes): el botón con su barra de progreso, y el recuadro de período/estado. La barra de progreso sigue cubriendo el ancho de la fila como hoy.
- No cambia lógica: sincronización, período, consultas y estados quedan intactos.

## Verificación
- Playwright en la vista previa (viewport 1378×842): botón en la misma línea que Registros/Configuración, recuadro alineado a la derecha con Mes/Año y estados dentro, sin desbordes al estrechar la ventana.
- `bunx tsgo --noEmit` limpio y build sin errores.
