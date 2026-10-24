# Renta de 5ta categoría automática en planilla

## Qué verás
- Al generar o recalcular la planilla del mes, la columna **Renta 5ta** se llena sola para los trabajadores en planilla cuya renta anual proyectada supera 7 UIT. Los que no llegan quedan en 0.
- El monto sigue siendo editable en la boleta; si lo cambias a mano, se marca como «manual» y no se pisa al recalcular.
- Al pasar el cursor sobre el monto se ve el detalle: renta proyectada, menos 7 UIT, impuesto anual, retenido en meses anteriores y divisor del mes.
- La UIT del año se configura en **Datos de AFP**; se carga S/ 5,500 para 2026 (7 UIT = S/ 38,500).
- En **Registro de personal** se agrega la opción **Seguro de salud: EsSalud / EPS** (EsSalud por defecto). Se usa para la bonificación de gratificación (9 % o 6.75 %) en la proyección de renta de 5ta y aparece en la lista y en la exportación Excel.

## Regla de cálculo (SUNAT, procedimiento mensual)
1. Remuneración proyectada = sueldo del mes × meses que faltan (incluido el actual) + remuneraciones ya pagadas en el año.
2. Más gratificaciones de julio y diciembre aún no pagadas, con su bonificación extraordinaria de 9 % (EsSalud) o 6.75 % (EPS).
3. Renta neta = proyectada − 7 UIT. Si es ≤ 0, no hay retención.
4. Impuesto anual por tramos: 8 % hasta 5 UIT, 14 % hasta 20, 17 % hasta 35, 20 % hasta 45, 30 % sobre 45.
5. Retención del mes = (impuesto anual − retenido en meses anteriores) ÷ divisor: enero–marzo 12; abril 9; mayo–julio 8; agosto 5; septiembre–noviembre 4; diciembre: saldo completo (con agosto y diciembre restando además lo del mes correspondiente según norma).
6. Solo aplica a trabajadores en planilla (no prestadores por honorarios).

## Detalles técnicos
- Nuevo `src/lib/renta-quinta.ts` con `calcularRentaQuinta({ anio, mes, sueldoMes, pagadoAnterior, retenidoAnterior, gratiPagadas, uit, eps })` y pruebas en `renta-quinta.test.ts` (tramos, umbral 7 UIT, divisores por mes, diciembre).
- `nomina.tsx`: al generar/recalcular, leer las boletas previas del año del trabajador (total_ingresos, renta_quinta) y usar el resultado en `calcularBoleta`; respetar valores manuales.
- Migración aditiva: `boletas.renta_quinta_manual boolean default false`; tabla o parámetro de UIT por año con GRANT + RLS (lectura autenticados, edición Gerencia).
