# Mejorar la experiencia de Avance Físico por Partidas

## Objetivo
Que el ingeniero de campo registre el avance de muchas partidas de forma rápida y clara, con menos clics y mejor lectura de la pantalla.

## Cambios propuestos (solo `src/routes/_authenticated/avance.tsx`)

1. **Proyecto seleccionable en vez de lista larga**
   - Selector de proyecto al inicio (recordando el último usado, igual que el Dashboard de Proyectos).
   - Solo se muestran las partidas de ese proyecto; opción «Todos» conserva la vista actual.

2. **Resumen del proyecto al inicio**
   - Franja con: avance promedio ponderado, n.º de partidas, cuántas están en 0%, en curso y terminadas (100%).

3. **Guardar varios cambios a la vez**
   - Los cambios se acumulan con una marca «sin guardar» por partida.
   - Botón fijo «Guardar cambios (N)» abajo que graba todo junto; botón «Descartar».
   - Se mantiene el botón «Actualizar» individual como opción.

4. **Control de avance más cómodo**
   - Barra deslizante (slider) además de los botones −/+ y el campo numérico.
   - Saltos rápidos: 0 / 25 / 50 / 75 / 100 %.

5. **Mejor lectura visual**
   - Barra de progreso siempre visible (aunque sea 0 %), con el % dentro.
   - Color semáforo suave: gris 0 %, ámbar en curso, verde 100 %.
   - Especialidades plegables (se abre/cierra cada grupo) para pantallas largas.

6. **Orden y búsqueda**
   - Buscador por nombre de partida.
   - Orden por código WBS (por defecto), por avance o alfabético.

## Detalles técnicos
- Todo en el componente existente; sin cambios de base de datos.
- Guardado masivo: actualiza cada partida modificada y refresca la consulta una sola vez.
- Persistencia del proyecto elegido en localStorage (`avance:proyecto`).
- Verificación: build + typecheck, y prueba en pantalla con Playwright (cambiar avances, guardar masivo, filtros).
