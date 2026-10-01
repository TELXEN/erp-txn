# Iconos de añadir, editar y eliminar en Prioridad y Tipos de presupuesto

En **Datos › Parámetros de proyectos**, ambos paneles quedarán igual que **Estado del proyecto**: un **+** arriba a la derecha para añadir, un lápiz para renombrar en la misma línea (Enter guarda, Esc cancela) y un tacho para eliminar, con confirmación.

## Prioridad
- Hoy las prioridades (Alta, Media, Baja) están fijas en el programa. Pasarán a guardarse en la base de datos para poder editarlas.
- Al renombrar una prioridad, las partidas que la usan se actualizan al nuevo nombre.
- Al eliminar, si hay partidas que la usan, se avisa cuántas son. Esas partidas conservan su texto hasta que se les asigne otra prioridad.
- El formulario de partidas y las etiquetas de color usarán la lista nueva. Las prioridades nuevas se mostrarán en gris neutro, y Alta, Media y Baja mantienen sus colores.
- Si la lista quedara vacía, se usa la lista clásica como respaldo.

## Tipos de presupuesto
- Se cambia el formulario "Agregar" por el **+** en la cabecera y se añade el lápiz para renombrar en línea. El tacho se mantiene.
- Al renombrar un tipo, las partidas siguen enlazadas a él.
- "Contrato original" no se puede eliminar.

## Permisos
Solo Administrador y Gerente pueden añadir, editar o eliminar. Los demás solo ven las listas.

## Detalles técnicos
- Migración de la tabla `prioridades` (nombre único, orden, activo y fechas de creación y actualización): primero GRANTs, luego RLS (lectura para usuarios autenticados y gestión mediante `is_admin_o_gerente`) y trigger `updated_at`. Se cargan las filas Alta, Media y Baja.
- `src/lib/datos.ts`: hook `usePrioridades` y helper `nombresPrioridades` con respaldo en `PRIORIDADES`. El acceso a la tabla usa `as never` hasta que se regeneren los tipos.
- `datos.tsx`: panel `PrioridadesPanel` creado copiando el patrón de `EstadosProyecto`. `TiposPresupuesto` se cambia a cabecera con **+**, renombrado en línea y bloqueo del borrado cuando `es_contractual`.
- `partidas.tsx`: el selector de prioridad usa el hook.
