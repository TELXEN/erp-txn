# Encabezados con el color del fondo del menú

## Objetivo
Que los encabezados del listado de Proyectos y de Registro de Partidas usen el mismo color de fondo que el menú lateral del tema activo, en lugar de grises claros o negro fijo.

## Cambios

### Proyectos (listado)
- La fila de encabezados de columnas (Código, Cliente, Nombre de la obra, Responsable, Plazo, Presupuesto, Costo ejecutado, Estado, Acciones) pasa a tener el fondo del menú (token `--sidebar`) con texto claro (`--sidebar-foreground`).
- Las filas de datos, el hover y los colores semánticos no cambian.

### Registro de Partidas
- La barra del proyecto (donde aparece «TXN26-P004 · INSTALACIONES ELECTRICAS RELAVERA» con el botón «Renumerar WBS») usa el fondo del menú en lugar del negro fijo actual; texto claro y bordes del botón adaptados a ese fondo.
- La fila de especialidad (ej. «01 · INSTALACIONES ELÉCTRICAS») usa el fondo del menú con texto claro, conservando la jerarquía visual (la barra del proyecto se distingue por su borde/peso).
- La fila de categoría mantiene su gris sutil para conservar la jerarquía de niveles.
- El encabezado de columnas de la tabla de partidas no cambia.

### En todos los temas
- Se usan los tokens del menú lateral, así cada tema muestra su propio color: azul petróleo en TELXEN Industrial, pizarra en Esmeralda y Pizarra, azul cobalto en Cobalto y Naranja, negro en Zafiro y Cian y en TELXEN Obsidiana.
- Texto blanco legible y contraste verificado en cada tema.

## Verificación
- Revisar Proyectos y Registro de Partidas en dos temas con fondos distintos (p. ej. TELXEN Industrial y Zafiro y Cian) en la vista previa.
- Confirmar contraste, jerarquía de niveles y que la franja lateral no cambie.
- Comprobar que la aplicación compile sin errores.

## Detalle técnico
Archivos: `src/routes/_authenticated/proyectos.tsx` y `src/routes/_authenticated/partidas.tsx`. Se reemplazan los fondos fijos (`bg-ink`, `bg-muted/60`) por los tokens semánticos del menú (`bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`), sin cambios de base de datos.
