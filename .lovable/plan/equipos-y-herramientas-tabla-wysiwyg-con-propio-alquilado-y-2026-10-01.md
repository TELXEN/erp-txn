# Equipos y Herramientas: tabla WYSIWYG con Propio / Alquilado y Máquina / Equipo

## Qué verás
En **APU › Maestro de insumos**, las pestañas **Equipos y maquinaria** y **Herramientas menores** pasan a una tabla editable igual a Materiales, con columnas:

CÓDIGO | DESCRIPCIÓN | CLASE (Máquina / Equipo) | TIPO (Propio / Alquilado) | UNIDAD | P. ALQUILER | MARGEN | C. UNITARIO | Acciones

- **Código**: automático según Codificación de insumos.
- **Clase**: lista Máquina / Equipo (por defecto Equipo).
  - Máquina → unidad automática **hm** (Horas máquina).
  - Equipo → unidad automática **he** (Horas equipo).
  - Ambos símbolos se toman de Unidades de medida; la unidad se puede cambiar a mano si hace falta.
- **Tipo**: lista Propio / Alquilado (por defecto Propio).
- **Si es Propio**: se escribe el **C. Unitario** directamente; P. Alquiler y Margen muestran "—".
- **Si es Alquilado**: se escribe el **P. Alquiler**; el Margen es el del tipo (Márgenes APU) y el **C. Unitario = P. Alquiler + Margen %**, calculado en vivo.
- Fila punteada al pie para crear (Enter guarda), clic en fila para editar, borrar con confirmación.
- Los APU, el buscador y las cotizaciones usan el C. Unitario resultante.

## Detalles técnicos
- Migración: en `insumos`, `propiedad text NOT NULL DEFAULT 'Propio'` (CHECK Propio/Alquilado) y `clase_equipo text NOT NULL DEFAULT 'Equipo'` (CHECK Máquina/Equipo). Registros existentes quedan Propio/Equipo y conservan su unidad y precio.
- `src/lib/apu.ts`: `Insumo.propiedad` y `clase_equipo`; `precioVenta(i)` devuelve `precio` sin margen cuando `tipo ∈ {EQ,HT}` y `propiedad = 'Propio'`; resto igual.
- `src/components/Insumos.tsx`: nuevo `EquiposWysiwyg` (basado en `MaterialesWysiwyg`) parametrizado por tipo, para `filtro === "EQ" || "HT"`. Al cambiar Clase se fija la unidad buscando en unidades de medida los símbolos `hm` / `he` (respaldo `und`). `precio` guarda C. Unitario (Propio) o P. Alquiler (Alquilado).
- Subcontratos no cambia.
