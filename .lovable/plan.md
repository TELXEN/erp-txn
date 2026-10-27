# Maestro Único de Insumos

Hoy un mismo artículo vive en hasta tres lugares: los bancos del APU (materiales, equipos/herramientas, mano de obra, subcontratos), la ficha de Inventario/Almacén (insumos) y el Catálogo de EPP. El maestro único deja **una sola ficha por artículo**, con un solo código de 8 dígitos, que usan Comercial, Logística y Almacén.

Volumen actual (bajo, buen momento para migrar): 3 materiales, 1 equipo, 5 mano de obra, 1 subcontrato, 1 EPP y 7 fichas de almacén.

## 1. Estructura de la ficha

### Campos obligatorios (todas las fichas)
| Campo | Regla |
|---|---|
| Código | 8 dígitos automático (tipo + especialidad + subfamilia + correlativo), nunca manual |
| Descripción | Única sin contar mayúsculas ni tildes |
| Rubro | Material, Equipo, Herramienta, EPP, Mano de obra, Subcontrato |
| Especialidad | De las 10 disciplinas |
| Unidad | Enlazada a la tabla Unidades de medida (selector, nunca texto libre; incluye H-H, H-M, %, GLB, und…). Las unidades viejas escritas a mano se emparejan con esa tabla al migrar |
| Precio base (PEN) | Costo referencial del APU |
| Inventariable | Automático: Sí para Material, Equipo, Herramienta, EPP; No para Mano de obra y Subcontrato |
| Estado | Activo / Inactivo (inactivo conserva código e historial) |

### Clasificación (sin campos especiales por rubro)
Todas las fichas tienen los mismos campos; no hay campos distintos según el rubro. Para agrupar productos se usan dos catálogos editables, siempre con selector:
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
- **Inventario – Catálogo**: lista de fichas inventariables con stock, columnas propias del EPP (norma, tallas, vida útil) y el saldo inicial. Edita los datos logísticos (marca, tallas, norma), no el precio base.
- **Almacén**: sin cambios visibles; ahora cada movimiento apunta a la misma ficha que el APU.

Permisos: alta y edición del precio base para Comercial/Gerencia; datos logísticos para Logística; ingeniero solo lectura.

## 3. Plan de migración (sin perder historial)

1. **Ampliar la ficha actual de almacén** para que sea el maestro: agregar rubro, especialidad, subfamilia, marca, costo hora, inventariable y los campos de EPP. Nada se borra.
2. **Copiar los bancos al maestro**: cada material, equipo, mano de obra, subcontrato y EPP se une con su ficha existente por nombre + unidad + rubro (las 7 fichas actuales) o crea una nueva. Se guarda el enlace de origen para trazabilidad.
3. **Reapuntar referencias**: APU, cotizaciones, plantillas, requerimientos, OC, movimientos y entregas de EPP pasan a usar la ficha única. Las cotizaciones emitidas conservan su foto de precios (no cambian).
4. **Pantallas**: Banco APU, Inventario, Catálogo EPP y los selectores de compras leen el maestro. El Catálogo EPP pasa a ser una vista filtrada del maestro.
5. **Eliminar las tablas antiguas**: una vez que ninguna pantalla las usa y la verificación pasa, se borran los bancos viejos (materiales, equipos/herramientas, mano de obra, subcontratos y catálogo EPP) y la sincronización automática por nombre. Para hacerlo, primero debes cambiar en las preferencias de Lovable Cloud el permiso «Ejecutar migraciones incompatibles» a «Preguntar cada vez»; te pediré confirmación antes de borrar.
6. **Verificación**: conteo antes/después por rubro, precio de una partida APU idéntico antes y después, stock y kardex sin cambios, y pruebas automáticas de código único, inventariable por rubro y no duplicados.

Se ejecuta por etapas (1-2, luego 3, luego 4-5) para que el sistema funcione en todo momento.

## Detalles técnicos
- Base: `insumos` (ya es FK del kardex y de compras) se amplía con `rubro`, `especialidad_id`, `subfamilia_id`, `marca_id` (FK marcas), `unidad_id` (FK unidades_medida), `inventariable` (generada desde rubro), `origen_tabla`/`origen_id`. `subfamilias_insumo` gana una familia padre por rubro (`familias_insumo`).
- `partida_detalle` y `apu_componentes` ganan `insumo_id` nullable; backfill desde las FK por tabla; luego el código lee solo `insumo_id`. Las columnas viejas se marcan `DEPRECATED`, no se eliminan.
- Tras publicar el código que ya no las referencia: `DROP TABLE` de `epp_catalogo`, `materiales`, `equipos_herramientas`, `mano_obra`, `subcontratos` y de las columnas FK viejas en `partida_detalle`/`apu_componentes` (requiere permiso de migraciones incompatibles).
- `asegurarFichaAlmacen` y la sincronización por nombre se retiran; `quitar_recurso_apu` desactiva en el maestro.
- Codificación sigue en `siguiente_codigo_insumo_modular`; renumeración por prefijo se mantiene.
- Se actualiza AGENTS.md (regla de maestro único) y memoria de código de insumos.
