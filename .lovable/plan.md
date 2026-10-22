# Ventana de gastos generales fija, solo se desplaza la tabla

## Lo que verá el usuario

```text
+--------------------------------------------------------------+
| Gastos generales                                         [X] |  fijo
| [Costo directo] [Total GG] [% GG]                            |  fijo
| Duración · % Utilidad · % IGV · Cargar estándar · Imprimir   |  fijo
+--------------------------------------------------+-----------+
| ÍTEM | DESCRIPCIÓN | UNIDAD | CANT | TIEMPO | ... | barra de  |
|--------------------------------------------------|  iconos   |
|  Tabla 1 fijos ...                               |  (fija)   |
|  Tabla 2 variables ...        <- solo esto se    |           |
|  ...                             desplaza        |           |
+--------------------------------------------------+-----------+
| Desglose: CD, fijos, variables, subtotal, utilidad, IGV,     |  fijo
| PRESUPUESTO FINAL TOTAL                                      |
+--------------------------------------------------------------+
```

- La ventana ocupa toda la pantalla (alto y ancho completos, con un margen mínimo) y nunca se mueve.
- Tarjetas, controles (duración, utilidad, IGV) y el desglose de costos quedan fijos.
- Solo el área de las tablas se desplaza; la fila de encabezado (Ítem, Descripción, Unidad, Cantidad, Tiempo, Costo unitario, Total) queda pegada arriba mientras bajas hasta el último detalle.
- Sin barra de desplazamiento visible (como ahora).

## Detalles técnicos

- `VentanaFlotante`: añadir prop opcional `pantallaCompleta` que fija la sección a `h-[calc(100dvh-1rem)]`, quita el scroll del contenedor exterior y hace que el cuerpo sea `flex flex-col overflow-hidden` (sin scroll propio). Otras ventanas no cambian.
- `GastosGeneralesCotizacion.tsx`: cuerpo como columna flex; tarjetas, controles y desglose `shrink-0`; el bloque de tablas + barra de iconos `min-h-0 flex-1 overflow-y-auto` con scrollbar oculta.
- Las dos tablas se unen en una sola `<table>` con un único `<thead sticky top-0>`; los títulos «Tabla 1 / Tabla 2» con su botón «Agregar fila» pasan a filas separadoras dentro del cuerpo, y cada tabla conserva su fila de total.
- El desglose se coloca al pie en disposición compacta (dos columnas) para no restar altura a la tabla.
- Verificar con Playwright en 1378x842: al desplazar, tarjetas/desglose no se mueven y el encabezado sigue visible.
