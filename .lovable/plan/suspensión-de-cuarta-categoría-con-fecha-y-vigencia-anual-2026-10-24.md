# Suspensión de cuarta categoría con fecha y vigencia anual

## Qué verá el usuario
- En **Registro de personal** (contratación por Honorarios), la casilla «Suspensión de retención 4ta» se acompaña de:
  - **Fecha de presentación / aprobación** de la constancia SUNAT.
  - **Año de vigencia** (se propone el año de la fecha; la suspensión vale solo para ese año, hasta el 31/12).
  - N° de constancia / operación (opcional).
- En la planilla, junto al prestador: «Suspensión 4ta 2026» en verde si está vigente, «Suspensión vencida (2025)» en ámbar si es de un año anterior, o «Retención 8%» si no tiene.
- Aviso en Personal a partir de enero: «X prestadores deben renovar su suspensión de 4ta».
- Exportación a Excel incluye fecha y año de vigencia.

## Validación al registrar el recibo por honorarios
- La retención del 8% se decide según la **fecha de emisión del recibo**: solo se omite si existe suspensión cuyo año de vigencia coincide con el año del recibo y la fecha de la suspensión es **al menos dos días anterior** a la emisión del recibo (ej.: suspensión del 10/03 vale para recibos desde el 12/03).
- Si la suspensión no está vigente, el detalle de pago lo indica en una nota ámbar («Suspensión de 2025 no vigente para 2026: se aplica retención 8%») y calcula la retención.
- Aplica igual al editor del detalle, al listado de recibos y a «Generar boletas de pago» desde el tareo, para que todos los montos coincidan.
- Los recibos ya guardados no se recalculan.

## Datos existentes
- Los trabajadores que hoy tienen la casilla marcada quedan con año de vigencia vacío y se muestran como «Suspensión sin fecha — completar»; hasta completarla se aplica la retención (se avisará). Alternativa si prefieres: considerarlos vigentes para 2026.

## Detalles técnicos
- Migración aditiva en `trabajadores`: `suspension_cuarta_fecha date`, `suspension_cuarta_anio int`, `suspension_cuarta_constancia text` (nullable).
- Nueva función pura `suspensionVigente(trabajador, fechaRecibo)` en `src/lib/pagos-rrhh.ts`, usada por `calcularDetalleHonorario` (honorarios.tsx, DetallePagoHonorario.tsx, GenerarBoletasHonorarios.tsx) en lugar del booleano directo.
- Formulario y planilla en `personal.tsx`; tipo en `src/lib/datos.ts`.
- Pruebas unitarias: vigente en el mismo año, vencida al año siguiente, fecha posterior al recibo, sin fecha.
