# Matriz horizontal del Flujo de Caja

## Objetivo
Rotar la matriz anual para que los meses aparezcan en la cabecera y los indicadores financieros se lean por filas, manteniendo la edición directa de metas.

## Cambios
- Reemplazar la tabla actual por una matriz con columnas de enero a diciembre y una columna final **Total anual**.
- Organizar las filas en tres bloques visuales:
  - **Metas:** Meta de ingreso, Meta de costo y Resultado objetivo.
  - **Realizado:** Ingreso realizado, Costo realizado y Resultado realizado.
  - **Control:** Variación frente al objetivo, Cumplimiento y Flujo acumulado.
- Mantener editables únicamente las celdas de Meta de ingreso y Meta de costo; cada cambio seguirá guardándose automáticamente.
- Aplicar el semáforo existente a Resultado realizado, Variación y Cumplimiento para facilitar la lectura mensual.
- Conservar el desplazamiento horizontal en pantallas estrechas y fijar la primera columna para mantener visibles los conceptos.
- Ajustar la exportación a Excel para reproducir la misma estructura horizontal por bloques.

## Validación
- Comprobar que las 12 metas se editan y guardan correctamente.
- Verificar cálculos mensuales, acumulado y total anual.
- Revisar la matriz en escritorio y móvil, además de la descarga en Excel.

## Detalles técnicos
- El cambio se limita a la presentación y exportación de Flujo de Caja; no modifica las reglas de cálculo ni la base de datos.
- Los porcentajes sin objetivo seguirán mostrando “—” para evitar resultados engañosos.
