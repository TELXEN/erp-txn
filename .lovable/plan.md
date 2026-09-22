# Desglose de adicionales en el Dashboard de Proyectos

## Objetivo
Hacer visible el impacto de las partidas adicionales en el proyecto seleccionado y en la cartera, sin cambiar los cálculos ni permisos existentes.

## Cambios
- Separar el resumen financiero en Presupuesto Contractual, Adicionales de Obra y Presupuesto Vigente.
- Mostrar en Partidas y prioridad el total y el desglose entre partidas contractuales y adicionales.
- Añadir a la Curva S el contexto del monto contractual, adicionales y presupuesto vigente.
- Actualizar cada tarjeta de la cartera para distinguir presupuesto contractual, adicionales y vigente frente al costo real.
- Mantener el presupuesto vigente como base de los porcentajes de gasto y de las exportaciones actuales.
- Verificar la pantalla en escritorio y móvil con una obra que contenga partidas adicionales.

## Detalles técnicos
- Reutilizar `tipo_presupuesto`, el catálogo de tipos y `resumenPresupuesto` existentes.
- Clasificar según `es_contractual` del catálogo, con el comportamiento de respaldo actual.
- Usar los componentes y colores semánticos del diseño existente.
