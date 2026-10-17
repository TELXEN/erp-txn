# Roadmap
- [x] Préstamos / Financiamiento en Tesorería: desembolsos, cuotas y saldos; bloqueo de pagos sin fondos y verificación.
- [x] Unificar fuente seleccionada en todo el ERP, PDF y Excel sin cambiar tamaños; verificar guardado y exportaciones.
- [x] Unificar acciones de nómina con honorarios, editar sobre la hoja y habilitar pagos solo después de validar las boletas.

- [x] Boleta de honorarios WYSIWYG: edición directa sobre la hoja, sin formulario lateral; datos siguen cargando desde tareo y registro de personal; impresión compacta en media hoja A4.
- [x] Ajuste final de boleta de honorarios: tabla horizontal legible; tareo, costo y retención bloqueados; cinco descuentos y concepto editables; empresa y pie reorganizados con fecha e importe en letras.
- [x] Corregir la impresión mostrada: ampliar el contenido útil y recuperar un tamaño de texto legible sin recortes.
- [x] Reorganizar los datos de empresa y trabajador; permitir editar prestador, mes y año por separado sobre la boleta.
- [x] Alinear AÑO en la misma columna vertical que BANCO y llevar RAZÓN SOCIAL al centro de la página.
- [x] Justificar RUC con la dirección y la razón social a la izquierda; centrar cuenta de depósito, banco y año.
- [x] Cabecera CONCEPTO y MONTO en Descuentos, con rótulos e importes alineados en la misma vertical que Remuneraciones.

## Auditoría ERP (etapas)
- [x] Decisiones Gerencia aplicadas: requerimientos a costo sin herramientas manuales; MO estimada con tareo sin boleta.
- [x] Etapa 2: índices en 69 relaciones + vínculo formal origen de requerimiento → partida de cotización.
- [x] Etapa 1: lectura completa en listados compartidos y Dashboard financiero (resto de pantallas con consultas propias: pendiente de revisión).
- [x] Etapa 3: trazabilidad Requerimiento → OC → Gasto directo → Pago (vínculos por ítem y estado en la OC).
- [x] Etapa 4: regla única de redondeo (triggers en compras, gastos generales y ventas).
- [x] Etapa 5: pruebas automáticas de cálculos (src/lib/calculos.test.ts, 9 casos).
- [x] Etapa 6: costo real de obra único en todos los paneles.
- [x] Etapa 7: integración de importaciones transaccional.

## Control de sobrecostos
- [x] Costo Directo Base (techo) en proyectos y bloqueo de partidas que lo superen.
- [x] Desglose CD por rubro (materiales, MO por tareo de obreros, equipos, herramientas manuales % MO con tope de compra, subcontratos).
- [x] Candado de compras por avance físico + tolerancia y solicitudes de desbloqueo.
- [x] Panel de Aprobaciones de Gerencia.
- [x] Orden del formulario de proyectos: Costo Directo Base arriba, porcentajes debajo.
- [x] Contador de solicitudes pendientes en el Dashboard de Proyectos.
- [x] Etiqueta «Bloqueada» en cada partida del Dashboard de Proyectos.
## Listado de proyectos

- [x] Iconos de acción: mismo tamaño y nitidez, ver/editar/eliminar distinguibles por color, separador antes de eliminar y columna con ancho suficiente.
- [x] Editar una compra registrada: icono de lápiz en cada fila, ventana «Editar compra» precargada y guardado sin duplicar el registro; el candado de sobrecosto también revisa la edición.


## Catálogos Maestros
- [x] Restaurar los accesos Empresa (Cuentas bancarias), Codificación, Parámetros de proyectos, Marcas y Recursos Humanos (Cargos del personal), además de Costos y Finanzas.
- [x] Cuentas bancarias trasladado a Configuración del Sistema › Datos de la empresa; Catálogos Maestros conserva Codificación, Parámetros de proyectos, Marcas, Costos y Finanzas y Recursos Humanos.

## Configuración del Sistema
- [x] Agrupar la pestaña «Datos de la empresa» en dos bloques con rótulo propio: Datos de la empresa y Cuentas bancarias.
- [x] Separar esos dos bloques en pestañas independientes: «Datos de la empresa» y «Cuentas bancarias», cada una con su propio contenido.

## Dashboard Financiero
- [x] Añadir dona de categorías de gastos generales a la derecha de la composición del costo real y compactar las barras de control.

## Banco APU
- [x] Encabezados del APU (código, descripción, unidad, recurso, cantidad, precio, total) en mayúsculas, en Banco APU y cotizaciones.
- [x] Unidades de las partidas y recursos del Banco APU elegidas de la tabla de unidades (unidades_medida), no texto libre; catálogo completado con H-H y H-M y «glb» unificado a GLB.
- [x] En cotizaciones, la lista desplegable de unidades se justifica a la izquierda (celda UNIDAD en modo edición y ventana de nueva partida).
- [x] En el APU de cotizaciones el pie del panel derecho solo muestra «Análisis de costo unitario» y «Especificaciones técnicas» (sin Metrado ni Consolidado de partida); el panel queda con tamaño fijo y sus pestañas siempre visibles.
- [x] Encabezados de la grilla APU sin traslape: títulos a 10 px, cifras a 11 px y anchos de columna rebalanceados, igual en Banco APU y cotizaciones.
- [x] Quitar la columna Código de la lista de partidas (ventana izquierda del APU); el buscador sigue encontrando por código.
- [x] Cotizaciones: «Agregar categoría» abre selector vinculado al catálogo maestro (categorias_partida), con código y marca de las ya usadas
