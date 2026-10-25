# CTS de Eder Garay y fecha de ingreso en todos los documentos

## Diagnóstico (verificado en la base de datos)
- La ficha de Eder Garay tiene ingreso **02/01/2026**.
- Su CTS Noviembre 2026 cubre **01/05/2026 – 31/10/2026**: 6 meses completos, S/ 2,113.42, pendiente.
- El 01/05/2026 **no es su fecha de ingreso**. Es el inicio del semestre de la CTS de noviembre (mayo–octubre). El cálculo es correcto, pero la pantalla no muestra el ingreso real y por eso se presta a confusión.

## Cambios
1. **Beneficios Sociales**: nueva columna «Ingreso» con la fecha de la ficha del trabajador, y la columna «Cómputo» rotulada como «Periodo computado». El Excel también lleva la columna «Fecha de ingreso».
2. **Actualizar al cambiar la fecha de ingreso** en Personal:
   - Se recalculan solos sus registros **pendientes** de CTS y gratificación (tiempo computado y monto). Las liquidaciones pendientes toman el nuevo ingreso para las vacaciones truncas.
   - Las boletas de pago y los recibos por honorarios que aún no están cerrados o pagados se recalculan al abrirlos, porque ya leen la ficha.
   - Los registros **pagados o cerrados no cambian**, para conservar el historial. Si alguno se ve afectado, aparece un aviso que dice cuántos son.
3. Las pantallas siempre muestran la fecha de ingreso vigente, tomada de la ficha y no de una copia guardada.

## Detalles técnicos
- Llevar `calcCts`/`calcGrat`/`calcLiquidacion` y los rangos de periodo a `src/lib/beneficios.ts`, con pruebas: ingreso 02/01/2026 → CTS Nov 2026 = 6 m 0 d; ingreso 15/06/2026 → 4 m 16 d.
- En `personal.tsx`, después de guardar un cambio de `fecha_ingreso`, hacer upsert de las filas pendientes de `beneficios_sociales` de ese trabajador con la función compartida e invalidar las consultas de beneficios, nómina y honorarios.
