# RMV y UIT con historiales separados

## Qué cambia para el usuario
En Configuración del Sistema → Valores normativos habrá dos listas independientes:
- **RMV (Remuneración Mínima Vital)**: monto, vigente desde (día exacto, p. ej. 01/05/2022 o 01/10/2026), base legal, observaciones.
- **UIT**: monto, año fiscal (siempre rige desde el 1 de enero), base legal (D.S. del MEF), observaciones.

Registrar una RMV nueva ya no obliga a repetir la UIT, y viceversa. Cada lista tiene su propia ventana para agregar/editar/eliminar (solo Gerencia/Administración).

## Datos actuales que se trasladan
```text
RMV: 1,025 desde 01/05/2022 | 1,130 desde 01/01/2025 | 1,230 desde 01/10/2026
UIT: 4,600 (2022) | 5,350 (2025) | 5,500 (2026)
```
Las filas repetidas (p. ej. UIT 5,500 en octubre 2026) desaparecen porque solo existían para acompañar el cambio de RMV. Nota: hoy no hay UIT 2023 ni 2024 (4,950 y 5,150); se pueden añadir.

## Cálculos
Renta de 5ta, asignación familiar y demás siguen dando los mismos resultados: RMV se busca por el período y UIT por el año fiscal, ahora cada uno en su lista. Tests existentes deben seguir pasando; se añade uno que confirme que una RMV nueva en octubre no altera la UIT del año.

## Detalles técnicos
- Migración: tablas `normativa_rmv` (vigencia_desde date unique, monto, base_legal, observaciones) y `normativa_uit` (anio int unique, monto, base_legal, observaciones), con GRANT, RLS igual a `historial_normativo` (lectura personal, escritura admin/gerente) y backfill desde `historial_normativo` (RMV en cada cambio de valor; UIT por año desde la fila vigente al 1 de enero/más antigua del año). `historial_normativo` queda marcada DEPRECATED, sin borrar.
- `src/lib/normativa.ts`: `useRmv`, `useUit`, `rmvEn(listaRmv, periodo)`, `uitEn(listaUit, anio)`, `rmvNuevaEn` para la alerta de cambio; respaldos separados.
- `HistorialNormativo.tsx` dividido en dos paneles; actualizar usos en `nomina.tsx`.
