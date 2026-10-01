# Equipos y Herramientas: tabla WYSIWYG con Propio / Alquilado

## Qué verás
En **APU › Maestro de insumos**, las pestañas **Equipos y maquinaria** y **Herramientas menores** pasan a una tabla editable igual a Materiales, con columnas:

CÓDIGO | DESCRIPCIÓN | TIPO (Propio / Alquilado) | UNIDAD | P. ALQUILER | MARGEN | C. UNITARIO | Acciones

- **Código**: automático (30000001… para equipos, 40000001… para herramientas, según Codificación de insumos).
- **Tipo**: lista Propio / Alquilado (por defecto Propio).
- **Unidad**: lista de Unidades de medida (por defecto **hm** si existe, si no **und**).
- **Si es Propio**: se escribe el **C. Unitario** directamente; P. Alquiler queda en "—" y el margen no se aplica (muestra "—").
- **Si es Alquilado**: se escribe el **P. Alquiler**; el Margen es el del tipo (Márgenes APU) y el **C. Unitario = P. Alquiler + Margen %**, calculado en vivo.
- Fila punteada al pie para crear (Enter guarda), clic en fila para editar, borrar con confirmación.
- Los APU, el buscador y las cotizaciones usan el C. Unitario resultante.

## Detalles técnicos
- Migración: `insumos.propiedad text NOT NULL DEFAULT 'Propio'` con CHECK ('Propio','Alquilado'). Registros existentes quedan como Propio (su precio actual pasa a ser su C. Unitario, sin margen).
- `src/lib/apu.ts`: `Insumo.propiedad`; `precioVenta(i)` devuelve `precio` sin margen cuando `tipo ∈ {EQ,HT}` y `propiedad = 'Propio'`; en los demás casos igual que hoy. `calcularApu` ya usa `precioVenta`.
- `src/components/Insumos.tsx`: nuevo `EquiposWysiwyg` (basado en `MaterialesWysiwyg`) parametrizado por tipo, renderizado cuando `filtro === "EQ" || filtro === "HT"`. Campo `precio` guarda C. Unitario (Propio) o P. Alquiler (Alquilado).
- Subcontratos no cambia.
