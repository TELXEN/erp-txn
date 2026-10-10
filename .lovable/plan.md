# Control de sobrecostos: línea base y candado por avance físico

Gran parte de lo pedido ya existe en el ERP (dashboards con semáforo y erosión de utilidad, WBS/APU con herramientas manuales automáticas, avance físico con +/−, costos directos, gastos generales con flota y dona). Este plan agrega solo lo que falta, sin rehacer pantallas.

## 1. Línea base del proyecto (top-down)
- Al crear o editar un proyecto: campos Costo Directo Base, Gastos Generales y Utilidad; el Presupuesto Contractual se muestra como su suma en tiempo real.
- Aviso si la suma no cuadra con el contractual ingresado; no se guarda hasta que cuadre.

## 2. Techo de partidas
- Al guardar una partida (o su APU), si la suma de metrado × P.U. de todas las partidas supera el Costo Directo Base, se bloquea con un mensaje que indica cuánto excede.
- Validación también en la base de datos, para que nadie la salte.

## 2b. Desglose del costo directo
- El costo directo de cada partida y del proyecto se muestra separado en: Materiales, Mano de obra, Herramientas y equipos, Herramientas manuales (% fijo de la mano de obra, no editable, tomado de Márgenes APU) y Subcontratos.
- La base del proyecto (Costo Directo Base) se reparte en esos cinco rubros a partir de los APU de sus partidas.
- En Costos directos y en el Dashboard de Proyectos: tabla base vs. real por rubro con semáforo; cada compra exige elegir el rubro.
- Cada rubro se compara solo con su propio gasto real: materiales con compras de materiales, equipos y herramientas con compras de equipos y herramientas, mano de obra con el tareo de obreros, subcontratos con compras de subcontratos.
- Herramientas manuales: su base es el % sobre la mano de obra presupuestada (ej. 5% = S/ 1,000). Se registran compras reales de herramientas manuales y la suma no puede superar esa base; si la supera, la compra se bloquea.
- Mano de obra presupuestada = suma de la mano de obra de todas las partidas (desde sus APU).
- Mano de obra real = costo del tareo del personal obrero que ejecuta partidas; el staff (supervisión) no entra aquí, va a gastos generales.

## 3. Candado de compras por avance físico
- Al registrar un costo directo en una partida se valida:
  costo real acumulado + nueva compra <= presupuesto de la partida × (avance % / 100 + tolerancia).
- Tolerancia por defecto 15 %, editable solo por Gerencia en configuración.
- Si falla: no se guarda, la partida queda marcada «Bloqueada por sobrecosto» y aparece un aviso con el botón «Solicitar desbloqueo a Gerencia» (guarda partida, monto, proveedor, motivo).
- La regla se aplica en la base de datos para todas las vías de ingreso (registro manual, órdenes de compra recibidas, importaciones).

## 4. Panel de aprobaciones (solo Gerencia)
- Nueva página «Aprobaciones» en el menú con las solicitudes pendientes: obra, partida, monto, exceso, solicitante.
- Botones Aprobar / Rechazar. Al aprobar se habilita una única vez esa compra (por ese monto, con vencimiento de 48 h); al usarla se consume.
- Historial de aprobadas y rechazadas.

## 5. Indicadores
- Costos directos y Dashboard de Proyectos muestran la etiqueta «Bloqueada» en partidas con candado activo y el contador de solicitudes pendientes.

## Fuera de alcance
- No se cargan datos de ejemplo (la base fue limpiada para datos reales); se prueba con el proyecto TXN26-P001.

## Detalles técnicos
- Migración: columnas `cd_base`, `gg_base`, `utilidad_base` en proyectos (nullable, con respaldo a los % actuales); `tolerancia_avance` en configuración; tabla `solicitudes_desbloqueo` (GRANT + RLS: crear por autenticados, aprobar solo `has_role` gerente/admin).
- Triggers BEFORE INSERT en partidas (techo CD) y gastos_directos (candado), reutilizando el costo por partida; el candado acepta la solicitud aprobada vigente y la marca usada.
- Frontend: `proyectos.tsx`, `partidas.tsx`, `gastos-directos.tsx`, nueva ruta `_authenticated/aprobaciones.tsx`, enlace en el menú.
- Pruebas vitest para la fórmula del candado; verificación en vista previa.
