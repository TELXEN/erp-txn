# Avance programado tipo hoja de cálculo

## Objetivo
Corregir la alineación del Calendario de avance de obra, permitir edición múltiple tipo Excel y asegurar que el Dashboard de Proyectos refleje inmediatamente el avance programado guardado.

## Cambios
1. **Renombrar la vista**
   - Cambiar “Cronograma mensual” por **“Avance programado”** en el selector de Avance Físico.
   - Mantener “Calendario de avance de obra” como título de la matriz.

2. **Alinear la matriz**
   - Fijar anchos y alturas consistentes para cabecera, partidas, periodos y columnas de resumen.
   - Mantener visible la columna de partidas al desplazarse horizontalmente.
   - Evitar que montos, porcentajes o nombres cambien la altura y desalineen las filas.

3. **Selección y edición múltiple**
   - Permitir seleccionar una celda o un rango rectangular arrastrando con el mouse.
   - Resaltar claramente la selección activa.
   - Aceptar copiar y pegar desde/hacia Excel mediante `Ctrl/Cmd+C` y `Ctrl/Cmd+V`, respetando filas y columnas.
   - Permitir arrastrar el controlador de la celda o rango para repetir el valor, con una experiencia similar al relleno de Excel.
   - Validar todos los valores entre 0% y 100% y que cada partida no supere 100% acumulado antes de guardar.
   - Guardar el lote completo y mostrar un único resultado o error, evitando actualizaciones parciales.

4. **Vinculación con Dashboard**
   - Actualizar la información compartida al terminar cada guardado individual o múltiple.
   - Calcular el avance programado del Dashboard con las partidas finales de la obra y la periodicidad elegida.
   - Mostrar como fecha de corte la fecha actual cuando el dato provenga del calendario dinámico, conservando el corte manual solo como respaldo.
   - Verificar que Ingeniero vea porcentajes y desviaciones sin montos; Administrador y Gerente mantienen importes.

## Verificación
- Probar selección, copiado, pegado y arrastre en una obra con varias partidas y periodos.
- Confirmar alineación y desplazamiento en escritorio y pantalla angosta.
- Confirmar que el Dashboard cambia después de guardar y no presenta errores en consola.
