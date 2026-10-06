# Plan: Grupos de partidas en el APU

## Objetivo
Añadir un nivel **Grupo** a la jerarquía de partidas: **Especialidad → Grupo → Categoría → Partida**. El grupo forma parte del código WBS y se propaga a cotizaciones y partidas de obra.

## 1. Base de datos (migración)
- Nueva tabla `grupos_partida` (id, codigo, nombre, especialidad, orden, activo) con GRANTs a `authenticated`/`service_role`, RLS con las mismas reglas que `categorias_partida` (lectura autenticados, gestión admin/gerente).
- Columna `grupo` (texto) en `partidas_maestras`, `partidas` y `cotizacion_items`.
- Actualizar la función `recodificar_wbs()` para numerar con 4 niveles: `EE.GG.CC.PP` (especialidad.grupo.categoría.partida). Las partidas sin grupo conservan su numeración actual de 3 niveles para no romper códigos existentes.

## 2. Catálogo en Datos APU
- Nueva pestaña **«Grupos de partidas»** entre «Especialidad de partidas» y «Categorías de partidas», con CRUD igual al de categorías (código automático por especialidad, orden con flechas, activar/desactivar).
- Las categorías pasan a colgar del grupo: en «Categorías de partidas» se elige especialidad → grupo → categoría.

## 3. Banco de partidas maestras
- Selector de grupo entre especialidad y categoría (alta y edición en línea).
- Columna Grupo en la tabla y en el buscador.
- Las flechas de orden y la recodificación respetan el nuevo nivel.

## 4. Cotizaciones y obras
- `codigoContextual` (src/lib/categorias.ts) genera códigos de 4 niveles cuando la partida tiene grupo.
- Editor de cotizaciones (CotizacionHoja): al traer una partida maestra hereda su grupo; la jerarquía visual muestra Especialidad → Grupo → Categoría → Partida con sus colores por nivel.
- Partidas de obra (partidas.tsx): mismo selector y agrupación.
- Vista previa/PDF de cotización: encabezado de grupo entre especialidad y categoría (negro en impresión, como los demás niveles).

## 5. Compatibilidad
- Partidas, cotizaciones y plantillas existentes sin grupo siguen funcionando con códigos de 3 niveles; el grupo es opcional.
- Plantillas de cotización guardan el grupo (`plantilla_cotizacion_items.grupo`).

## Verificación
- `bunx tsgo --noEmit` y build limpio.
- Playwright: crear grupo en Datos APU, crear partida maestra con grupo (código de 4 niveles), llevarla a una cotización y comprobar jerarquía y código.
