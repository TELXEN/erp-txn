# src/lib

- El % de gastos generales de una cotización lo deriva la base (trigger sobre `cotizacion_gastos_generales` y `cotizacion_items`) como total GG ÷ costo directo; la app nunca lo escribe cuando hay hoja y los totales pasan el importe de la hoja a `totalesCotizacion` (vía `gastosGeneralesDe`), para que hoja, vista previa, Excel y tarjetas muestren el mismo número.
