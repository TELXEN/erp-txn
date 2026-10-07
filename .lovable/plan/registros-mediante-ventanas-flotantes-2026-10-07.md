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
- Después de guardar correctamente, mantener la ventana abierta, limpiar únicamente los datos propios del registro y dejarla lista para una nueva captura.
- Incluir acciones claras **Registrar otro** y **Registrar y cerrar**; además, el usuario podrá cerrar cuando quiera mediante X, Cancelar, Escape o clic fuera.
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
- Tras emitir correctamente, mostrar la confirmación, expandir la orden creada y preparar una orden nueva en la misma ventana; **Registrar y cerrar** completa la última alta y vuelve al listado.

### Proyectos
- Reemplazar el panel colapsable por **+ Nuevo proyecto** junto a los controles Tabla/Kanban.
- Conservar en la ventana las tres secciones actuales: Información general, Cronograma y estado, y Finanzas.
- Mantener generación automática de código y validación conjunta de avance programado/fecha de corte.
- Refrescar el listado o tablero después de cada alta y conservar abierta la ventana para registrar otro proyecto, salvo que se elija **Registrar y cerrar**.

### Partidas
- Eliminar la pestaña secundaria «Nueva partida» y dejar «Listado y estructura» como vista de trabajo.
- Abrir **+ Nueva partida** en una ventana desde la cabecera del listado.
- Mantener carga desde el registro maestro, código sugerido, presupuesto calculado, tipo, prioridad y reglas de gastos generales/utilidad.
- Conservar las dos acciones: **Registrar otro** mantiene abierta la ventana con los datos contextuales; **Registrar y cerrar** completa el alta y vuelve al listado.

### Importaciones
- Retirar el panel incrustado «Nueva importación» y añadir **+ Nueva importación** en la cabecera de «Carpetas de importación».
- Incluir en la ventana los datos de proveedor, origen, destino, orden relacionada, despacho, transporte, fechas, moneda, observación e ítems FOB.
- Mantener validaciones de fechas, Courier mayor a US$ 2,000, cálculo FOB y selección de equipos del maestro.
- Al guardar, limpiar la captura y preparar otra importación en la misma ventana; **Registrar y cerrar** completa el alta y muestra la nueva carpeta en el listado.

### Gestión de personal
- Convertir el panel desplegable «Nuevo trabajador» en una ventana abierta desde **+ Nuevo trabajador**.
- Mantener las cuatro secciones actuales: Datos personales, Datos laborales, Sueldo y pago, y Régimen de pensiones.
- Conservar validaciones de DNI, celular, CCI, cargo y campos según Planilla/Honorarios.
- Actualizar la planilla después de cada alta y dejar la ventana lista para otro trabajador; **Registrar y cerrar** completa el último registro y vuelve a la planilla.

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
- Confirmar en todos los módulos que se pueden guardar varios registros consecutivos sin reabrir la ventana y cerrarla a elección después de cualquier alta.
- Registrar un ejemplo temporal por módulo, comprobar que aparece en su listado y eliminarlo cuando sea seguro.
- Verificar edición de vehículo en la misma ventana y las dos acciones de guardado de partidas.
- Revisar escritorio y móvil, además de compilación y errores de ejecución.
