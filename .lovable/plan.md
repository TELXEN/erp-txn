# Herramientas menores: C. Unitario en % de la mano de obra

## Qué verás
En **APU › Maestro de insumos › Herramientas menores** la tabla editable queda solo con:

CÓDIGO | DESCRIPCIÓN | UNIDAD | C. UNITARIO (%) | Acciones

- **Código**: automático (Codificación de insumos).
- **Unidad**: fija **%MO** (porcentaje de mano de obra).
- **C. Unitario**: se escribe como porcentaje (ej. 3 %, 5 %).
- Sin Clase, Tipo, P. Alquiler ni Margen en esta pestaña.
- Fila punteada para crear (Enter guarda), clic para editar, borrar con confirmación.

En cada **análisis de precios unitarios**, al agregar una herramienta menor su parcial se calcula solo:
**Parcial = Total de mano de obra de esa partida × C. Unitario %**.
La columna Cantidad muestra el % y no se edita; si cambias la mano de obra, el parcial se recalcula.

**Equipos y maquinaria** no cambia (sigue con Clase / Tipo / P. Alquiler / Margen).

## Detalles técnicos
- Sin migración: `insumos.precio` guarda el porcentaje y `unidad = '%MO'` para tipo HT.
- `src/components/Insumos.tsx`: nuevo `HerramientasWysiwyg` (columnas reducidas) para `seccion === "HT"`; `EquiposWysiwyg` solo para EQ.
- `src/lib/apu.ts`: `esPropioSinMargen` solo EQ; HT sin margen. En `calcularApu`, calcular primero `tot.MO`, luego las filas HT con `cantidad = precio%` y `parcial = tot.MO × precio / 100`; se suman a `tot.HT`.
- `src/components/ApuPartida.tsx`: fila HT muestra unidad %MO, cantidad en % sin input, precio vacío. Al agregar HT se inserta cuadrilla 0, cantidad 1.
- El campo "Herramientas (% MO)" del APU se mantiene; si se usan ambos, se suman (se puede dejar en 0).
- Herramientas menores existentes conservan su precio, que pasará a leerse como %; conviene revisarlas.
