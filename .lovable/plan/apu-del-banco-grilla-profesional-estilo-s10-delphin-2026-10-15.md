# APU del Banco: grilla profesional estilo S10 / Delphin

El panel derecho del Banco APU deja de ser una lista plegable. Pasa a ser una sola tabla tipo hoja de cálculo, con secciones y un cálculo más preciso.

## 1. Cabecera de control
- Franja gris clara con sombra suave, encima de la tabla:
  - **Rend. diario**: se puede editar, con 2 decimales y la unidad de la partida al lado (ej. 20.00 m3). Se guarda al salir del campo o al pulsar Enter, y las cantidades de Mano de obra y Equipos se recalculan al instante.
  - **Jornada**: 8.00 h/día, bloqueada (solo lectura).

## 2. Una sola tabla con secciones
Las secciones MANO DE OBRA, MATERIALES, EQUIPOS Y HERRAMIENTAS y SUBCONTRATOS aparecen como subtítulos. El botón «+» de cada sección y la «x» de cada fila se quedan como están ahora.

| Columna | Ancho | Comportamiento |
|---|---|---|
| Descripción | flexible, mín. 250 px | código en gris pequeño + nombre |
| Unid. | 60 px, centrado | hh, hm, kg, m3… |
| Nro. Rec. | 90 px, 2 decimales | se edita en MO y Equipos; bloqueado en Materiales y Subcontratos |
| Cantidad | 100 px, 4 decimales | calculada en MO y Equipos; se edita en Materiales y Subcontratos |
| % De… | 80 px | solo en la fila de Herramientas manuales |
| Precio | 100 px, «S/ » | costo del maestro (ver nota) |
| Total | 110 px, «S/ » | solo lectura |

## 3. Reglas de cálculo
- **Mano de obra y Equipos**: Cantidad = Nro. Rec. × Jornada ÷ Rend. diario. Total = Cantidad × Precio.
- **Materiales y Subcontratos**: escribes la Cantidad directamente. Total = Cantidad × Precio.
- **Herramientas manuales** (unidad %MO, última fila de Equipos): Total = suma de los Totales de Mano de obra × % ÷ 100. El % sale de Márgenes APU, igual que hoy.
- Los cálculos se hacen con céntimos exactos, sin errores de decimales. Las cantidades se redondean a 4 decimales y los totales a 2. Así la suma de las filas coincide siempre con el costo total.
- El total se recalcula desde cero cada vez que agregas o quitas un recurso. No arrastra sumas anteriores.
- Las cotizaciones, el dossier A4 y los requerimientos usan este mismo cálculo, así que siempre dan las mismas cifras.

## 4. Filas y diseño
- Filas de 32 px y encabezado de 38 px. El texto y los campos quedan centrados en vertical, con una línea gris fina debajo de cada fila.
- Los textos de datos van a 13 px; los encabezados y subtítulos, en negrita a 13 px y gris oscuro.

## 5. Pie fijo
- Abajo a la derecha, siempre visible: **Costo total del APU** en negrita a 15 px, actualizado al momento.

## Puntos que contradicen reglas que ya acordamos (confirma o corrige)
- **Letra**: el pedido dice Roboto, pero ya acordamos que todo el ERP usa la letra elegida en Configuración. Propongo mantener esa letra; si eliges Roboto en Configuración, saldrá en Roboto.
- **Altura de filas**: antes acordamos filas de unos 29 px. Este pedido pide 32 px solo en esta tabla, y aplicaré 32 px aquí.
- **Precio editable**: en el Banco, el precio sale del maestro de insumos. Editarlo aquí cambiaría el precio en todas las partidas. Propongo dejarlo como solo lectura. En las cotizaciones sí se sigue pudiendo editar, solo para esa cotización.

## Detalles técnicos
- `src/lib/banco-apu.ts`: rehacer `costoReceta` con cálculo en enteros (céntimos y diezmilésimas) mediante un helper `src/lib/decimal.ts`. Se mantiene su firma para que la usen `apu-vista`, `PanelApuCotizacion` y requerimientos. Añadir pruebas en `banco-apu.test.ts`: MO, H-M, materiales, %MO y la suma que coincide con el total.
- `partida_detalle.cantidad_o_cuadrilla` sigue guardando la cuadrilla (MO/EQ) o la cantidad (MAT/SC). No hay cambios en la base de datos. Rend. diario se actualiza en `partidas_apu.rendimiento_diario` e invalida la consulta del APU.
- `src/components/BancoApu.tsx`: reemplazar el cuerpo de `PanelApuMaestro` por un componente `GrillaApu` con `<table>` y `table-layout: fixed`, de modo que todas las secciones compartan las mismas columnas. Las subpartidas se muestran como una sección adicional. Se mantienen las pestañas del pie y la altura fija del panel.
- Verificar con Playwright: cambiar Rend. diario, comprobar las cantidades y el total, y agregar y quitar un material.
