# Diagrama Gantt con ruta crítica en Operaciones

## Objetivo
Ver en una sola pantalla el calendario de cada obra: qué partidas se ejecutan, cuándo empiezan y terminan, cuánto avanzaron, cuáles dependen de otras y cuáles forman la **ruta crítica** (las que, si se atrasan, atrasan la entrega de la obra).

## Ubicación
Nueva entrada **Diagrama Gantt** en Operaciones, justo después de Avance Físico (antes de Valorizaciones). Mismo acceso que Avance Físico: Ingeniero ve barras y porcentajes sin montos y puede definir dependencias; Administración y Gerencia además ven importes.

## Qué verá el usuario
- **Selector de obra** (o "Todas las obras": una barra por obra con sus fechas).
- **Columna izquierda fija**: especialidad > título > partida, grupos plegables, % real, fechas, holgura (días).
- **Línea de tiempo** con zoom Días / Semanas / Quincenas / Meses.
- **Barras** desde el primer al último periodo con avance programado; parte rellena = avance real; verde a tiempo, ámbar ligeramente atrasada, rojo atrasada.
- **Línea "Hoy"** y marcas de inicio y fin contractual.
- **Dependencias**: flechas entre barras. Se crean desde la ficha de la partida ("Depende de…": tipo Fin→Inicio, Inicio→Inicio, Fin→Fin, con días de desfase).
- **Ruta crítica**: interruptor "Ver ruta crítica" que resalta con borde intenso las partidas con holgura 0 y sus flechas; tarjeta resumen con duración total calculada, fecha de fin estimada y comparación con el fin contractual.
- **Alertas**: si una partida crítica va atrasada, aviso rojo con los días que empuja el fin de la obra; si hay dependencias en círculo, se rechaza al guardar.
- Al pasar el cursor: programado vs. real, holgura y días restantes; clic abre la partida en Avance programado.
- Lupa de filtros (especialidad, estado, solo atrasadas, solo críticas) y exportación PDF A4 horizontal y Excel.

## Etapas
1. **Gantt + dependencias + ruta crítica** (esta entrega).
2. **Opcional, luego**: arrastrar barras para mover o alargar fechas, redistribuyendo los porcentajes del cronograma.

## Detalles técnicos
- Datos existentes: `cronograma_partidas`, `partidas`, `proyectos`. Inicio/fin de barra = primer/último periodo con pct > 0 en la periodicidad de la obra; sin cronograma = "Sin programar" (no entra al cálculo crítico).
- Nueva tabla `dependencias_partidas` (proyecto_id, predecesora_id, sucesora_id, tipo FS/SS/FF, desfase_dias), única por par, con GRANT, RLS por roles existentes y trigger que impide ciclos y partidas de otra obra.
- Cálculo CPM en `src/lib/gantt.ts`: orden topológico, pasada adelante (inicio/fin temprano) y atrás (tardío), holgura = tardío − temprano; críticas = holgura 0. Solo partidas hoja; grupos agregan ponderando por presupuesto. Pruebas unitarias: cadena simple, ramas paralelas, desfase, ciclo rechazado.
- Pantalla `src/routes/_authenticated/gantt.tsx` con CSS grid + SVG para flechas, tokens del tema, sin nuevas dependencias; usa `CabeceraModulo`, `MenuFiltros`, `Vacio`, `FilasCargando` y recuerda obra/zoom/grupos con `recordado.ts`.
