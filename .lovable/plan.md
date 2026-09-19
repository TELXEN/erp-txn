# Ampliar la planilla de personal

## Cambios
- Añadir a cada trabajador DNI, cargo, número de cuenta, CCI, banco y celular.
- Reemplazar las categorías actuales del formulario por la lista de cargos indicada.
- Hacer obligatorios todos los campos al registrar y editar personal.
- Ordenar la planilla como: DNI, Nombre, Cargo, Jornal diario, N° cuenta, CCI, Banco, N° celular y Acciones.
- Añadir acciones con iconos para editar en la misma fila y eliminar con confirmación.
- Actualizar la exportación a Excel con los mismos campos y orden.

## Datos existentes
- Los trabajadores actuales se conservarán. Sus nuevos datos quedarán identificados como pendientes de completar y podrán corregirse con el icono de edición.

## Detalles técnicos
- Ampliar la tabla de trabajadores con validaciones de longitud y valores permitidos para cargo.
- Mantener el jornal vigente para que el Tareo Diario continúe calculando costos sin cambios.
- Validar los campos en pantalla y también en la base de datos.
- Verificar registro, edición, eliminación y presentación de la planilla.
