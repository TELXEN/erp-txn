# Boleta mensual automática para el personal Staff

## Qué cambia
- **Personal Staff** (cargos clasificados como "Staff · Gasto general" en Personal) cobra el **mes completo (30 días)** sin depender del Control de Asistencia.
- **Excepciones automáticas** dentro del mes de la boleta:
  - **Ingreso después del día 1:** se pagan los días desde la fecha de ingreso. Ej.: ingresa el 10 → 30 − 9 = **21 días**.
  - **Fin de contrato antes de fin de mes:** se pagan los días hasta la fecha de cese. Ej.: cesa el 20 → **20 días**.
  - **Ambos en el mismo mes:** días desde el ingreso hasta el cese. Ej.: del 5 al 20 → **16 días**.
  - Se usa el mes comercial de 30 días: el día 31 no suma y un mes completo siempre cuenta 30 días, también en febrero.
- **Generación mensual sin pasos manuales:** al abrir Boletas de Pago en un mes sin boletas, el sistema crea la planilla en Borrador y calcula la boleta de cada Staff activo en ese mes (incluidos los que cesaron dentro del mes). El botón «Generar boletas de pago» se mantiene para el personal de obra.
- **Mano de obra directa** sigue igual: los días salen del Control de Asistencia.
- En la boleta del Staff aparece una nota con el motivo, por ejemplo "Ingreso 10/10/2026 · 21 días". Los días se pueden seguir corrigiendo a mano en la boleta pendiente; las validadas o pagadas no se tocan.
- Sueldo básico, asignación familiar, AFP/ONP, renta de quinta y aporte de salud se calculan como hoy, sobre los días resultantes.

## Detalles técnicos
- Nueva función pura `diasStaffMes(fecha_ingreso, fecha_cese, anio, mes)` en `src/lib/nomina-staff.ts`: inicio = max(1, día de ingreso en el mes), fin = min(30, día de cese en el mes) o 30; resultado = max(0, fin − inicio + 1); 0 si ingresa después del mes o cesó antes.
- En `nomina.tsx`, `datosTareo` usa `clasificacionDeCargo(t.cargo, cargos) === "Indirecto"` para tomar los días de `diasStaffMes` (sin horas extra del tareo); el resto sigue con el tareo.
- La lista de la planilla incluye a los Staff cesados cuyo cese cae dentro del mes.
- Un efecto con guarda (solo Gerencia/Administración, mes no Cerrado, una vez por mes) crea la planilla y las boletas Staff faltantes; la sincronización existente recalcula las pendientes.
- Nota de días: `dias_motivo` (texto, nullable) en `boletas`, mostrada en DetallePagoNomina.
- Tests: mes completo = 30; ingreso día 10 = 21; cese día 20 = 20; del 5 al 20 = 16; cese el 31 = 30; ingreso en el mes siguiente = 0.
