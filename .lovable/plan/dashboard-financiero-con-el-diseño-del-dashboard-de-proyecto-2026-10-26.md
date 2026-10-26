# Dashboard Financiero con el diseño del Dashboard de Proyectos

Rediseñar la presentación sin quitar información ni cambiar cálculos: mismos importes, gráficos, Excel y PDF.

## Nueva distribución (cabe en una pantalla, ~1377×842, sin barra de desplazamiento de página)

```text
[Título]                          [Selector de obra] [Excel] [PDF]
[Ficha de obra/cartera + estado de salud] [Ofertado] [Cobranza] [Costo real] [Utilidad real]
[Saldo por ejecutar: anillo + filas CD/GG con barras] [Composición costo real (anillo)] [GG por categoría (anillo)]
[Pestañas: Indicadores de control | Flujo/Rentabilidad | Rendimiento por partida]  (desplazamiento interno)
```

- Tarjetas KPI con el mismo estilo del Dashboard de Proyectos: icono en círculo claro con color por métrica (billete macizo para importes, nunca «$»), monto grande, 1–2 líneas de detalle en letra pequeña.
- Utilidad real y saldos en semáforo (verde / ámbar ≥85 % / rojo sobregiro), insignia «Sobregirado» como la de «Sobrecosto».
- Saldo disponible: anillo de consumo igual al de Presupuesto, filas Costo directo y Gastos generales con columnas Real | Presupuestado | % usado separadas por barras verticales finas. La nota de GG pasa a un texto pequeño al pie.
- Gráficos de anillo compactados a la misma altura que los del Dashboard de Proyectos; leyenda a un lado.
- Paneles inferiores en pestañas (componente común Pestanas) con contenido desplazable dentro de la tarjeta.
- Tarjetas claras y suaves (sin rellenos fuertes), colores del tema activo.

## Detalles técnicos
- Solo `src/routes/_authenticated/dashboard.tsx` (presentación); reutilizar clases `dash-tarjeta`, `dash-suave`, `dash-icono-suave`, `dash-barra*` de `src/styles.css`. Si se necesitan, mover `Anillo`, `FajoBilletes` y `FilaSemaforo` a un módulo compartido para que ambos dashboards usen el mismo.
- Sin cambios en `datos`, useCostoObras, exportaciones ni reglas de alerta.
- Verificar con Playwright en 1377×842 (una obra y «Todos»), sin scroll de página; build OK.
