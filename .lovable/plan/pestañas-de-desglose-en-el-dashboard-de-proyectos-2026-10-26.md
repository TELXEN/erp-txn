# Pestañas de desglose en el Dashboard de Proyectos

## Qué verás
Al elegir una obra, donde hoy está la tarjeta «Desglose del costo directo» aparecerán dos pestañas en la misma fila:

- **Desglose de costo directo** (activa por defecto) — exactamente lo que se ve hoy.
- **Desglose de gastos generales** — nuevo.

La pestaña de gastos generales muestra cada categoría de gasto general con el mismo formato que el costo directo: punto de semáforo, Base, Real, «Te quedan» y barra de %. Las filas se reparten en **dos columnas** para ocupar la misma altura que el desglose de costo directo. Al pie, una línea de total (Base / Real / Te quedan).

Como hoy, solo se ve con una obra seleccionada y para usuarios con acceso a montos.

## De dónde salen los números
- **Base**: el detalle de gastos generales de la cotización de la obra, agrupado por categoría (staff, gastos de obra, etc.). El total coincide con el GG presupuestado que ya muestra la tarjeta Presupuesto.
- **Real**: los gastos generales registrados de la obra por categoría, más el staff de planilla, la misma fuente del costo real (sin cifras distintas entre paneles).
- Categorías con gasto real pero sin base aparecen igual, marcadas en rojo; si la obra no tiene detalle de GG en su cotización, se muestra un aviso y una sola fila con el total.

## Detalles técnicos
- Nuevo `src/components/DesgloseGg.tsx` con `useDesgloseGg(proyectoId)` en `src/lib/sobrecosto.ts`; el real se reconcilia con `useCostoObras` (la suma por categoría debe igualar `ggReal`).
- En `dashboard-proyectos.tsx` se reemplaza `<DesgloseCd>` por un contenedor con `Pestanas` del ui-kit que alterna CD/GG; cuadrícula `md:grid-cols-2` para GG.
- Primer paso: confirmar con datos reales cómo se enlazan las categorías de la cotización con las de gastos registrados; si no coinciden por clave, se agrupan por nombre normalizado.
- Verificación en pantalla con una obra real.
