# Sincronización global de SIRE

## Objetivo
Crear una única línea principal de sincronización, siempre visible dentro de SIRE al cambiar entre **Ventas (RVIE)**, **Compras (RCE)** y **Configuración API SOL**.

## Cambios
- Subir el selector de **mes y año** al encabezado de SIRE para que ambas pestañas trabajen siempre sobre el mismo período.
- Añadir un solo botón **Sincronizar Compras y Ventas con SUNAT** que procese RVIE y RCE para el período seleccionado.
- Mostrar en la misma línea el avance global y el resultado independiente de cada libro: pendiente, sincronizado o error, con su última fecha de actualización.
- Mantener visible el resumen de operaciones del período al navegar entre Ventas y Compras; la pestaña activa seguirá destacando el libro consultado.
- Eliminar el selector y botón duplicados dentro de cada libro. Las pantallas conservarán su conciliación, detalle, cierre y envío propios.
- Si uno de los libros falla o queda pendiente, conservar el resultado exitoso del otro y permitir reintentar la sincronización global sin perder datos.
- Actualizar conjuntamente las consultas de RVIE, RCE y el resumen al finalizar.

## Detalles técnicos
- Elevar `periodo`, progreso y coordinación de sincronización al nivel principal de la página SIRE.
- Reutilizar la función existente de SUNAT y la conciliación actual, ejecutándolas para cada libro con su ticket independiente.
- Pasar el período compartido a cada panel de libro, evitando que cambie o se reinicie al cambiar de pestaña.
- Verificar la navegación entre las tres pestañas, un período con datos y los estados parcial, exitoso y con error.
