# Pago por día pactado con boleta complementaria

## Caso
Sueldo en planilla S/ 3,500. Acuerdo: S/ 200 por día trabajado. 24 días = S/ 4,800. Se paga S/ 3,500 en la boleta normal y la diferencia (S/ 1,300) en una segunda boleta del mismo mes.

## Cómo funcionará
1. **En Personal**: nuevo campo opcional «Tarifa pactada por día» (ej. S/ 200). Vacío = trabajador normal.
2. **Días trabajados**: se toman de Control de Asistencia (24 en el ejemplo).
3. **Boleta de Pago normal**: igual que hoy, con el sueldo de S/ 3,500.
4. **Boleta complementaria** (nueva, mismo mes): se crea sola cuando días × tarifa supera el sueldo.
   - Ingreso: «Complemento por días trabajados (24 × S/ 200 − S/ 3,500) = S/ 1,300».
   - Si días × tarifa no supera el sueldo, no se crea (nunca se paga menos que el sueldo).
   - Se puede editar mientras esté pendiente, validar y pagar igual que las demás boletas.
5. **Descuentos**: la ley obliga a que todo pago al trabajador aporte AFP/ONP, EsSalud y renta de quinta. La complementaria calcula sus descuentos para que, sumados a la boleta normal, den lo mismo que si fuera un solo pago de S/ 4,800. Así no queda deuda con SUNAT.
6. **Beneficios**: el complemento cuenta para CTS y gratificación cuando se repite en el semestre (como un pago variable regular).
7. **En Tesorería**: aparecen dos pagos separados del mes, uno por cada boleta.

## Detalles técnicos
- Migración: `trabajadores.tarifa_dia numeric null`; `boletas.tipo text default 'Normal'` ('Normal' | 'Complementaria') con única por planilla+trabajador+tipo.
- `src/lib/nomina-complemento.ts`: `montoComplemento(dias, tarifa, sueldo)` y reparto de descuentos (total del mes − boleta normal); tests: 24×200 con 3,500 → 1,300; 15×200 → 0.
- `nomina.tsx`: generar la complementaria junto con las boletas; listado agrupado por trabajador.
- `DetallePagoNomina.tsx`: título «BOLETA DE PAGO COMPLEMENTARIA».
- Remuneración variable para CTS/gratificación en `src/lib/beneficios.ts` (promedio si aparece en 3 de 6 meses).
