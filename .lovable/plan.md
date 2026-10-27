# Codificación T+EE+SS+NNN y subfamilias visibles

## Situación encontrada
- Solo los materiales usan la subfamilia en el código; los demás rubros llevan «00».
- Las hojas del Maestro de Insumos no tienen columna Subfamilia; solo la ventana de nuevo material permite elegirla.
- Instrumentista se mantiene como **10500001**.

## Cambios
1. **Patrón único para todos los rubros:** cifra 1 rubro (1 MO, 2 MAT, 3 Equipos, 4 Herramientas, 5 Subcontratos, 6 EPP); cifras 2–3 especialidad; cifras 4–5 subfamilia (sin subfamilia «00»); cifras 6–8 correlativo sin huecos.
2. **Columna Subfamilia** en todas las hojas del Maestro (mano de obra, materiales, equipos y herramientas, subcontratos, EPP), con desplegable buscable filtrado por la especialidad de la fila; al cambiarla se regenera el código.
3. **Ventana de nuevo insumo:** campo Subfamilia opcional para todos los rubros (obligatorio solo en materiales).
4. **Recodificación automática** de fichas existentes (sin subfamilia conservan su código).
5. **Pantalla de Codificación:** formato `TEESSNNN` en todos los rubros.

## Detalle técnico
- Migración: `siguiente_codigo_insumo_modular` usa `_subfamilia` en cualquier tipo; renumeración por prefijo ya cierra huecos.
- `Insumos.tsx`: columna con `SelectorBuscable` usando `useSubfamilias`; `InsumoVentana.tsx`: quitar condición `tipo === "materiales"` del campo y del RPC.
- Ajustar `CodificacionInsumos.tsx`, prueba de `digito-insumo` y memoria de código de insumos.
