# Primer dígito de partida según tipo de insumo

## Objetivo
El código de partida pasa de `6.EE.CC.NNN` a `T.EE.CC.NNN`, donde **T** es el dígito configurado en Codificación de insumos según el tipo de la partida: Mano de obra 1, Materiales 2, Equipos y maquinaria 3, Herramientas menores 4, Subcontratos 5. El tipo se elige al crear la partida y se puede cambiar después. El campo "Dígito de partida" (6) desaparece.

## Cambios

### 1. Base de datos (migración)
- `partidas_maestras`: nueva columna `tipo_partida text` con valores `MO | MAT | EQ | HT | SC` (por defecto `MAT` para las existentes).
- Reescribir `recodificar_wbs()`: el primer dígito se toma de `codificacion_insumo` según el `tipo_partida` de cada partida (`digito_mo/digito_mat/digito_eq/digito_ht/digito_sc`), en lugar del único `digito_partida`.
- Eliminar la columna `digito_partida` de `codificacion_insumo`.
- Ejecutar `recodificar_wbs()` al final para recodificar las 7 partidas existentes.

### 2. Codificación de insumos (`CodificacionInsumos.tsx`)
- Quitar el campo "Dígito de partida" del formulario y de la validación de dígitos únicos (quedan los 5 de insumos).
- La vista previa del formato pasa a mostrar `T.EE.CC.NNN` con nota: "T = dígito del tipo de la partida".

### 3. Registro de partidas (`PartidasMaestras.tsx`)
- Al crear/editar una partida: selector **Tipo** con las 5 opciones (Mano de obra, Materiales, Equipos y maquinaria, Herramientas menores, Subcontratos).
- Nueva columna Tipo en el listado (etiqueta corta: MO, MAT, EQ, HT, SC).
- Cambiar el tipo recodifica automáticamente (recodificar_wbs ya corre tras cada cambio).

### 4. Partidas de proyecto/cotización
- `partidas` y `cotizacion_items` heredan el código ya recodificado; no requieren columna nueva (el código se copia desde la maestra). Se verifica que las partidas ya usadas en cotizaciones conserven su código histórico o se actualicen según corresponda (se decide en implementación: se actualizan, ya que el código es referencial).

### 5. Verificación
- Typecheck + build limpios.
- Playwright: crear una partida de tipo Mano de obra y confirmar que su código empieza con `1.`; cambiar el tipo a Equipos y confirmar que pasa a `3.`.

## Notas
- Las partidas existentes quedan como Materiales (dígito 2) hasta que les asignes su tipo real.
- La restricción actual se mantiene: solo Gerente y Administrador reordenan/recodifican.
