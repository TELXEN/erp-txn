# Cotizaciones: especialidad y título con lista desplegable donde también se puede escribir

## Qué cambia
- En la ventana «Agregar / Editar especialidad» y «Agregar / Editar título», el campo **Nombre** deja de ser una lista cerrada y pasa a ser un campo donde se escribe y debajo se despliega la lista del catálogo filtrada al instante (sin importar mayúsculas ni tildes).
- Al hacer clic en el campo se abre la lista completa; se navega con flechas ↑/↓, Enter elige, Esc cierra.
- Las coincidencias se resaltan; la lista muestra hasta unas 50 opciones con desplazamiento propio.
- **Nombre que no está en el catálogo:** se permite escribirlo y guardarlo solo en esa cotización (no se agrega al catálogo). Debajo aparece el aviso «No está en el catálogo; se usará solo en esta cotización».
- Si lo escrito coincide con uno del catálogo (ignorando mayúsculas/tildes), se usa el nombre del catálogo para evitar repetidos.
- El formato automático se mantiene: especialidades y títulos en MAYÚSCULAS.
- Partidas y subtítulos no cambian.

## Detalles técnicos
- Nuevo componente `ComboNombre` en `src/components/cotizaciones/` (input + lista con `claveNombre` para filtrar y emparejar), usado en `HojaNiveles.tsx` en lugar del `Select` cuando `opcionesNombre.length > 0`.
- `guardar()` normaliza contra `opcionesNombre` antes de `formatearNivel`. Sin cambios de base de datos.
- Verificación en pantalla abriendo la ventana en una cotización de prueba, sin guardar cambios en TXN26-C004.
