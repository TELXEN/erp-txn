# Codificación modular de insumos (9 dígitos: XX.XX.XX.XXX)

## Objetivo
Cada insumo (material, mano de obra, equipo/herramienta, subcontrato) recibe un código de 9 dígitos:
`EE` especialidad + `TT` tipo de insumo + `SS` subfamilia + `NNN` correlativo. Se guarda sin puntos y se muestra como `40.10.13.001`.

## Niveles
1. **Especialidad (EE)**: el catálogo actual «Especialidad de partidas» pasa a usar código libre de 2 dígitos (01–99), editable y sin repetidos. Valores iniciales: 10 Obras Preliminares / Estructuras, 20 Arquitectura y Acabados, 30 Instalaciones Sanitarias, 40 Instalaciones Eléctricas / Automatización. Las 18 especialidades actuales reciben un código según su equivalencia (las que no encajen se numeran libres, p. ej. 50, 60…), para que puedas ajustarlo.
2. **Tipo de insumo (TT)**: fijo — 10 Materiales, 20 Mano de Obra, 30 Equipos/Herramientas, 40 Subcontratos.
3. **Subfamilia (SS)**: nuevo catálogo ligado a una especialidad, agrupado por bloque. Se carga para la especialidad 40 la lista completa de tu documento (Media Tensión 01–08, Baja Tensión 10–15, Control y Protecciones 20–26, Iluminación y Tierras 30–34, 40–41).
4. **Correlativo (NNN)**: automático 001–999 por cada combinación especialidad + tipo + subfamilia; lo reserva la base de datos para que dos usuarios no obtengan el mismo número.

## Pantallas
- **Configuración del sistema › Codificación de insumos**: gestionar Especialidades (código + nombre), ver los 4 tipos fijos y gestionar Subfamilias (especialidad, bloque, código, nombre), con alta, edición y eliminación como los demás catálogos, avisando duplicados.
- **Ventana de nuevo/editar/copiar insumo**: se eligen especialidad y subfamilia (el tipo ya se elige ahí); el código se genera solo al guardar y se muestra con puntos. Cambiar especialidad o subfamilia al editar genera un código nuevo.
- Hoja de Insumos, APU y cotizaciones muestran el código con máscara.

## Insumos existentes
Se recodifican todos. Como aún no tienen especialidad ni subfamilia, quedan marcados **«Sin clasificar»** (resaltados) hasta que les asignes ambas; al hacerlo reciben su código definitivo.

## Detalles técnicos
- Migración aditiva: `especialidades_partida.codigo_modular char(2)` único; tabla `subfamilias_insumo` (especialidad_id, bloque, codigo char(2), nombre, unique(especialidad_id,codigo)) con GRANT + RLS (lectura personal, escritura admin/gerente); columnas `especialidad_id`, `subfamilia_id` en las 4 tablas de recursos.
- Función SECURITY DEFINER `siguiente_codigo_insumo_modular(esp, tipo, subfam)` con bloqueo por combinación, max+1 sobre `codigo` existente; error al pasar 999.
- Helper `mascaraCodigo()` en `src/lib/codificacion.ts` + prueba (`401013001` → `40.10.13.001`).
- El WBS de partidas (`recodificar_wbs`) no cambia.
