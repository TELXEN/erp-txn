# Catálogo maestro de especialidades por bloques con ayudas emergentes

## Qué verá el usuario
En APU › Catálogo técnico › Especialidad de partidas:
- Dos bloques plegables, cada uno con su título y el número de especialidades:
  - **Ingeniería del proyecto**: 00.01 Ingeniería Conceptual, 00.02 Ingeniería Básica / FEED, 00.03 Ingeniería de Detalle.
  - **Construcción y montaje industrial**: de 01 Obras Preliminares y Provisionales a 13 Pre-Comisionamiento y Comisionamiento (las 13 del documento).
- Cada especialidad se muestra en una fila limpia: código, nombre y un icono (i). Al pasar el mouse sobre ella aparece un recuadro oscuro con la descripción del documento.
- Se mantienen las funciones actuales dentro de cada bloque: alta rápida con Enter, editar (nombre, **descripción**, bloque y estado), flechas para reordenar y eliminar.
- Los códigos se siguen numerando solos: 00.01, 00.02… en Ingeniería y 01, 02… en Construcción.

## Carga del catálogo
- Se cargan las 16 especialidades con sus textos de ayuda (versión resumida del segundo documento).
- Las especialidades actuales se reemplazan; las categorías y partidas que usan los nombres antiguos pasan a la equivalente nueva (por ejemplo Obras Preliminares → Obras Preliminares y Provisionales, Estructuras → Obras Civiles y Estructuras de Concreto, Instalaciones Eléctricas → Electricidad de Baja Tensión y Fuerza, Instalaciones Mecánicas → Montaje Mecánico de Equipos). Las que no tengan equivalente quedan como inactivas, sin borrar nada que esté en uso.
- Después se renumeran categorías y partidas del banco automáticamente.

## Detalles técnicos
- Migración aditiva en `especialidades_partida`: `bloque text not null default 'construccion'` (check `ingenieria|construccion`) y `descripcion text`.
- `recodificar_wbs` numera por bloque: ingeniería `00.NN`, construcción `lpad(n,2)`; en códigos de categorías/partidas maestras la parte de especialidad usa los dos primeros dígitos (`00` para ingeniería) para no alterar su longitud.
- Datos (no migración): actualizar/insertar las 16 filas, remapear `especialidad` en `partidas`, `categorias_partida`, `partidas_maestras` y `cotizacion_items`, desactivar las sobrantes, luego `recodificar_wbs()`.
- `src/components/EspecialidadesPartida.tsx`: agrupar por `bloque` con secciones plegables; tooltip estilizado con tokens (fondo `ink`, texto `paper`) usando el `Tooltip` de shadcn; `moverWbs` reordena dentro del bloque.
- `src/lib/especialidades.ts`: añadir `bloque` y `descripcion` al tipo.

## Verificación
- Captura en /datos-apu: dos bloques, códigos 00.01–00.03 y 01–13, tooltip visible al pasar el mouse; alta, edición y reordenamiento funcionando; build sin errores.
