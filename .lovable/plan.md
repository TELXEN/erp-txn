# Botones centrales con el color del menú

## Objetivo
Hacer que los botones operativos del área central adopten el color de fondo del menú lateral del tema activo, incluyendo Exportar a Excel/PDF, Nueva, Crear factura, Registrar cliente, Registrar, Tabla, Kanban, Avance real/programado y Registrar tareo.

## Cambios
- Unificar el color principal de controles con el fondo lateral de cada tema:
  - TELXEN Industrial: azul petróleo.
  - Esmeralda y Pizarra: pizarra.
  - Cobalto y Naranja: azul cobalto.
  - Zafiro y Cian: negro, igual que su menú.
  - TELXEN Obsidiana: negro, igual que su menú.
- Ajustar el botón reutilizable para que las variantes principal, de acción y de contorno compartan esa identidad: fondo sólido en acciones principales; borde, texto y estado al pasar el cursor en botones secundarios.
- Aplicar el mismo criterio a pestañas, selectores de vista y botones equivalentes que ya usan el color principal del sistema.
- Conservar rojo para eliminar o acciones peligrosas, y mantener los colores semánticos de estados y alertas para no perder claridad.
- Asegurar texto blanco o el contraste apropiado sobre cada fondo.

## Verificación
- Revisar los cinco temas en una pantalla con botones principales, exportación y selector de vista.
- Confirmar contraste, estados al pasar el cursor y que la franja lateral no cambie.
- Comprobar que la aplicación quede sin errores.

## Detalle técnico
Se alinearán los tokens globales de acción con el token del menú lateral y se actualizará el componente común de botones; así el cambio se propagará de forma consistente sin editar cada pantalla por separado.
