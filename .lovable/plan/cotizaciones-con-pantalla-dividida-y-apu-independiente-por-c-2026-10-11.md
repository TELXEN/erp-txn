# Cotizaciones con pantalla dividida y APU independiente por cotización

Gran parte del documento ya existe: los cinco bancos maestros (Materiales, Mano de Obra, Equipos/Herramientas, Subcontratos, Partidas con su receta), el cálculo automático de costos y la regla de quitar → Inactivo si un recurso está en uso. Las cotizaciones ya toman sus partidas del banco. Este plan cubre lo que falta.

## Lo que se mantiene
- Bancos maestros y su pantalla: no cambian.
- Las cotizaciones guardan sus partidas en las tablas actuales. No se crea una segunda tabla de cotizaciones; así no se pierden los códigos, las plantillas, los PDF ni la conversión en obra.
- GG y utilidad siguen editables por cotización (10% y 5% como valores sugeridos). El IGV es 18%.

## Lo que se añade

### 1. Copia fija del APU en cada cotización
- Al agregar una partida del banco, cada recurso se copia con su propio código, descripción, marca, unidad, tipo y precio unitario del momento.
- Si después cambian los precios del banco, las cotizaciones ya hechas no cambian.
- Las subpartidas del banco se copian ya desglosadas en sus recursos.
- Las cotizaciones antiguas sin copia guardada siguen mostrándose con los precios actuales del banco hasta que se editen.

### 2. Pantalla dividida (60% / 40%)
- **Izquierda, árbol del presupuesto:** títulos y partidas que se pueden abrir y cerrar. Columnas: Descripción, Und., Cantidad, Precio y Total. Cada título suma a sus partidas en negrita.
- **Pie izquierdo, en dos cuadros:**
  - Incidencia: Mano de Obra, Materiales, Equipo y Subcontratos, con % de participación y subtotal.
  - Resumen: Costo Directo, GG, Utilidad, Monto parcial, IGV 18% y Total, calculados al momento.
- **Derecha, APU de la partida elegida:** cabecera con rendimiento y metrado. Tabla compacta con Cod., Descripción, Unid., Recurso, Cantidad, Precio y Total, agrupada en MANO DE OBRA, MATERIALES, EQUIPO y SUBCONTRATOS. Cada grupo se puede cerrar y muestra su subtotal.
- **Pestañas al pie del panel derecho:** Análisis de costo unitario (funcional), Especificaciones técnicas (texto libre por partida), Metrado (cálculo simple: largo × ancho × alto × veces) y Consolidado de partida (resumen por tipo).
- La hoja actual, con su teclado y autocompletado, sigue siendo el panel izquierdo. La vista previa A4 y el PDF no cambian.

### 3. Edición local y exportación al banco
- Los cambios de cantidad o precio en el panel derecho se guardan solo en esa cotización. El precio unitario de la partida y los totales se recalculan en ese momento.
- Botón **«Exportar al Banco Maestro»**, que pide confirmación y ofrece dos opciones:
  - Actualizar la receta original. Solo se actualizan las cantidades: los precios del banco no se tocan.
  - Guardarla como una partida maestra nueva.

## Detalles técnicos
- Migración aditiva en `cotizacion_apu_detalle`: `codigo`, `descripcion`, `marca`, `unidad`, `tipo_recurso` (MO/MAT/EQ/SC), `precio_unitario` (numérico, 4 decimales), todos con valores por defecto. Se rellenan las filas existentes con los precios actuales del banco.
- En `cotizacion_items` se añaden `especificaciones` (texto) y `metrado_detalle` (jsonb).
- `costoReceta`/`ApuBanco` leen la copia cuando existe y usan el banco como respaldo. Se agrega una función para aplanar subpartidas de forma recursiva al copiar.
- El nuevo componente `CotizacionSplit` envuelve a `CotizacionHoja` con ancho de 60% y al nuevo `PanelApuCotizacion` con 40%. La partida seleccionada se comunica con un callback `onSeleccionar`. El escritorio usa `h-full overflow-hidden` con desplazamiento independiente, respetando AppShell. En pantallas angostas los dos paneles se apilan.
- Exportar al banco: con permiso de Gerencia/Admin, se hace upsert en `partida_detalle` de la partida de origen (`partida_apu_id`) o se inserta en `partidas_apu`.
- Los requerimientos y el dossier APU pasan a leer la copia fija.
- Verificación: typecheck y Playwright. Se agrega una partida, se edita una cantidad en el panel derecho, se confirma que el banco no cambia y que los totales y la incidencia se actualizan.
