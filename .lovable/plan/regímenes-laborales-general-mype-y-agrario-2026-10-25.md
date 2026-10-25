# Regímenes laborales: General, MYPE y Agrario

## Situación actual
Cada trabajador ya tiene su propio régimen (General, MYPE Pequeña, MYPE Micro, Agrario), y la CTS, la gratificación y las vacaciones se ajustan según ese régimen:

| Régimen | Gratificación | CTS | Vacaciones | Asignación familiar |
|---|---|---|---|---|
| General | 2 sueldos al año | 1 sueldo al año | 30 días | Sí |
| MYPE Pequeña | 1/2 sueldo (x2) | 1/2 sueldo al año | 15 días | No |
| MYPE Micro | No | No | 15 días | No |
| Agrario | No (hoy) | No (hoy) | 30 días | Sí |

Lo que falta:
- La empresa no tiene un régimen propio: se puede poner MYPE a un trabajador aunque TELXEN no esté en el REMYPE, o al revés.
- El régimen Agrario sigue la ley antigua. Con la Ley 31110 el trabajador agrario sí recibe gratificación y CTS (o las cobra prorrateadas en su pago diario), y la bonificación extraordinaria del 6 % cambia según el año (8 % en 2025–2026, 9 % desde 2027).
- En la Micro no corresponde bonificación extraordinaria (el trabajador va al SIS, no a EsSalud), y en la Pequeña sí (9 %).

## Propuesta
1. **Cambio libre del régimen de la empresa** en Datos de la empresa: Gerencia/Administración pueden cambiarlo cuando quieran, a cualquier régimen y con la fecha de inicio que elijan (ej. General hasta 31/12/2026; MYPE Pequeña desde 01/01/2027 con N° y certificado REMYPE opcionales). Cada cambio queda en un historial y solo aplica a los trabajadores que ingresen desde esa fecha.
2. **Régimen del trabajador fijado según su fecha de ingreso**: los trabajadores contratados antes del cambio siguen en el régimen General (por ley no se les puede bajar el régimen). Solo los que ingresen desde el 01/01/2027 toman el régimen MYPE por defecto. El sistema no deja pasar a MYPE a un trabajador contratado antes y muestra el motivo. Si alguien se vuelve a contratar con un nuevo vínculo laboral, toma el régimen vigente en la fecha de ese reingreso.
3. **Agrario actualizado** (Ley 31110): gratificación y CTS como en el General, con opción por trabajador de "prorrateado en el jornal" (si se marca, no se calculan aparte), y bonificación extraordinaria según el año.
4. **Boletas**: CTS, gratificación y liquidación muestran el régimen y la regla usada en el sustento ("MYPE Pequeña: 15 remuneraciones diarias por año", etc.). Cuando el régimen no da derecho a un beneficio, la boleta lo dice en vez de mostrar S/ 0.00.
5. **Pruebas**: un caso por régimen con montos fijos (General, Pequeña, Micro, Agrario 2026).

## Detalles técnicos
- Migración: tabla `regimenes_empresa` (régimen, fecha de inicio, N° y certificado REMYPE; con grants y RLS, escritura solo Gerencia/Administración); régimen guardado en `vinculos_laborales` al ingresar/reingresar; trigger que impide pasar a MYPE a un trabajador con ingreso anterior a la fecha REMYPE; `agrario_prorrateado boolean default false` en trabajadores.
- `src/lib/beneficios.ts`: tabla de factores por régimen y año (bonificación agraria 6/7/8/9 %), bonificación 0 para Micro, prorrateo agrario.
- Personal: valor por defecto del régimen desde `useEmpresa`, aviso de discrepancia.
- `HojaCts.tsx`: leyenda del régimen y "no corresponde".
- Tests en el archivo de tests de beneficios existente.
- No se recalculan los beneficios ya registrados; solo los nuevos cálculos usan las reglas nuevas.
