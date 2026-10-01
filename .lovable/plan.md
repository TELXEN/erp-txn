# Margen único por tipo de insumo

## Qué verá el usuario
- En **Configuración del Sistema** aparece una nueva pestaña **Márgenes APU** (solo Gerente edita; los demás solo ven), con un % para cada tipo:
  Mano de obra, Materiales, Equipos y maquinaria, Herramientas menores, Subcontratos / Servicios.
- En el **Maestro de insumos** desaparece la columna/campo **Margen %** por insumo; las columnas Costo HH / C. Unitario / P. Venta se calculan con el margen de su tipo y muestran una nota "Margen del tipo: X %".
- Los análisis de precios unitarios, el buscador de insumos y las cotizaciones valorizan con ese margen automáticamente. Cambiar el % recalcula todo al instante (los P.U. ya guardados en partidas se actualizan al volver a "Guardar y aplicar P.U.").

## Detalles técnicos
- Migración: tabla `margenes_insumo` (tipo PK MO/MAT/EQ/HT/SC, margen_pct numeric default 0, updated_at) con GRANTs, RLS (lectura autenticados, edición gerente vía has_role) y filas iniciales para los 5 tipos. La columna `insumos.margen_pct` se conserva sin uso (sin borrado de datos).
- `src/lib/apu.ts`: hook `useMargenesInsumo()`; `precioVenta(insumo, margenes)` usa el margen del tipo; `calcularApu` recibe los márgenes. Actualizar llamadas en ApuPartida, BuscadorInsumo, Insumos (ManoObra/Materiales/demás), apu-vista y CotizacionHoja.
- Nuevo componente `MargenesApu.tsx` y pestaña en `configuracion-sistema.tsx` con icono a colores, siguiendo el patrón de Parámetros laborales.
