# Boletas para Staff en mina (régimen atípico 20x10)

## Idea
El sueldo mensual de un Staff en jornada 20x10 ya paga los 30 días del mes (20 trabajados + 10 de descanso). Por eso la boleta normal no cambia. Solo cuando se quedan más días de los pactados (ej. 28), los días adicionales se pagan como **descanso trabajado**.

## Cómo funcionará
1. **En Personal**: nuevo campo «Jornada atípica» en el trabajador (ej. 20x10 = 20 días de trabajo por ciclo). Vacío = Staff normal.
2. **En Control de Asistencia**: para esos trabajadores se marcan los días en mina, como ya se hace en obra.
3. **En la boleta automática**:
   - Se pagan 30 días (con las mismas excepciones de ingreso o cese a mitad de mes).
   - Días en mina por encima de los pactados = «Días de descanso trabajados».
   - Se pagan a sueldo/30 por día con recargo del 100 % (pago doble, como manda la ley para descanso trabajado). Este pago se suma a los ingresos afectos a AFP/ONP, EsSalud y renta de quinta.
   - Nota en la boleta: «Jornada 20x10 · 28 días en mina · 8 días de descanso trabajados».
   - Si en el mes trabajaron menos de 20 días porque el ciclo cae entre dos meses, no se descuenta nada.
4. Los cambios manuales en boletas pendientes se respetan; las validadas o pagadas no se tocan.

## Detalles técnicos
- Migración: `trabajadores.jornada_dias_trabajo int null` y `jornada_dias_descanso int null`.
- `src/lib/nomina-staff.ts`: `diasDescansoTrabajados(diasTareo, pactados, diasMes)`, prorrateando lo pactado si hay ingreso o cese en el mes; tests en `nomina-staff.test.ts` (28 días → 8 extra; 20 → 0; 15 → 0).
- `nomina.tsx`: para Staff con jornada, leer días del tareo y generar el concepto de descanso trabajado; `dias_motivo` con la nota.
- `DetallePagoNomina.tsx`: línea de ingreso «Descanso trabajado (N días)».
- Se puede cambiar el recargo a día simple si así lo pactaron.
