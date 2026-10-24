# Diagrama Gantt en Operaciones

## Objetivo
Ver en una sola pantalla el calendario de cada obra: qué partidas se ejecutan, cuándo empiezan y terminan, cuánto avanzaron y si van atrasadas, usando los datos que ya se cargan en Avance programado y Avance físico.

## Ubicación
Nueva entrada **Diagrama Gantt** en Operaciones, justo después de Avance Físico (antes de Valorizaciones). Mismo acceso que Avance Físico: Ingeniero ve barras y porcentajes sin montos; Administración y Gerencia además ven importes.

## Qué verá el usuario
- **Selector de obra** (o "Todas las obras" para una vista de cartera, una barra por obra con sus fechas de inicio y fin).
- **Columna izquierda fija**: especialidad > título > partida, con grupos plegables; % de avance real y fechas.
- **Línea de tiempo** a la derecha con zoom Días / Semanas / Quincenas / Meses (igual que el cronograma).
- **Cada barra** abarca desde el primer hasta el último periodo con avance programado de la partida:
  - parte rellena = avance físico real;
  - color: verde a tiempo, ámbar ligeramente atrasada, rojo atrasada (real menor que lo programado a hoy);
  - las barras de grupo resumen a sus partidas.
- **Línea vertical "Hoy"** y marcas de inicio y fin contractual de la obra.
- **Al pasar el cursor**: programado vs. real a la fecha, días restantes; al hacer clic se abre la partida en Avance programado para editar.
- Lupa de filtros en la barra derecha (especialidad, estado, solo atrasadas) y exportación a PDF A4 horizontal y Excel.

## Primera etapa y siguientes
1. **Etapa 1 (esta)**: Gantt de solo lectura derivado del cronograma existente; no se pide información nueva.
2. **Etapa 2 (opcional, luego)**: arrastrar barras para mover o alargar fechas, que redistribuye los porcentajes del cronograma.
3. **Etapa 3 (opcional)**: dependencias entre partidas y ruta crítica.

## Detalles técnicos
- Datos: `cronograma_partidas` (pct por periodo y periodicidad), `partidas` (avance_pct, presupuesto) y `proyectos` (fechas, periodicidad). Inicio/fin de barra = primer/último periodo con pct > 0 en la periodicidad de la obra; partidas sin cronograma se listan sin barra con aviso "Sin programar".
- Programado a hoy con `programadoPartida`/`programadoCronograma`; solo partidas hoja, los grupos se agregan ponderando por presupuesto (sin doble conteo).
- Lógica pura en `src/lib/gantt.ts` (barras, estado de atraso, agregación) con pruebas unitarias; pantalla en `src/routes/_authenticated/gantt.tsx` dibujada con CSS grid/SVG y tokens del tema, sin nuevas dependencias.
- Usa `CabeceraModulo`, `MenuFiltros`, `Vacio`, `FilasCargando`; recuerda obra, zoom y grupos plegados con `recordado.ts`.
- Sin cambios en la base de datos en la etapa 1.
