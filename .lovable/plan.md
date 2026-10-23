# Partidas: un proyecto por página

Hoy la página Partidas muestra todas las obras seguidas en una sola tabla (o una sola si se filtra con el selector «Proyecto»). La propuesta: cada proyecto se ve en su propia página, con pestañas para pasar de una a otra.

## Cómo se verá

```text
[ TXN26-P001 Planta de Relay (24) ] [ TXN26-P002 ... (12) ] [ TXN26-P003 ... (8) ]   < 1 / 3 >
--------------------------------------------------------------------------------------
Resumen del proyecto: presupuesto, avance, n.º de partidas   [Renumerar WBS]
Tabla de partidas agrupadas por especialidad (igual que ahora, colapsables)
```

- Una pestaña por proyecto (código + nombre corto + cantidad de partidas), en el orden de código de obra. Con muchas obras, las pestañas se desplazan horizontalmente y hay flechas anterior/siguiente con «1 / 3».
- Solo se muestra la página del proyecto elegido; desaparece la barra gris de proyecto dentro de la tabla (su título y «Renumerar WBS» pasan a la cabecera de la página).
- El selector «Proyecto» de los filtros se reemplaza por las pestañas; se recuerda la última obra abierta (como hoy).
- Búsqueda, Especialidad y Tipo filtran dentro de la página actual; la cantidad en cada pestaña refleja la búsqueda, para saber en qué obra hay coincidencias.
- «Nueva partida» propone el proyecto de la página abierta.
- Vista Kanban: también por proyecto, con las mismas pestañas.
- Proyectos sin partidas aparecen en su pestaña con el mensaje vacío y botón para crear la primera.

## Detalles técnicos

- src/routes/_authenticated/partidas.tsx: reutilizar `filtroProyecto` (localStorage) como proyecto activo; por defecto el primero. Pestañas con el componente `Pestanas` del ui-kit (texto ReactNode con contador). `grupos` se calcula solo con las partidas del proyecto activo; se elimina el nivel de proyecto del render y se conserva el colapso por especialidad.
- Sin cambios en base de datos ni en cálculos.
- Verificación con Playwright en /partidas: cambiar de pestaña muestra solo esa obra, contadores correctos, flechas funcionan.

¿Prefieres pestañas arriba (propuesta) o un paginador simple «< Proyecto 1 de 3 >» al pie?
