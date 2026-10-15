# Menú de clic derecho en el APU (Banco APU y Cotizaciones)

## Qué cambia para el usuario
- Desaparecen el **+** de cada grupo y la **x** de cada fila en la grilla del APU (Banco APU y panel derecho de Cotizaciones).
- Al hacer clic derecho sobre una fila de insumo (o sobre el título de un grupo) aparece un menú con icono a la izquierda:
  - Agregar insumo encima (icono flecha arriba con +)
  - Agregar insumo debajo (flecha abajo con +)
  - Agregar insumo al final (lista con +)
  - Subir (flecha arriba)
  - Bajar (flecha abajo)
  - Eliminar (papelera, en rojo)
- "Agregar…" abre el mismo selector de insumo de hoy, limitado al grupo de la fila (MO, Materiales, Equipos, Subcontratos, Subpartidas); el nuevo insumo queda en la posición elegida.
- Subir/Bajar mueven el insumo dentro de su grupo; se desactivan en la primera/última fila.
- Eliminar usa la regla actual (en Banco APU desactiva si el recurso está en uso).
- Sobre el título de grupo solo se habilita "Agregar insumo al final". La fila automática de Herramientas manuales no muestra Subir/Bajar/Eliminar (siempre va al final de EQ).
- El menú se cierra con Esc o clic fuera; grupos vacíos siguen pudiendo recibir insumos por el clic derecho en su título.
- Los cambios en cotización siguen afectando solo a esa cotización.

## Detalles técnicos
- Hoy `partida_detalle` no tiene columna de orden: migración que agrega `orden integer` (backfill por `created_at` dentro de cada partida/tipo), con GRANT/RLS existentes intactos. La copia de recetas a cotización/obra también copia `orden`.
- Lecturas del APU ordenan por `orden, created_at`; la fusión de duplicados en `costoReceta` conserva el menor orden.
- Insertar encima/debajo: asignar orden de la fila ±, renumerando el grupo (actualización por lotes). Subir/Bajar: intercambiar `orden` con la vecina del mismo grupo.
- Componente compartido `MenuContextualApu` (posicionado en el cursor, iconos lucide: ArrowUpToLine/ArrowDownToLine/ListPlus/ArrowUp/ArrowDown/Trash2) usado en `BancoApu.tsx` (`PanelApuMaestro`) y `PanelApuCotizacion.tsx`; se elimina la columna de acción de 20 px del `colgroup` y su espacio pasa a Descripción.
- Verificación con Playwright en Banco APU y TXN26-C001: cada acción y el total del APU.
