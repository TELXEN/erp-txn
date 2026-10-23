# Iconos más pequeños en la barra vertical derecha

## Qué cambia
En todas las pantallas del ERP, los botones de la barra vertical derecha (lupa, Agregar, Editar, Copiar, Eliminar y extras) se reducen:
- Botón: de 32 px a 26 px.
- Icono: de 15 px a 13 px.
- Separación entre botones y ancho de la barra se ajustan en proporción (la barra queda más angosta y deja más espacio al listado).

Colores, orden, separadores, punto de filtros activos y comportamiento no cambian. Los botones de las filas de tablas (24 px) no se tocan.

## Detalles técnicos
- Un solo punto de cambio en `src/styles.css` (`@utility barra-iconos`): `& button[data-tono] { width/height: 1.625rem }` y `& button[data-tono] svg { width/height: 13px }`, con lo que se aplica a todas las barras sin editar cada pantalla.
- La lupa flotante (`MenuFiltros` modo barra) toma el mismo tamaño; se ajusta el espacio reservado `.con-barra-filtros main` (3.75rem → 3.25rem).
- Actualizar el comentario "tamaño de iconos sin cambios" y la decisión previa de 15 px en memoria.
- Verificar en pantalla en Proyectos, Partidas, Avance físico y Cotizaciones.
