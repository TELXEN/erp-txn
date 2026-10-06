# Menú contextual de cotizaciones: orden, iconos y grupos ilimitados

## Objetivo
Mejorar el menú de clic derecho del editor de cotizaciones y eliminar el límite de dos grupos (Suministro/Montaje) para que una cotización pueda tener tantos grupos como el usuario necesite.

## Cambios

### 1. Orden del menú contextual (grupo/categoría)
En `src/components/CotizacionHoja.tsx`, reordenar las opciones del menú de filas de grupo/categoría:
1. **Agregar nuevo grupo** (arriba) — antes «Nuevo grupo (capítulo)»
2. **Agregar categoría** (segundo)
3. **Agregar partida** (último, antes del separador de borrado)

En el menú de partidas, «Agregar nuevo grupo» también pasa al primer lugar.

### 2. Iconos distintos por nivel
- Grupo: icono `Layers` (distinto al actual `FolderPlus`)
- Categoría: `FolderPlus`
- Partida: `Plus` / `ListPlus` (sin cambio)

### 3. Grupos ilimitados
Hoy `nuevaEspecialidad()` solo toma el siguiente nombre libre del catálogo `grupos_cotizacion` (filtrado por alcance: suministro/montaje), así que se agota con dos grupos. Cambios:
- «Agregar nuevo grupo» abre un pequeño cuadro de diálogo para escribir el **nombre libre del grupo** (texto), sin depender del catálogo ni del alcance.
- Se mantiene la sugerencia del catálogo como opciones rápidas dentro del diálogo, pero el usuario puede escribir cualquier nombre.
- El filtro por alcance (`gruposPermitidos`) deja de bloquear: solo se usa para sugerencias iniciales.
- El código WBS del grupo se numera con el siguiente correlativo de capítulo disponible (01, 02, 03…), sin tope.

### 4. Verificación
- `bunx tsgo --noEmit` sin errores.
- Playwright: clic derecho en una cotización real, confirmar orden del menú, iconos distintos y crear un tercer grupo con nombre libre.

## Detalles técnicos
- Archivos: `src/components/CotizacionHoja.tsx` (menús, diálogo de grupo, `nuevaEspecialidad`), posiblemente `src/lib/cotizaciones.ts` (relajar `gruposPermitidos` a solo sugerencia).
- Sin cambios de base de datos: los grupos ya se guardan como texto en `cotizacion_items.especialidad`.
- En cotizaciones multidisciplinarias el texto sigue siendo «Nueva especialidad», con el mismo comportamiento.
