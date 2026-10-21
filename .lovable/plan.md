# Nueva estructura de la hoja de cotización

## Qué verá el usuario
La hoja de cotización (y las plantillas) se organiza en hasta 4 niveles, con numeración automática por posición:

```text
1.0      ELÉCTRICA                     (Especialidad – opcional como raíz)
1.1      TABLEROS Y CELDAS             (Título de partidas)
1.1.1    Montaje de Tableros en Sala   (Subtítulo – opcional)
1.1.1.1  Instalación de tablero general (Partida)
1.2      CONDUCTORES                   (Título sin subtítulo)
1.2.1    Tendido de cable nyy ...      (Partida: un nivel menos)
2.0      CIVIL
...
```

- Se puede empezar por una Especialidad o directamente por un Título: el primer elemento colocado es el 1.0. Si se empieza por Títulos (sin especialidad), cada título es 1.0, 2.0… y lo de abajo sube un nivel.
- El subtítulo es opcional: si no se inserta, la partida queda un nivel arriba.
- Formato automático al salir del campo y al guardar:
  - Especialidad y Título: TODO EN MAYÚSCULAS.
  - Subtítulo: Title Case con conectores en minúscula ("Metodología de la Investigación").
  - Partida: solo la primera letra en mayúscula.
- Especialidades y títulos se eligen de sus catálogos (Especialidad de partidas / Títulos de partidas); el subtítulo es texto libre.
- Columna vertical de iconos a la derecha (Agregar, Editar, Copiar, Eliminar) igual que en Banco APU. Editar, Copiar y Eliminar se activan al seleccionar una fila. Agregar abre un menú: Especialidad, Título, Subtítulo, Partida (cada opción se habilita según la fila seleccionada; la nueva fila entra debajo de la seleccionada).
- Copiar duplica el elemento con todo lo que tiene dentro; Eliminar pide confirmación y borra también su contenido.
- Se retiran de la hoja el selector Una disciplina / Multidisciplinaria y los grupos fijos Suministro / Montaje: la estructura la decide el usuario con los niveles.
- Subtotales por Especialidad, Título y Subtítulo en hoja, vista previa, PDF y Excel.

## Datos existentes
Las cotizaciones y plantillas actuales se convierten: especialidad → nivel Especialidad (si era multidisciplinaria), grupo/categoría → Título, partidas iguales. No se borra nada; las revisiones congeladas conservan su contenido.

## Detalles técnicos
- Migración aditiva: `cotizacion_items.nivel` y `plantilla_cotizacion_items.nivel` (`especialidad|titulo|subtitulo|partida`, default `partida`) + `orden` como única fuente de jerarquía (estructura plana por orden, sin padre_id). Backfill desde especialidad/grupo/categoría. Comentarios DEPRECATED en `grupo`, `multidisciplinaria`, `alcance` cuando dejen de usarse.
- `numeracionCotizacion` (src/lib/cotizaciones.ts) reescrita: recorre filas por orden y numera por nivel relativo (raíz `N.0`, hijos `N.M`, etc.), saltando niveles ausentes. Pruebas unitarias con los ejemplos: con/sin especialidad, con/sin subtítulo.
- Formato: `formatearTexto` modos `mayusculas` (especialidad/título), `titulo` (subtítulo), `oracion` (partida) — aplicado en onBlur y antes de cada insert/update.
- `CotizacionHoja.tsx` / `HojaCotizacion.tsx`: árbol por nivel, selección de fila, `BarraIconosHoja` con menú de Agregar; quitar acciones por fila. Mismo constructor de árbol en cotizacion-vista, PDF y Excel; conversión a obra copia códigos.
- Actualizar AGENTS.md (regla WBS de cotizaciones) y memoria del proyecto.
- Verificación: pruebas de numeración y formato, typecheck, Playwright creando especialidad → título → subtítulo → partida y título → partida.
