# Registros mediante ventanas flotantes

## Objetivo
Unificar el alta de datos con el patrón de **Registrar cliente**: cada listado queda visible y el formulario se abre únicamente desde un botón principal con signo **+**, dentro de una ventana flotante centrada.

La mención repetida de «nueva orden de compra» se considera una sola pantalla. «Vehículos» y «Flota» corresponden al mismo registro dentro del módulo Vehículos, por lo que se implementará un único botón **+ Registrar vehículo** en la pestaña Flota.

## Patrón común
- Crear un contenedor reutilizable de ventana flotante con fondo oscurecido, cabecera, título, botón X, contenido con desplazamiento propio y pie de acciones.
- Permitir cerrar con X, Cancelar, tecla Escape o clic fuera; no cerrar al interactuar dentro.
- Mantener el menú lateral y el listado visibles detrás de la ventana.
- Dar foco al primer dato obligatorio al abrir.
- Conservar validaciones, permisos, cálculos, códigos automáticos y mensajes existentes.
- Mostrar los errores dentro de la ventana sin cerrarla.
- Adaptar la distribución de campos a escritorio y móvil sin reducir ni eliminar datos.

## Cambios por módulo

### Vehículos · Flota
- Sustituir el formulario incrustado «Registrar vehículo» por **+ Registrar vehículo** junto al listado de Flota.
- Abrir en la ventana las secciones actuales: Identificación, Situación y documentos, Tarifas internas y Observación.
- Mantener alertas de placa duplicada, vigencia de SOAT/revisión técnica y accesos rápidos de +1 año.
- Reutilizar la misma ventana para editar un vehículo desde el lápiz, precargando sus datos.

### Órdenes de compra
- Retirar el panel superior «Nueva orden de compra» y colocar **+ Nueva orden de compra** en la cabecera de «Órdenes emitidas».
- Llevar a la ventana la selección de obra, proveedor, requerimiento, entrega, condición de pago, observación y tabla de ítems.
- Mantener la carga desde requerimientos, selección desde el maestro de insumos, parciales y total.
- Tras emitir correctamente, cerrar la ventana, expandir la orden creada y mostrar la confirmación en el listado.

### Proyectos
- Reemplazar el panel colapsable por **+ Nuevo proyecto** junto a los controles Tabla/Kanban.
- Conservar en la ventana las tres secciones actuales: Información general, Cronograma y estado, y Finanzas.
- Mantener generación automática de código y validación conjunta de avance programado/fecha de corte.
- Cerrar al registrar y refrescar el listado o tablero.

### Partidas
- Eliminar la pestaña secundaria «Nueva partida» y dejar «Listado y estructura» como vista de trabajo.
- Abrir **+ Nueva partida** en una ventana desde la cabecera del listado.
- Mantener carga desde el registro maestro, código sugerido, presupuesto calculado, tipo, prioridad y reglas de gastos generales/utilidad.
- Conservar las dos acciones: **Registrar y agregar otra** mantiene abierta la ventana con los datos contextuales; **Registrar y cerrar** vuelve al listado.

### Importaciones
- Retirar el panel incrustado «Nueva importación» y añadir **+ Nueva importación** en la cabecera de «Carpetas de importación».
- Incluir en la ventana los datos de proveedor, origen, destino, orden relacionada, despacho, transporte, fechas, moneda, observación e ítems FOB.
- Mantener validaciones de fechas, Courier mayor a US$ 2,000, cálculo FOB y selección de equipos del maestro.
- Al guardar, cerrar la ventana, limpiar la captura y mostrar la nueva carpeta en el listado.

### Gestión de personal
- Convertir el panel desplegable «Nuevo trabajador» en una ventana abierta desde **+ Nuevo trabajador**.
- Mantener las cuatro secciones actuales: Datos personales, Datos laborales, Sueldo y pago, y Régimen de pensiones.
- Conservar validaciones de DNI, celular, CCI, cargo y campos según Planilla/Honorarios.
- Cerrar al registrar correctamente y actualizar la planilla.

## Archivos previstos
- `src/components/ui-kit.tsx`: contenedor reutilizable de ventana flotante.
- `src/routes/_authenticated/vehiculos.tsx`
- `src/routes/_authenticated/ordenes-compra.tsx`
- `src/routes/_authenticated/proyectos.tsx`
- `src/routes/_authenticated/partidas.tsx`
- `src/routes/_authenticated/importaciones.tsx`
- `src/routes/_authenticated/personal.tsx`

No se requieren cambios de base de datos ni de las reglas de negocio.

## Verificación
- Probar apertura y cierre por botón, X, Cancelar, Escape y fondo en cada pantalla.
- Confirmar que cada alta conserva todos sus datos, validaciones y permisos.
- Registrar un ejemplo temporal por módulo, comprobar que aparece en su listado y eliminarlo cuando sea seguro.
- Verificar edición de vehículo en la misma ventana y las dos acciones de guardado de partidas.
- Revisar escritorio y móvil, además de compilación y errores de ejecución.
