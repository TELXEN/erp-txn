# Distintivo de color en todas las tarjetas de resumen

## Qué cambia
Cada tarjeta de resumen del ERP (las de arriba de los listados y del dashboard) tendrá un fondo con tinte muy suave y un marco fino del mismo color, según el tipo de dato que muestra:

| Tipo de dato | Color | Ejemplos |
|---|---|---|
| Montos (dinero) | Color del menú (tema) | Presupuesto cartera, Costo ejecutado, Total cotizado |
| Avance / porcentajes | Azul | Avance físico promedio, % ejecutado |
| Cantidades | Gris azulado | Proyectos activos, En esta vista, Aprobadas (n) |
| Alerta | Ámbar o rojo | Pendientes de respuesta, sobrecostos, vencidos |

- El tinte es tenue (no compite con los datos) y sigue el tema elegido.
- Una tarjeta en alerta toma el color de alerta aunque sea de monto o cantidad.
- La tarjeta seleccionada (las que filtran al hacer clic) mantiene su anillo resaltado.
- Tamaño, textos y guías de las tarjetas no cambian.

## Dónde
Proyectos, Partidas, Avance físico, Cotizaciones, Dashboard (proyectos y financiero), Caja chica, Tesorería, Costos directos, Gastos generales, Personal y demás pantallas con tarjetas de resumen.

## Detalles técnicos
- `TarjetaResumen` (ui-kit) gana prop `tipo?: "monto" | "avance" | "cantidad"`; clases `bg-<color>/[0.06] border-<color>/25` con tokens semánticos (`primary`, `info`, `muted`, `warn`, `bad`); `alerta` tiene prioridad. Si falta un token `info`, se agrega en `styles.css` para los cinco temas.
- `FranjaResumen` pasa `tipo` en cada item.
- Pantallas con tarjetas propias (p. ej. `Kpi` del dashboard, tarjetas con `label-mono` en caja chica, tesorería, etc.) reciben las mismas clases mediante un helper `claseDistintivo(tipo, alerta)` exportado de ui-kit, sin rehacer su estructura (la barra de avance de Caja chica se conserva).
- Verificación en pantalla con Playwright en Proyectos, Cotizaciones, Dashboard y Caja chica, y contraste revisado en los temas.
