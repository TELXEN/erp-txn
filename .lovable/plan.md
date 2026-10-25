# Cesados y reingreso de trabajadores

## Situación actual (verificada)
- Al registrar una liquidación, el trabajador queda inactivo con fecha de cese. Eder Garay está inactivo, cese 25/10/2026, ingreso 02/01/2026.
- Hoy no existe ningún registro de liquidación guardado para él (la ficha se marcó cesada pero la liquidación no quedó), por eso desapareció de las listas sin rastro.
- No hay forma de volver a contratar: la única salida sería editar la ficha a mano, lo que mezclaría el periodo antiguo con el nuevo (CTS, gratificación y vacaciones se calcularían desde 02/01/2026).

## Qué se construye
0. **Restablecer a Eder Garay ahora**: volver a activo, borrar la fecha de cese 25/10/2026 y conservar su ingreso 02/01/2026 (no tiene liquidación guardada, así que no hay nada más que deshacer).
1. **Filtro «Activos / Cesados / Todos»** en Personal (en la lupa). Los cesados se ven en gris con su fecha de cese; sus boletas, recibos, CTS y liquidaciones siguen consultables.
2. **Botón «Reingresar»** en la barra derecha al seleccionar un cesado. Pide nueva fecha de ingreso (posterior al cese), cargo y sueldo. El trabajador vuelve a activo con esa fecha; se borra la fecha de cese.
3. **Historial de vínculos laborales**: cada periodo (ingreso → cese) se guarda aparte. La ficha muestra «Vínculos anteriores» con fechas y la liquidación de cada uno.
4. **Cálculos desde el nuevo ingreso**: CTS, gratificación, liquidación y renta de 5ta usan solo el vínculo vigente; lo pagado en el periodo anterior queda congelado. Renta de 5ta del mismo año sí suma lo ya pagado (el ejercicio fiscal es anual).
5. **Deshacer cese de prueba**: opción «Anular cese» (Gerencia) para casos como Eder: si no hay liquidación pagada, lo devuelve a activo con su ingreso original, sin crear un vínculo nuevo.
6. **Corrección de la liquidación**: registrar la liquidación y el cese en un solo paso; si falla la liquidación, el trabajador no queda inactivo.

## Detalles técnicos
- Nueva tabla `vinculos_laborales` (trabajador_id, fecha_ingreso, fecha_cese, motivo, liquidacion_id) con RLS como trabajadores; migración rellena un vínculo por trabajador existente.
- Función SQL segura `registrar_liquidacion` (inserta beneficio + cierra vínculo + inactiva, atómico) y `reingresar_trabajador` / `anular_cese`.
- `beneficios.ts` filtra periodos por vínculo vigente (`fecha_ingreso` del vínculo).
- Pruebas: reingreso 01/03/2027 tras cese 25/10/2026 → CTS mayo 2027 cuenta desde 01/03/2027; anular cese restaura ingreso 02/01/2026.

