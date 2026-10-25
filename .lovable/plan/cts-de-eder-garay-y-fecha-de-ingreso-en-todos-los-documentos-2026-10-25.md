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
4. **Hoja de liquidación de CTS (boleta de sustento)**: un nuevo botón en la barra derecha abre la hoja A4 del registro seleccionado, con vista previa e impresión. La hoja muestra los datos de TELXEN y del trabajador, la fecha de ingreso, el periodo computado, los meses y días, y la remuneración computable desglosada (sueldo, asignación familiar y 1/6 de la gratificación). También incluye la fórmula, el monto, el banco, la fecha y el número de operación del depósito, más espacios para firmas. Tiene el mismo estilo que las demás hojas imprimibles.
5. **Regularización de periodos no depositados**: al calcular la CTS de noviembre, el sistema revisa si el trabajador tenía derecho a la CTS de mayo del mismo año y si ese depósito falta o sigue pendiente.
   - Si es así, muestra un aviso: «Eder Garay no tiene depositada la CTS de mayo 2026», con dos opciones:
     - **Regularizar**: calcula el periodo de mayo, si no existía, y lo marca como «Regularización». Así se puede pagar junto con el de noviembre y cada uno tiene su propia hoja.
     - **Omitir**: calcula solo noviembre.
   - Los registros regularizados llevan una etiqueta visible y la fecha real de su depósito. Por defecto no se calculan intereses ni recargos. El aviso solo recuerda que un depósito fuera de plazo puede generar intereses según la ley.

## Detalles técnicos
- Llevar `calcCts`/`calcGrat`/`calcLiquidacion` y los rangos de periodo a `src/lib/beneficios.ts`, con pruebas: ingreso 02/01/2026 → CTS Nov 2026 = 6 m 0 d; ingreso 15/06/2026 → 4 m 16 d.
- En `personal.tsx`, después de guardar un cambio de `fecha_ingreso`, hacer upsert de las filas pendientes de `beneficios_sociales` de ese trabajador con la función compartida e invalidar las consultas de beneficios, nómina y honorarios.
- Migración: agregar `beneficios_sociales.regularizacion boolean default false`. La detección del periodo anterior va en `src/lib/beneficios.ts` (`periodoAnteriorFaltante`), con prueba: ingreso 02/01/2026 sin CTS de mayo → falta mayo 2026 (01/11/2025–30/04/2026, 3 m 29 d).
- Componente `HojaCts.tsx` en HTML A4 fijo, con los colores y la fuente de `documento-tema.ts`.
