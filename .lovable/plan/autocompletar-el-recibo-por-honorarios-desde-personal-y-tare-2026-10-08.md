# Autocompletar el recibo por honorarios desde Personal y Tareo

## Objetivo
Al crear o editar un «Detalle de pago por honorarios», los campos se completan solos con los datos reales del trabajador y de su tareo del mes, sin digitarlos a mano.

## Qué se autocompletará

**Desde la ficha del trabajador (tabla `trabajadores`):**
- DNI, apellidos y nombre
- Cuenta de ahorros y banco de pago
- Costo unitario (jornal/sueldo diario según su registro)

**Desde el tareo (tabla `tareos`), filtrado por trabajador + proyecto + mes/año elegidos:**
- Días laborados = suma de la asistencia registrada en el mes
- Horas extras = suma de horas extras del mes
- Al cambiar trabajador, proyecto, mes o año, los valores se recalculan automáticamente

**Reglas:**
- Los campos autocompletados siguen siendo editables (por si hay ajustes manuales como adelantos o descuentos).
- Si el trabajador no tiene tareo en ese mes, los campos quedan en cero y se muestra un aviso suave: «Sin tareo registrado en este período».
- Los totales (remuneraciones, descuentos, neto a pagar y retención) se recalculan en tiempo real como hoy.

## Cambios técnicos
- `src/routes/_authenticated/honorarios.tsx`: al elegir trabajador/proyecto/mes/año en el editor, consultar el tareo del período (hook existente `useTareos` en `src/lib/datos.ts`) y precargar días laborados, horas extras y costo unitario; precargar DNI/cuenta/banco desde la ficha (ya disponible).
- `src/components/personal/DetallePagoHonorario.tsx`: marcar visualmente los campos autocompletados (etiqueta «automático») y permitir sobrescribirlos.
- Sin cambios de base de datos: se reutilizan `trabajadores` y `tareos` existentes.

## Verificación
- Crear un detalle para un trabajador con tareo del mes y confirmar que días/horas/costo llegan solos y el neto cuadra.
- Cambiar de mes y confirmar que los valores se actualizan.
- Probar con un trabajador sin tareo: campos en cero con el aviso.
