# Insumos: hoja limpia con barra de acciones a la derecha

La pestaña **Insumos** del Banco APU se muestra como una hoja de solo lectura con los insumos agrupados, y todas las acciones pasan a una columna de iconos a la derecha.

## Hoja limpia (izquierda)
- Una sola lista con cuatro grupos con subtítulo, en este orden: MATERIALES, MANO DE OBRA, EQUIPOS/HERRAMIENTAS, SUBCONTRATOS.
- Cada grupo muestra sus columnas actuales (código, descripción, marca/tipo, unidad, precio/costo, margen, costo unitario).
- Sin botones, campos de captura ni filtros dentro de la hoja. Solo un buscador fijo encima de la hoja para encontrar insumos.
- Clic en una fila la selecciona (resaltada); doble clic abre la edición.
- Los grupos vacíos muestran «Sin insumos».

## Columna vertical de iconos (derecha)
Barra fija, con tooltip en cada icono:
1. **Agregar nuevo insumo** (+)
2. **Editar insumo** (lápiz)
3. **Copiar insumo** (copiar)
4. **Eliminar insumo** (tacho rojo)

Editar, Copiar y Eliminar se activan solo cuando hay una fila seleccionada.

## Ventana flotante única (agregar / editar / copiar)
- Primer campo: **Tipo de insumo** — Material, Mano de obra, Equipo/Herramienta o Subcontrato.
- Los demás campos cambian según el tipo (los mismos que se usan hoy):
  - Material: código, descripción, marca, unidad, precio base, margen %.
  - Mano de obra: código, descripción, unidad (H-H por defecto), costo hora.
  - Equipo/Herramienta: código, descripción, propio/alquilado, unidad, costo hora o %, margen % (solo alquilado).
  - Subcontrato: código, descripción, unidad, costo, margen %.
- Unidad siempre desde el catálogo de unidades.
- **Agregar**: ventana vacía; título «Nuevo insumo».
- **Editar**: ventana precargada; título «Editar insumo»; el tipo no se puede cambiar.
- **Copiar**: ventana precargada con los datos de la fila; código vacío y descripción con « (copia)»; se guarda como insumo nuevo.
- Guardar mantiene las validaciones actuales (descripción obligatoria, código no repetido, montos numéricos).

## Eliminar
Pide confirmación. Si el insumo se usa en algún APU, se desactiva en lugar de borrarse (regla actual), y se avisa.

## Detalles técnicos
- `src/components/BancoApu.tsx`: nuevo componente `HojaInsumos` en la vista «insumos», reemplazando las cuatro `ListaBanco` apiladas. Reutiliza `CONFIG`, `useTabla` y la lógica actual de guardado/eliminación de `ListaBanco` (extraída a funciones compartidas `guardarInsumo` y `quitarInsumo`).
- Ventana `VentanaInsumo` sobre `VentanaFlotante`, con el selector de tipo que define la tabla destino (`materiales`, `mano_obra`, `equipos_herramientas`, `subcontratos`).
- Barra de iconos con `BotonIcono` (tono `peligro` para eliminar). Sin cambios en la base de datos.
