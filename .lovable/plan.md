# Copiar especialidades a Títulos de partidas

## Qué se hará
- Se copian las 18 especialidades actuales (ingeniería y construcción) a **Títulos de partidas**, como títulos activos.
- Si un nombre ya existe como título (ignorando mayúsculas, tildes y espacios), no se duplica: se conserva el título existente.
- Los nombres nuevos se guardan con la regla de títulos (Title Case Industrial, p. ej. «Obras Civiles y Estructuras de Concreto»); en la lista se siguen viendo en mayúsculas.
- La lista se reordena sola de la A a la Z y la numeración 01, 02… se recalcula.
- **Especialidad de partidas no se modifica ni se borra**: categorías, partidas y cotizaciones siguen igual.

## Detalles técnicos
- Una sola carga de datos: `INSERT INTO grupos_cotizacion (nombre, orden, activo)` desde `especialidades_partida`, aplicando Title Case Industrial y filtrando con la misma normalización que `claveNombre` contra los existentes; luego renumerar `orden` según el orden alfabético (Intl "es").
- Sin cambios de código ni de esquema.
- Verificar en pantalla que el listado no tenga repetidos y quede A→Z.
