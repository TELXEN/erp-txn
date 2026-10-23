# Lupa de filtros más discreta

Cambiar el aspecto de la lupa en todas las pantallas del ERP para que pase desapercibida.

## Cambios
- La lupa queda en gris tenue, sin fondo de color (igual que los iconos Editar o Copiar cuando están en reposo).
- Al pasar el cursor toma el color del menú, como los demás iconos.
- Mientras el menú está abierto, la lupa se mantiene resaltada para saber de dónde salió.
- Cuando hay filtros activos, el número sobre la lupa sigue visible (es la única señal de que la lista está filtrada).

Posición, contenido del menú y comportamiento no cambian.

## Detalles técnicos
- En MenuFiltros (ui-kit.tsx), cambiar BotonIcono de tono "primario" a "neutro" y añadir un estado activo (borde y texto del color primario) mientras `abierto`.
