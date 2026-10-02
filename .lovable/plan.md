# APU: herramientas automáticas en Herramientas menores, vinculadas al Maestro de insumos

## Problema
En la ventana de Análisis de precios unitarios, al agregar mano de obra aparece una fila automática "Herramientas manuales" (por el campo Herramientas % MO), pero esa fila y su monto se muestran dentro del grupo **Equipos y maquinaria**. Además, ese porcentaje se guarda por partida y no es el mismo que el C. Unitario (%) configurado para Herramientas menores en el Maestro de insumos.

## Qué verás
- La fila automática de herramientas aparece bajo el encabezado **Herramientas menores** (junto a las herramientas menores agregadas a mano) y su monto suma al subtotal de ese grupo, ya no al de Equipos y maquinaria.
- El porcentaje mostrado y usado es el mismo de **Márgenes APU › Herramientas menores (% de la mano de obra)** — es decir, el C. Unitario (%) de las herramientas menores del Maestro de insumos. Si cambias ese % en Márgenes APU, todos los APU se actualizan al recalcular.
- El campo "Herramientas (% MO)" de la ventana del APU pasa a ser de solo lectura (muestra el % del Maestro, con nota de dónde editarlo); cada partida ya no guarda su propio porcentaje.
- El precio unitario total puede variar si el % del Maestro difiere del que tenía guardada la partida; al pulsar "Guardar y aplicar P.U." queda actualizado.
- Igual comportamiento en la hoja de cotización (APU desplegable), en el dossier de APU y en las partidas de obra.

## Detalles técnicos
- `src/lib/apu.ts` (`calcularApu`): el monto de herramientas se suma a `tot.HT` en lugar de `tot.EQ`.
- Fuente única del porcentaje: `margenes_insumo` tipo HT (ya expuesto por `useMargenesInsumo`). Los llamadores dejan de usar `pct_herramientas` de la partida:
  - `src/components/ApuPartida.tsx`: pasa `margenes.HT` a `calcularApu`; el input pasa a texto de solo lectura con la nota "se edita en Márgenes APU".
  - `src/components/CotizacionHoja.tsx`: mismo cambio (pctH viene del margen HT; se retira la edición en línea de ese campo).
  - `src/routes/_authenticated/apu-vista.tsx` y `src/routes/_authenticated/partidas.tsx`: dossier y partidas calculan con el margen HT.
  - `src/routes/_authenticated/cotizaciones.tsx`: deja de copiar `pct_herramientas` al insertar/abrir el APU.
- Sin migración: la columna `pct_herramientas` queda en la base de datos pero en desuso (no se borra nada).
- Verificación: typecheck + prueba en vista previa (APU con mano de obra muestra la fila bajo Herramientas menores con el % del Maestro).
