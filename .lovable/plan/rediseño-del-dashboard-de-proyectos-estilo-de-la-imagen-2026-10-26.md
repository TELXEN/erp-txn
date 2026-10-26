# Rediseño del Dashboard de Proyectos (estilo de la imagen)

Se toma la disposición y el estilo de la imagen (tarjetas grandes con color, iconos en círculo y gráficos circulares) y se le pasa la información que el tablero ya muestra hoy. No se pierde nada: lo que no aparece en la imagen se integra en estas tarjetas o se queda debajo.

## Nueva disposición

```text
[ Selector de proyecto (arriba a la derecha) ]
+-----------+-------------------------+---------------------------------------------+
| Fecha de  | Total proyectos         | Proyecto elegido: nombre                    |
| hoy       |  N    N    N    N        |  cliente · código                           |
| domingo   | Activos Final. Retras.  |  [En ejecución][Retrasado][Finalizado]...   |
| 25        | (clic = filtra)         |  chips de color por estado, con cantidad    |
| OCTUBRE   |                         +---------------------------------------------+
|           |                         | Total partidas | Pendientes | Prioridad alta| Días restantes |
+-----------+------+------------------+------------+-------------------------------+
| Progreso         | Línea de tiempo             | Presupuesto                      |
| medidor semicirc.| inicio ---- barra ---- fin  | anillo % gastado                 |
| avance físico %  | avance real vs programado   | Presupuesto total / Costo real   |
| + desviación     | escala 0-100 %, corte       | CD y GG con semáforo             |
+------------------+-----------------------------+----------------------------------+
```

Debajo, sin cambios de contenido (solo con el mismo estilo de tarjeta):
- Control presupuestal (presupuesto, CD/GG ejecutados, utilidad real) — solo para quienes ven montos.
- Resumen financiero y solicitudes de desbloqueo.
- Partidas y su límite de compra, Curva S y Cartera de proyectos.

## Qué se fusiona
- Las tarjetas de estado actuales pasan a la tarjeta «Total proyectos» y siguen filtrando al hacer clic.
- «Partidas y prioridad» pasa a la fila de cuatro mini tarjetas (con «Días restantes» tomado del plazo).
- «Avance general» + «Control de cronograma oficial» se reparten entre «Progreso» y «Línea de tiempo».
- El costo ejecutado y el semáforo CD/GG van dentro de «Presupuesto».
- Ingenieros (sin montos) ven Progreso y Línea de tiempo a lo ancho, sin la tarjeta de Presupuesto, como hoy.
- «Todos los proyectos» muestra la cartera completa en las mismas tarjetas.

## Detalles técnicos
- Solo cambios de pantalla en `src/routes/_authenticated/dashboard-proyectos.tsx` (+ pequeños componentes locales); mismos datos y cálculos (useCostoObras, avance programado, situaciones), sin tocar base de datos.
- Colores de las tarjetas con tokens nuevos en `src/styles.css` derivados del tema (degradados suaves), sin colores fijos; funcionan con los cinco temas.
- Medidor semicircular y anillo en SVG; exportaciones PDF/Excel sin cambios.
- Verificación con captura en pantalla, con una obra elegida y con «Todos».
