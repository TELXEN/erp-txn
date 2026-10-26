# Rentabilidad por rubro de ingreso

## Situación actual
- El rubro solo existe en cada venta (hoy las 2 ventas son «Proyectos / Obras»).
- Las obras no tienen rubro, y los costos (directos y gastos generales) se cargan a la obra, no a la venta. Por eso hoy no se puede saber qué rubro deja más ganancia.

## Qué se construye
1. **Rubro en la obra**: campo «Rubro de ingreso» en Proyectos (lista de Rubros de ingresos activos; por defecto «Proyectos / Obras"). Las obras existentes quedan en «Proyectos / Obras».
2. **Ventas heredan el rubro**: al registrar una venta o factura ligada a una obra, el rubro se completa con el de la obra (editable). Ventas sin obra siguen eligiendo rubro a mano.
3. **Panel «Rentabilidad por rubro»** en el Dashboard Financiero, con filtro de período y moneda consolidada en PEN:
   - Por rubro: ingresos facturados, costo real (mismo costo de obra que ya usan los demás paneles), utilidad, margen % y número de obras.
   - Gráfico de barras ingresos vs costo y ranking por margen; el rubro más rentable resaltado.
   - Ventas sin obra cuentan como ingreso de su rubro sin costo asignado, indicado con una nota.
   - Exportar a Excel.

## Detalles técnicos
- Migración: `proyectos.rubro_ingreso text not null default 'Proyectos / Obras'`.
- `src/lib/rentabilidad-rubro.ts`: función pura que agrupa ventas (PEN) y costos de `useCostoObras` por rubro de la obra; ventas sin proyecto agrupan por `ventas.rubro`. Test con valores concretos.
- Formularios de venta/facturación precargan `rubro` desde la obra seleccionada.
- Componente nuevo en dashboard financiero usando TarjetaResumen/Panel del ui-kit.
