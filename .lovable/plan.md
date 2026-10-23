# Filtro con lupa en todo el ERP

Aplicar el mismo criterio de Proyectos, Partidas y Avance físico a las demás pantallas con listados.

## Criterio (igual en todas)
- La lupa va en la barra vertical derecha de la página, como el primer icono (arriba), separada del resto.
- Si la pantalla ya tiene barra de iconos (Agregar, Editar, Copiar, Eliminar…), la lupa se integra en ella con su separador.
- Si la pantalla no tiene barra, se crea una barra vertical derecha solo con la lupa.
- Proyectos, Partidas y Avance físico también mueven su lupa a esa barra.
- Al hacer clic se despliega un menú hacia la izquierda con la búsqueda y todos los filtros de esa pantalla.
- El cursor queda en el cuadro de búsqueda; se cierra al hacer clic fuera o con Esc.
- La lupa muestra un punto con el número de filtros activos (la búsqueda cuenta como uno).
- «Limpiar filtros» deja todo en «Todos».
- Se recuerda lo último elegido al volver a abrir la pantalla.
- Las pestañas de estado (Todas, Borrador, Pendiente…) y el selector de período de SIRE/Tesorería se quedan visibles, no entran en el menú.

## Pantallas, por etapas
1. Comercial y obras: Cotizaciones, Gastos directos, Gastos generales, Requerimientos, Órdenes de compra.
2. Logística: Almacén, Inventario, Importaciones, Vehículos.
3. Personas: Personal, Tareo diario, Nómina, Honorarios, Beneficios.
4. Finanzas: Caja chica, Tesorería, Facturación electrónica, Flujo de caja.

Cada etapa se revisa en pantalla antes de seguir. Solo se mueven los filtros de listados; los campos de las ventanas de registro no cambian.

## Cierre de la tarea anterior
Revisar en pantalla Avance físico y comprobar el contador y «Limpiar filtros» en las tres pantallas ya hechas.

## Detalles técnicos
- Reutilizar MenuFiltros de ui-kit.tsx y useRecordado (claves `<pantalla>:*`).
- Sin cambios en base de datos ni en cálculos; los filtros filtran lo mismo que hoy.
