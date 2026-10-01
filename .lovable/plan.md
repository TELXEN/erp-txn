# Herramientas menores: C. Unitario en % de la mano de obra

## Qué verás
En **APU › Maestro de insumos › Herramientas menores** la tabla editable queda solo con:

CÓDIGO | DESCRIPCIÓN | UNIDAD | C. UNITARIO (%) | Acciones

- **Código**: automático (Codificación de insumos).
- **Unidad**: fija **%MO** (porcentaje de mano de obra).
- **C. Unitario (%)**: no se escribe; se toma del porcentaje de **Herramientas menores** en **Márgenes APU**. Si cambias ese %, todas las herramientas se actualizan.
- Sin Clase, Tipo, P. Alquiler ni Margen en esta pestaña.
- Fila punteada para crear (descripción + Enter), clic para renombrar, borrar con confirmación.

En cada **análisis de precios unitarios**, al agregar una herramienta menor su parcial se calcula solo:
**Parcial = Total de mano de obra de esa partida × % de Márgenes APU (Herramientas menores)**.
La columna Cantidad muestra el % y no se edita; si cambias la mano de obra, el parcial se recalcula.

En Márgenes APU, la fila de Herramientas menores se rotula como "% de la mano de obra" para que quede claro.

**Equipos y maquinaria** no cambia.

## Detalles técnicos
- Sin migración: el % vive en `margenes_insumo` (tipo HT); los insumos HT guardan `unidad = '%MO'` y `precio = 0`.
- `src/components/Insumos.tsx`: nuevo `HerramientasWysiwyg` para `seccion === "HT"` (C. Unitario de solo lectura desde `useMargenesInsumo().HT`); `EquiposWysiwyg` solo para EQ.
- `src/lib/apu.ts`: `esPropioSinMargen` solo EQ. En `calcularApu`, calcular primero `tot.MO`, luego filas HT con `cantidad = margen HT %` y `parcial = tot.MO × margenHT / 100`, sumadas a `tot.HT`.
- `src/components/ApuPartida.tsx`: fila HT muestra unidad %MO, cantidad en % sin input, precio vacío.
- `src/components/MargenesApu.tsx`: etiqueta aclaratoria en la fila HT.
- El campo "Herramientas (% MO)" del APU se mantiene; si se usan ambos se suman (puede dejarse en 0).
