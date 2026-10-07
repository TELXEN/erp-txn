# Dashboard de Proyectos: Presupuesto total vs gastado y Estado de los proyectos

## Objetivo
Añadir al dashboard dos resúmenes de cartera siempre visibles: cuánto presupuesto se ha gastado frente al total, y cuántas obras hay por estado. No cambian cálculos ni permisos existentes.

## 1. Fila de estado de los proyectos
Nueva sección bajo el selector de «Obra analizada», antes del panel de la obra:
- Cuatro tarjetas contadoras: **Activos** (En proceso), **En espera** (No iniciado), **Finalizados** (Completado) y **Retrasados** (Retrasado), con los colores semafóricos actuales de cada estado.
- Cada tarjeta es pulsable y filtra la «Cartera de proyectos» de abajo (reutiliza el filtro existente); «Todos» se mantiene en la cartera.
- «Canceladas» sigue visible como píldora en la cartera, sin tarjeta propia.

## 2. Presupuesto total vs gastado
Panel junto a las tarjetas de estado (misma fila), visible solo para roles autorizados a ver montos:
- **Presupuesto total** (vigente = contractual + adicionales de toda la cartera).
- **Gastado** (costo real total) y su **% gastado** con una barra de progreso comparada contra el presupuesto.
- **Saldo disponible** (presupuesto − gastado), en rojo si es negativo.

## 3. Exportaciones
- PDF: añadir a los KPIs los contadores Activos / En espera / Finalizados / Retrasadas.
- Excel: ya incluye estos datos; se conserva tal cual.

## Detalles técnicos
- Solo cambia `src/routes/_authenticated/dashboard-proyectos.tsx`.
- Los totales ya se calculan en el `resumen` existente (`presupuesto`, `costoReal`, `diferencia`); solo se muestran en pantalla.
- Conteo de estados con `proyectos.filter(p => p.situacion === ...)`; etiquetas alineadas a los estados configurables (`nombresEstados`) con respaldo a la lista base.
- Barras y colores con los tokens semánticos actuales (`bg-primary`, `text-bad`, `bg-bad/10`, etc.); sin nuevas dependencias.
- Verificación visual en escritorio y móvil con sesión activa.
