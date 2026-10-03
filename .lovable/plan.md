# Mejoras en el Dashboard de Proyectos

No cambian los datos ni la base de datos, y se mantiene la visibilidad por rol: quien no puede ver montos sigue sin verlos.

## 1. Panel de la obra analizada
- Debajo del medidor de «% Ejecutado» aparecerá el **Costo ejecutado en S/** y el porcentaje del presupuesto gastado. Solo lo verán los roles autorizados a ver montos.
- En Avance general, cuando Inicio, Fin previsto o Días restantes no tengan dato («—» o «Sin fecha»), el texto se verá en gris claro.

## 2. Curva S sin fechas
- En lugar del recuadro con solo una frase, se mostrará una curva S de fondo con líneas grises suaves, a modo de ejemplo.
- Encima irá un mensaje corto y el botón **«Configurar cronograma para activar gráfico»**, que lleva a la página Proyectos, donde se registran las fechas de inicio y fin.

## 3. Cartera de proyectos
- Cuando una obra tenga **diferencia negativa** o **retraso**, la alerta se mostrará en letra más grande y dentro de un recuadro rojo suave. Por ejemplo: «Diferencia S/ -1,484.00» o «40.0% de retraso».
- En los filtros de estado (Todos, No iniciado, En proceso…), los que tengan 0 obras se verán atenuados. Se pueden seguir pulsando.

## 4. Control de cronograma oficial
- Cuando el avance programado sea «Sin dato», su barra se verá con rayas diagonales grises y más tenue, para que no se confunda con un 0 %. Aplica también a las barras de cada tarjeta de la cartera.
- El texto de la esquina derecha tendrá letra más grande y más espacio. Quedará ordenado en un recuadro con:
  - el título «Desviación a la fecha de corte»;
  - el resultado: Retraso, En plazo o Sin avance programado oficial;
  - una línea con la fecha de corte;
  - cuando no haya dato, una indicación de dónde registrarlo.

## Detalles técnicos
- Cambian `src/routes/_authenticated/dashboard-proyectos.tsx` (panel, pildoras, `Barra`, tarjetas, desviación) y `src/components/CurvaS.tsx` (estado vacío con un SVG decorativo y un `Link` a `/proyectos`).
- Las rayas usan `bg-[repeating-linear-gradient(...)]` con el token `--muted-foreground` y `opacity-60`.
- Las alertas usan `bg-bad/10 text-bad` y texto de 12 a 13 px.
- El costo ejecutado usa `obraSel.costoReal` y `obraSel.gastado`, y solo se muestra si `verDinero` lo permite.
