# Plan: Refinar «Avance Físico por Partida» (Registro de Campo)

Rediseño visual y de usabilidad de `src/routes/_authenticated/avance.tsx`, optimizado para móvil y escritorio. Sin cambios de base de datos ni de la lógica de guardado (`guardar` sigue actualizando `partidas.avance_pct`).

## 1. Cabecera y filtros

- Los botones «Avance real» / «Avance programado» pasan a ser pestañas tipo píldora: contenedor con fondo gris suave redondeado, la pestaña activa con fondo blanco y sombra sutil.
- En el panel «Partidas asignadas», los selectores «Todos los proyectos» y «Todas las especialidades» se alinean en una sola línea junto al título (en móvil se apilan a ancho completo).

## 2. Agrupación eficiente

- Cuando el filtro de proyecto tiene un proyecto seleccionado, se muestra un encabezado común «Proyecto: <nombre>» sobre el listado y se elimina la etiqueta de proyecto repetida en cada fila.
- Cuando el filtro es «Todos los proyectos», las partidas se agrupan por proyecto y dentro de cada uno por especialidad, con el nombre del proyecto como encabezado de grupo (sin repetirlo por fila).
- La barra de especialidad (ej. «INSTALACIONES ELÉCTRICAS») usa texto oscuro de alto contraste (ya no label-mono gris claro) con fondo gris suave limpio.

## 3. Filas compactas y táctiles

Cada partida pasa de tarjeta flexible a una fila horizontal compacta:

- **Izquierda:** nombre de la partida en texto legible; debajo, una micro barra de progreso horizontal discreta que solo aparece si el avance es mayor a 0 % (color de acento verde/azul del tema).
- **Derecha:** control numérico de campo con botones «−» y «+» a los lados del valor (pasos de 1 %, rango 0–100), seguido del símbolo «%». Botones grandes y táctiles para uso con guantes/móvil.
- **Acción:** botón de confirmar con icono de check y estilo outline, discreto por defecto; solo se resalta (color del menú) y se activa cuando el valor difiere del original guardado. Mientras guarda muestra estado de carga.

## 4. Comportamiento

- El estado `valores` se mantiene; los botones −/+ actualizan ese mismo estado y el input sigue permitiendo escritura directa.
- Tras guardar con éxito, el botón vuelve a su estado discreto.
- Diseño adaptable: en móvil la fila se apila (nombre arriba, control abajo) sin perder legibilidad; en escritorio todo en una línea.

## Detalles técnicos

- Solo se modifica `src/routes/_authenticated/avance.tsx` (más un posible icono de `lucide-react`, ya instalado).
- Colores con tokens del tema (`bg-good`, `bg-primary`, `bg-muted`), sin colores fijos.
- Se conservan: control de acceso por rol, la vista «Avance programado» (CronogramaObra) intacta, los filtros y la invalidación de la consulta `partidas`.

## Verificación

- `tsgo` limpio y build OK.
- Vista previa con sesión: modificar un avance con los botones −/+, confirmar que el botón de check se activa solo al cambiar el valor y que el guardado persiste.
