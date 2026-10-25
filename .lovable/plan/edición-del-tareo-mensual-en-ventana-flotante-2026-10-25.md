# Edición del tareo mensual en ventana flotante

## Objetivo
En Control de Asistencia, el calendario «Días trabajados» (ver y corregir asistencia de un trabajador) dejará de aparecer como panel debajo del consolidado y se abrirá en una ventana flotante centrada.

## Cambios
- Al pulsar el lápiz (editar) o el ojo (ver días trabajados) en el consolidado, se abre la ventana con el título «Días trabajados — nombre del trabajador».
- Dentro se mantiene todo igual: selector de mes, proyecto para días corregidos, sellos de tipo de día, calendario, leyenda, mensajes de error y botones Cancelar / Guardar corrección.
- Se cierra con X, tecla Escape o clic fuera; al cerrar se descarta la corrección no guardada.
- Tras guardar la corrección, la ventana queda en modo consulta mostrando los días actualizados (como hoy).
- El listado y el consolidado permanecen visibles detrás.

## Técnico
- `src/routes/_authenticated/tareo.tsx`: reemplazar el `Panel` condicional por `VentanaFlotante` (ui-kit), `abierta={!!trabajadorVisible}`, `onCerrar` limpia `trabajadorVisible` y `editandoCalendario`, ancho `max-w-2xl`. Sin cambios de datos ni reglas.
