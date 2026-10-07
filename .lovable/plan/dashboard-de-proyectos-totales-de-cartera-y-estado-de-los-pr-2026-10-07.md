# Dashboard de Proyectos: totales de cartera y estado de los proyectos

## Objetivo
Añadir al dashboard una vista combinada de **todos los proyectos**, el presupuesto total frente a lo gastado, y contadores por estado. No cambian cálculos ni permisos existentes.

## 1. Opción «Todos los proyectos» en el selector
- En «Obra analizada» se agrega la opción **Todos los proyectos** al inicio de la lista.
- Al elegirla, el panel muestra los totales combinados de la cartera: avance físico ponderado, presupuesto total (contractual + adicionales), costo ejecutado y saldo; fechas con inicio más antiguo y fin más lejano.
- La **Curva S** se dibuja con todas las partidas, cronogramas y movimientos de la cartera (línea programada, real y costo acumulado del total).
- El control de cronograma oficial usa el avance programado ponderado de todas las obras.
- La cartera mantiene «Todos» como filtro inicial, mostrando siempre todas las obras con su estado en cada tarjeta.

## 2. Presupuesto total vs gastado
Fila de tarjetas visible solo para roles autorizados a ver montos:
- **Presupuesto total** (vigente = contractual + adicionales de toda la cartera).
- **Gastado** (costo real total) con **% gastado** en una barra de progreso contra el presupuesto.
- **Saldo disponible** (presupuesto − gastado), en rojo si es negativo.

## 3. Estado de los proyectos
Tarjetas contadoras al lado de las financieras, visibles para todos los roles:
- **Activos** (En proceso), **En espera** (No iniciado), **Finalizados** (Completado) y **Retrasados** (Retrasado), con los colores semafóricos actuales.
- Cada tarjeta es pulsable y filtra la cartera; «Canceladas» queda como píldora en la cartera.

## 4. Exportaciones
- PDF: añadir a los KPIs los contadores Activos / En espera / Finalizados / Retrasadas.
- Excel: ya incluye estos datos; se conserva tal cual.

## Detalles técnicos
- Solo cambia `src/routes/_authenticated/dashboard-proyectos.tsx`.
- La vista «Todos» reutiliza el `resumen` ya calculado (presupuesto, costoReal, diferencia) y agrega: avance ponderado por presupuesto de cada obra, avance programado ponderado, movimientos y partidas unidas de todas las obras; `obraSel` admite un modo agregado cuando `obraId === "todos"`.
- Conteo de estados con `proyectos.filter(p => p.situacion === ...)`; respaldo a la lista base si el catálogo de estados está vacío.
- Barras y colores con tokens semánticos actuales (`bg-primary`, `text-bad`, `bg-bad/10`); sin nuevas dependencias.
- Verificación visual en escritorio y móvil con sesión activa.
