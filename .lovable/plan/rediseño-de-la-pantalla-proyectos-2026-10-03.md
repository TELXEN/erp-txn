# Rediseño de la pantalla Proyectos

Solo cambia la pantalla Proyectos. No hay cambios en la base de datos. La vista Kanban y la edición en línea siguen funcionando.

## 1. Formulario «Nuevo proyecto»
- Tres tarjetas en cuadrícula de 3 columnas (en móvil, 1 columna):
  - **Información General**: Código de la obra (bloqueado, muestra el próximo código automático), Cliente, Nombre de la obra *, Ubicación, Responsable.
  - **Cronograma y Estado**: un solo selector **«Estado del Proyecto»** que reemplaza a «Estado» y «Status». Usa la lista configurada en Parámetros del proyecto (No iniciado, En ejecución, Pausado, Finalizado…). Fechas: Fecha de Inicio, Fecha de Fin Estimada y Fecha de Corte, más el Avance programado (%) junto a la fecha de corte.
  - **Finanzas (%)**: % Gastos Generales y % Utilidad Prevista lado a lado, y debajo un recuadro informativo suave con la fórmula de la Oferta.
- Etiquetas oscuras y legibles; campos obligatorios con asterisco rojo.
- Botón **Registrar** abajo a la derecha, con el color del menú.

## 2. «Listado de proyectos»
- Barra superior: título a la izquierda y buscador «Buscar proyecto...» con lupa a la derecha.
- Columnas: Código (negrita), Cliente, Nombre de la Obra (solo el título), Responsable, Plazo (fechas + etiqueta de color «Programado 40.00%»), Presupuesto y Costo Ejecutado (a la derecha, formato S/ 38,863.62), Acciones.
- Se mantiene una columna Estado pequeña con su pastilla de color.
- Acciones: icono de **ojo** que abre un desglose financiero (Costo directo, GG %, Utilidad %, Oferta), más lápiz y tacho.
- Filas con resaltado al pasar el cursor y bordes limpios.

## Detalles técnicos
- Archivo: `src/routes/_authenticated/proyectos.tsx`.
- El estado unificado se guarda en `situacion`; el campo `estado` se calcula al guardar (`Finalizado` si la situación es «Finalizado», si no `En Ejecucion`) para que los módulos que lo usan sigan funcionando. Lo mismo al editar.
- El código sigue generándose con `generarCodigoProyecto` al registrar; el campo deja de ser editable al crear, pero sí se puede editar en la edición en línea.
- El desglose usa el `ofertaProyecto` existente en un pequeño menú desplegable (Popover).
- Se reutilizan Panel, Campo, Boton, Buscador e InsigniaSituacion; colores con los tokens del tema.
