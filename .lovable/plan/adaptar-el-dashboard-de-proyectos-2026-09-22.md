# Adaptar el Dashboard de Proyectos

## Objetivo
Convertir el dashboard actual en un tablero ejecutivo más visual y compacto, manteniendo los datos reales, exportaciones y la Curva S existentes.

## Cambios
- Reorganizar la cabecera con selector de obra y acciones de exportación claramente separadas.
- Crear una vista principal tipo mosaico para la obra seleccionada con:
  - medidor de avance físico;
  - situación y prioridad;
  - fechas y días restantes;
  - presupuesto, costo real y saldo disponible;
  - comparación entre avance programado, avance real y presupuesto gastado.
- Mantener la Curva S integrada debajo del resumen ejecutivo.
- Convertir la lista de obras en tarjetas comparables y seleccionables.
- Ajustar la presentación para escritorio, tablet y celular sin cambiar cálculos ni permisos.

## Detalles técnicos
- Reutilizar los datos actuales de proyectos, partidas, costos y tareos.
- Construir medidores con SVG y estilos existentes, sin añadir nuevas dependencias.
- Usar únicamente colores semánticos del sistema actual.
- Mantener las exportaciones a PDF y Excel con su comportamiento actual.
- Verificar visualmente la pantalla en escritorio y móvil.
