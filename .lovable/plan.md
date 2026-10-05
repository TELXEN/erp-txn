# Plantillas de cotización por tipo de obra y grupos Suministro / Montaje

## Objetivo
1. Organizar cada cotización en dos grupos fijos: **SUMINISTRO DE MATERIALES** y **MONTAJE ELECTROMECÁNICO**, cada uno con sus categorías y partidas.
2. Mostrar la **especialidad** solo cuando la cotización es multidisciplinaria.
3. Contar con **plantillas por tipo de obra** (Líneas de media tensión, Montaje de tableros/sala, Subestaciones, Edificaciones…) para iniciar cotizaciones ya estructuradas.

## Estructura de la hoja

```text
Cotización de una sola disciplina          Cotización multidisciplinaria
01 SUMINISTRO DE MATERIALES                 01 ELÉCTRICAS (especialidad)
   01.01 Conductores (categoría)               01.01 SUMINISTRO DE MATERIALES
         01.01.001 Cable N2XSY 3x50 ...              01.01.01 Conductores
02 MONTAJE ELECTROMECÁNICO                           01.01.01.001 Cable ...
   02.01 Tendido de conductores                01.02 MONTAJE ELECTROMECÁNICO
         02.01.001 Tendido de cable ...      02 CIVILES (especialidad) ...
```

- En la cabecera de la cotización se agrega el selector **Tipo: Una disciplina / Multidisciplinaria** (por defecto: una disciplina).
- Una disciplina: no se pide ni se imprime especialidad; la numeración arranca en el grupo.
- Multidisciplinaria: se añade el nivel especialidad por encima de los grupos (como hoy).
- Cambiar de modo reagrupa la hoja sin perder partidas (al pasar a una disciplina, se pide la especialidad a conservar si hay más de una).
- Subtotales por grupo (Suministro / Montaje) en la hoja, vista previa y PDF, además del desglose actual (costo directo, GG, utilidad, IGV).

## Grupos
- Catálogo nuevo **Grupos de cotización** en Datos APU (junto a Especialidades y Categorías), precargado con Suministro de materiales y Montaje electromecánico; se pueden añadir otros (ej. Obras civiles, Pruebas y puesta en servicio).
- Cada categoría del catálogo puede asociarse a un grupo, para sugerir las categorías correctas al añadir en cada grupo.
- **Alcance de la cotización** en la cabecera: Suministro + Montaje / Solo suministro / Solo montaje. Con un solo grupo, la hoja no imprime el nivel de grupo (la numeración arranca en la categoría) y el desglose muestra un único subtotal. Las plantillas también guardan su alcance.

## Plantillas por tipo de obra
- Nueva pestaña **Plantillas de cotización** en Cotizaciones (o en Datos APU).
- Una plantilla tiene: nombre/tipo de obra, modo (una disciplina / multi), condiciones comerciales, recursos humanos, tiempo de ejecución, % GG y utilidad por defecto, y su árbol de grupos > categorías > partidas (vinculadas al Registro de partidas, con metrado sugerido opcional, normalmente 0).
- Acciones:
  - **Nueva cotización desde plantilla**: al crear, elegir "En blanco" o una plantilla; se copia todo el árbol y los textos, con precios actuales del Registro de partidas.
  - **Guardar como plantilla** desde cualquier cotización existente (copia estructura y partidas sin cliente ni metrados).
  - Editar, duplicar y eliminar plantillas con los mismos iconos de acciones.
- Se precargan 4 plantillas vacías de estructura: Líneas de media tensión, Montaje de tableros en sala, Subestaciones, Edificaciones (con los dos grupos y categorías base que luego completas).

## Detalles técnicos
- Migración:
  - `cotizaciones.multidisciplinaria boolean default false`.
  - `cotizacion_items.grupo text default ''` (nuevo nivel entre especialidad y categoría).
  - Tabla `grupos_cotizacion` (nombre, orden, activo) y `categorias_partida.grupo` opcional.
  - Tablas `plantillas_cotizacion` (campos de cabecera por defecto) y `plantilla_cotizacion_items` (misma forma que `cotizacion_items`: grupo, especialidad, categoría, partida_maestra/código, nombre, unidad, metrado, orden, padre_id, tipo).
  - GRANTs + RLS: lectura para autenticados; escritura para administrador/gerente.
- Datos existentes: las cotizaciones actuales se marcan multidisciplinarias si tienen más de una especialidad; sus ítems sin grupo quedan bajo "Suministro de materiales" o se clasifican por la categoría asociada.
- `CotizacionHoja.tsx` y `cotizacion-vista.tsx`: el constructor de árbol pasa a niveles dinámicos `[especialidad?] > grupo > categoría > partida`, con numeración WBS según el modo; subtotales por grupo.
- Clonado de plantilla a cotización (y viceversa) en una función de `src/lib/cotizaciones.ts`, remapeando `padre_id`.
- Excel/PDF reutilizan el mismo árbol, por lo que heredan el cambio.
- Registrar en AGENTS.md la regla de jerarquía de cotizaciones y plantillas.
