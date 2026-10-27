# Maestro Único de Insumos

Hoy un mismo artículo vive en hasta tres lugares: los bancos del APU (materiales, equipos/herramientas, mano de obra, subcontratos), la ficha de Inventario/Almacén (insumos) y el Catálogo de EPP. El maestro único deja **una sola ficha por artículo**, con un solo código de 8 dígitos, que usan Comercial, Logística y Almacén.

Volumen actual (bajo, buen momento para migrar): 3 materiales, 1 equipo, 5 mano de obra, 1 subcontrato, 1 EPP y 7 fichas de almacén.

## 1. Estructura de la ficha

### Campos obligatorios (todas las fichas)
| Campo | Regla |
|---|---|
| Código | 8 dígitos automático (tipo + especialidad + subfamilia + correlativo), nunca manual |
| Descripción | Única por rubro + unidad, sin contar mayúsculas, tildes ni espacios dobles. Números, medidas y signos sí cuentan ("Cable vulcanizado 2x14 AWG" y "3x14 AWG" son distintos). La ventana guía con ejemplo «Nombre + tipo + medida/capacidad + norma» y, si ya existe, muestra la ficha encontrada para usarla en lugar de bloquear sin explicación |
| Rubro | Material, Equipo, Herramienta, EPP, Mano de obra, Subcontrato |
| Especialidad | De las 10 disciplinas |
| Unidad | Enlazada a la tabla Unidades de medida (selector, nunca texto libre; incluye H-H, H-M, %, GLB, und…). Las unidades viejas escritas a mano se emparejan con esa tabla al migrar |
| Precio base (PEN) | Costo referencial del APU |
| Inventariable | Automático: Sí para Material, Equipo, Herramienta, EPP; No para Mano de obra y Subcontrato |
| Estado | Activo / Inactivo (inactivo conserva código e historial) |

### Clasificación (sin campos especiales por rubro)
La ficha base tiene los mismos campos para todos los rubros, sin columnas vacías. Los datos propios de un rubro van en una **ficha complementaria uno a uno**, que solo existe cuando aplica:
- **EPP**: norma técnica, tallas, criticidad y vida útil en días (obligatoria para todo insumo de rubro EPP).
- **Equipos / Herramientas**: costo por hora, propiedad (propio/alquilado) y clase de equipo, solo si se requiere.
- Mano de obra conserva sus datos de planilla en sus propias tablas laborales, no en la ficha.

Para agrupar productos se usan dos catálogos editables, siempre con selector:
- **Familia → Subfamilia**: catálogo propio por rubro (ej. Material › Eléctricos › Cables; EPP › Protección de cabeza). La subfamilia también alimenta el código de 8 dígitos.
- **Marca**: tabla de Marcas existente, con su escritura respetada (opcional; Mano de obra y Subcontrato no la usan).

En Banco APU, Inventario, Almacén y los selectores de compra se puede **filtrar y agrupar** por Rubro, Familia, Subfamilia y Marca, y exportar a Excel con esas columnas.

### Datos que NO se guardan en la ficha (se calculan)
Stock, costo promedio, último precio de compra y "por llegar" salen siempre de los movimientos de Almacén y de las OC.

## 2. Dónde se almacena y cómo se ve en cada área

**Dónde se guarda**: en la base de datos del ERP, en una sola tabla de insumos (la ficha que hoy usa Almacén, ampliada). No hay copias en otros módulos: todos leen esa misma tabla.

**Dónde se administra**: nueva pantalla **Datos › Maestro de Insumos** (alta, edición, familias, marcas, desactivar). Banco APU, Inventario y Almacén muestran la misma ficha con las columnas que cada área necesita.

```text
                 MAESTRO ÚNICO DE INSUMOS
                          |
     +--------------------+---------------------+
     |                    |                     |
 COMERCIAL (APU)      LOGÍSTICA            ALMACÉN / INVENTARIO
 todos los rubros     solo inventariables  solo inventariables
 precio base, margen  rubro de compra,     stock por almacén,
 costo hora, H-H      último precio OC,    costo promedio,
                      proveedor            kardex, vales
```

- **Comercial – Banco APU**: misma hoja actual con sus pestañas por rubro; edita descripción, unidad, precio base, margen y costo hora. Muestra en gris "último precio de compra" como referencia.
- **Logística – Requerimientos, cotizaciones y OC**: el selector de rubro carga solo fichas de ese rubro que sean inventariables. No permite crear ni cambiar precios base; si un artículo no existe, abre la ventana de alta del maestro.
- **Inventario – Catálogo**: lista de fichas inventariables con stock y saldo inicial. Al filtrar por EPP se agregan las columnas de su ficha complementaria (norma, tallas, vida útil). Edita marca y datos complementarios, no el precio base.
- **Almacén**: sin cambios visibles; ahora cada movimiento apunta a la misma ficha que el APU.

Permisos: alta y edición del precio base para Comercial/Gerencia; datos logísticos para Logística; ingeniero solo lectura.

### Desviación de precios (compra vs. precio base)
- Al aprobar la cotización y generar la OC, cada ítem compara su precio unitario (en soles, sin IGV) con el precio base del maestro. Si la diferencia supera el umbral (por defecto ±10 %, editable en Configuración), la fila se marca en ámbar y la OC se emite igual — nunca bloquea.
- Cada desviación queda registrada y suma a la alerta roja de **Aprobaciones** como «Precio por revisar».
- Reporte **Desviaciones de precio** en Datos › Maestro de Insumos: insumo, precio base, último precio de compra, % de diferencia, OC y proveedor. Comercial/Gerencia puede **Actualizar precio base** (queda en historial con fecha y usuario) o **Descartar**. Los APU y cotizaciones ya emitidos no cambian.

## 3. Plan de migración: Estrategia Flash

Como los datos actuales son de ensayo (18 fichas), se reconstruye de golpe en lugar de migrar por etapas.

1. **Vaciar tablas dependientes**: recetas de APU (detalle de partidas y componentes), órdenes de compra con sus ítems y movimientos de almacén. También se vacían los vínculos que apuntan a esas fichas (ítems de requerimientos, solicitudes de cotización, vales de salida y entregas de EPP).
2. **Eliminar los bancos antiguos**: materiales, mano de obra, equipos/herramientas, subcontratos y catálogo EPP.
3. **Reestructurar la ficha de insumos**: rubro, especialidad, familia/subfamilia, marca, unidad, inventariable, fichas complementarias EPP/equipo, y relaciones definitivas desde las recetas de APU.
4. **Carga limpia**: los 18 registros actuales se insertan ya en la estructura nueva dentro de la misma migración.
5. **Pantallas**: Banco APU, Inventario, Almacén, compras y la nueva Datos › Maestro de Insumos leen solo el maestro, publicado en el mismo cambio.
6. **Verificación**: 18 fichas por rubro, códigos sin huecos, unidades enlazadas, alta de una ficha nueva desde cada pantalla y pruebas automáticas.

**Qué se pierde (confirmar antes)**: las recetas de APU de las partidas del banco, las OC y el kardex de ensayo. Las cotizaciones ya emitidas guardan su propia foto de precios y no se borran.

**Requisitos**: cambiar en las preferencias de Lovable Cloud «Ejecutar migraciones incompatibles» a «Preguntar cada vez». La app publicada usa la misma base, así que fallará entre la migración y la publicación del nuevo código: conviene hacerlo fuera de horario y publicar enseguida.

## Detalles técnicos
- Unicidad: índice único funcional en `insumos (rubro, unidad_id, clave_descripcion)` donde `clave_descripcion` es columna generada (unaccent + lower + espacios colapsados); la UI usa `claveNombre` con la misma regla y avisa antes de guardar. Antes de crear el índice se listan los posibles choques de la migración para resolverlos.
- Desviaciones: tabla `desviaciones_precio` (insumo_id, orden_item_id, precio_base, precio_compra, pct, estado Pendiente/Actualizado/Descartado, resuelto_por/en) llenada por trigger AFTER INSERT en `orden_compra_items`; umbral en `empresa_config`; historial en `insumos_precio_historial`. Regla de cálculo en un helper con prueba unitaria.
- Base: `insumos` (ya es FK del kardex y de compras) se amplía con `rubro`, `especialidad_id`, `subfamilia_id`, `marca_id` (FK marcas), `unidad_id` (FK unidades_medida), `inventariable` (generada desde rubro), `origen_tabla`/`origen_id`. `subfamilias_insumo` gana una familia padre por rubro (`familias_insumo`).
- Una migración destructiva: TRUNCATE de `partida_detalle`, `apu_componentes`, `orden_compra_items`, `ordenes_compra`, `movimientos_almacen`, `vales_salida_items`, `epp_entregas`, `requerimiento_items`, `solicitud_cotizacion_items` (CASCADE controlado); DROP TABLE de `materiales`, `mano_obra`, `equipos_herramientas`, `subcontratos`, `epp_catalogo`; `partida_detalle`/`apu_componentes` quedan con un único `insumo_id NOT NULL` FK insumos (columnas FK por tabla eliminadas); funciones que las leían (`quitar_recurso_apu`, `siguiente_codigo_insumo_modular`, triggers de renumeración, `registrar_vale_salida`) se reescriben en la misma migración; INSERT literal de los 18 registros.
- Extensiones 1:1 con PK = `insumo_id` (FK insumos ON DELETE CASCADE): `insumos_atributos_epp` (norma, tallas, criticidad, vida_util_dias) y `insumos_atributos_equipo` (costo_hora, propiedad, clase_equipo); trigger exige fila EPP cuando rubro = EPP. Columnas sueltas de `insumos` (sueldo_mensual, regimen_laboral, categoria_obrero, asignacion_familiar, propiedad, clase_equipo) se eliminan. Se descarta JSONB para conservar tipos y validación.
- Código: `usaBancoTabla`, `useEpps`, `BancoEpp`, `asegurarFichaAlmacen` y referencias a las tablas eliminadas se sustituyen por un hook `useMaestroInsumos` filtrable por rubro/familia/marca.
- `asegurarFichaAlmacen` y la sincronización por nombre se retiran; `quitar_recurso_apu` desactiva en el maestro.
- Codificación sigue en `siguiente_codigo_insumo_modular`; renumeración por prefijo se mantiene.
- Se actualiza AGENTS.md (regla de maestro único) y memoria de código de insumos.
