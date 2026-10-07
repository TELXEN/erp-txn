# Mejora integral del listado de proyectos

## Objetivo
Convertir el listado de Proyectos en una vista compacta y comparable para ingeniería y finanzas, con estados coherentes, filtros rápidos y controles que impidan costos inválidos.

## Cambios en la lista
- Aplicar **Roboto** a la tabla, filtros, pestañas y acciones del listado, sin alterar la tipografía global del ERP.
- Reordenar y dimensionar las columnas para lectura rápida:
  - Código, Cliente, Nombre de la obra y Responsable alineados a la izquierda.
  - Presupuesto y Costo ejecutado alineados estrictamente a la derecha, con cifras tabulares.
  - Plazo mostrará únicamente `dd/mm/aaaa - dd/mm/aaaa`; se retirarán de esa celda el avance y la fecha de corte.
- Crear una mini-columna **Avance programado** con barra visual, porcentaje legible y estado vacío cuando no exista programación.
- Mantener filas compactas, encabezado estable y desplazamiento horizontal solo cuando sea necesario.

## Pestañas y filtros
- Añadir una barra superior con contadores para:
  - **Todos**: proyectos no archivados de cualquier estado.
  - **Borradores**: estado real `Borrador`.
  - **En Ejecución**: estados `En proceso` y `Retrasado`.
  - **Finalizados**: estado `Completado`.
  - **Archivados**: proyectos ocultos, con opción de restaurarlos.
- Mantener la búsqueda existente y agregar a su lado un selector de **Cliente**, generado desde los clientes presentes en los proyectos.
- Combinar búsqueda, cliente y pestaña activa en un único filtrado; mostrar el total resultante y un mensaje vacío específico para cada vista.

## Estados y reglas de costos
- Incorporar **Borrador** como estado real en el catálogo y en las validaciones de la base de datos.
- Añadir archivo lógico al proyecto, conservando toda su información y relaciones; archivar nunca eliminará partidas, costos ni documentos.
- Si un proyecto `No iniciado` registra un costo ejecutado mayor que cero, cambiar automáticamente su estado a **En proceso**. También corregir los proyectos existentes que ya cumplen esta condición.
- Bloquear nuevos costos —y cambios que asignen un costo a otra obra— cuando:
  - el proyecto esté en `Borrador`; o
  - su presupuesto total sea `S/ 0.00`.
- Mostrar advertencias claras, por ejemplo: “No se puede registrar el costo porque el proyecto está en Borrador” o “Asigna un presupuesto mayor a S/ 0.00 antes de registrar costos”.
- Aplicar la regla de forma central a gastos directos, gastos generales, tareo de personal y tareo vehicular. Así también quedan cubiertos los registros que llegan desde órdenes de compra, caja chica e importaciones.
- Mantener sincronizados el estado visible y el estado interno del proyecto, incluso cuando se cambie desde Kanban.

## Acciones por proyecto
- Dejar visibles únicamente:
  - **Ver** (ojo): abrir un resumen de solo lectura con datos generales, plazo, avance y desglose financiero.
  - **Editar** (lápiz): conservar la edición del proyecto.
- Añadir un menú secundario de tres puntos con:
  - **Duplicar**: copiar únicamente los datos de cabecera y configuración del proyecto, generar un código nuevo mediante el flujo seguro existente y crear la copia en `Borrador`; no copiar partidas, costos ni documentos.
  - **Archivar**: ocultar el proyecto de las vistas operativas del listado sin borrar relaciones.
  - En Archivados, reemplazar Archivar por **Restaurar**.
- Mantener la eliminación fuera de las acciones principales; el archivo será la acción administrativa segura para proyectos con historial.

## Implementación técnica
- Actualizar la estructura de `proyectos` con una marca de archivo y ampliar la restricción de estados para aceptar `Borrador`.
- Añadir funciones y disparadores de base de datos para validar cada alta/cambio de costo y ejecutar la transición `No iniciado → En proceso` de forma atómica.
- Actualizar el catálogo `estados_proyecto` y realizar una corrección controlada de los proyectos existentes con costo ejecutado.
- Ajustar los tipos y consultas compartidas para reconocer el nuevo estado y la condición de archivo.
- Implementar la interfaz en la pantalla actual de Proyectos reutilizando los controles, menús e insignias existentes del sistema.

## Verificación
- Comprobar los filtros combinados, contadores, alineación, formato de fechas, barra de avance y comportamiento en anchos de escritorio reducidos.
- Probar crear/editar, duplicar, archivar y restaurar sin afectar relaciones existentes.
- Probar que un costo válido cambia `No iniciado` a `En proceso`.
- Probar que gastos directos, generales, tareos y costos vehiculares rechazan proyectos en Borrador o sin presupuesto con el mensaje correcto.
- Confirmar que Kanban y tabla muestran el mismo estado y que la aplicación queda sin errores de compilación ni ejecución.
