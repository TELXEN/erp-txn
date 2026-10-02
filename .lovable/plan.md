# APU: el % de herramientas se muestra y suma en Herramientas menores, no en Equipos

## Problema
En la ventana de Análisis de precios unitarios, al agregar mano de obra aparece una fila automática "Herramientas manuales" (por el campo Herramientas % MO), pero esa fila y su monto se muestran dentro del grupo **Equipos y maquinaria**. Como las herramientas menores dependen de la mano de obra, deben aparecer en el grupo **Herramientas menores**.

## Qué verás
- Al abrir el APU de una partida con mano de obra y un % de herramientas mayor que cero, la fila automática "Herramientas manuales (%MO)" aparece bajo el encabezado **Herramientas menores**, junto a cualquier herramienta menor agregada a mano.
- El subtotal del grupo Herramientas menores incluye ese monto; el grupo Equipos y maquinaria ya no lo arrastra.
- El precio unitario total no cambia: es el mismo monto, solo reubicado en el grupo correcto.
- El resto (buscador de insumos, cuadrillas, guardar y aplicar P.U.) funciona igual.

## Detalles técnicos
- `src/lib/apu.ts` (`calcularApu`): cambiar `tot.EQ += herramientas` por `tot.HT += herramientas`.
- `src/components/ApuPartida.tsx`: la condición de la fila automática pasa de `tipo === "EQ"` a `tipo === "HT"` para que se dibuje bajo ese encabezado.
- Sin migración ni cambios en base de datos; no afecta partidas ya guardadas (su P.U. guardado es idéntico).
- Verificación: typecheck + prueba en vista previa abriendo un APU con mano de obra y % de herramientas.
