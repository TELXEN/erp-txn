# Roadmap
- [x] Catálogo dentro de Inventario: Materiales, Equipos, Herramientas y EPPs; stock conservado, clasificación guardada/restaurada en pantalla, dos pruebas y compilación OK.
- [x] Cambiar el icono de la tarjeta «Presupuesto» por un fajo de billetes y aclarar el color del icono de «Progreso» (Dashboard de Proyectos).
- [x] Suavizar el contraste de la tarjeta «Línea de tiempo» y escribir «S/.» en los importes de la tarjeta «Presupuesto» (Dashboard de Proyectos).
- [x] Mover Curva S del Dashboard de Proyectos a una pestaña junto a Gantt; selector compartido, obra real y cartera verificados, 32 pruebas pasan y compilación OK.
- [x] Boleta de liquidación con formato CTS: vista e impresión de Eder verificadas con total S/ 6,988.03, sin modificar pagos ni personal; siete pruebas pasan.
- [x] Boleta de gratificación con formato CTS: vista e impresión de Eder verificadas, siete pruebas pasan; registros antiguos muestran su base guardada y advierten si no tienen desglose histórico.
- [x] Agrupar las boletas CTS del mismo trabajador: Eder aparece una sola vez con ambas boletas; apertura independiente y recarga verificadas, seis pruebas pasan.
- [x] Regularizar CTS: ambos periodos creados y abiertos para Eder Garay; cinco pruebas pasan, registros existentes protegidos.
- [x] Boletas CTS con formato de Boletas de Pago; vista mayo/noviembre y PDF de dos páginas completas verificados.
- [x] Añadir documento de referencia al proyecto (Orden de Compra, Orden de Servicio o Contrato y número opcional) y cargarlo en la preliquidación; cinco pruebas pasan, guardado y vista previa verificados, datos de prueba retirados.
- [x] Separadores de acciones, barra derecha en Caja chica, controles GG e IGV editable (18.00/0.00) y quitar Codificación de insumos de Configuración. Pantallas y guardado de IGV verificados; Caja chica no tiene filas para probar rendiciones.
- [x] Corregir saltos prematuros en la cotización vertical: grupos y cierre en una hoja; pantalla y PDF verificados sin modificar datos.
- [x] Corregir movimiento entre grupos: partida 2.1 → 1.3; 14 pruebas pasan y partida real movida al grupo anterior, persistencia confirmada al recargar.
- [x] Cotizaciones: iconos Subir/Bajar por nivel con contenido y numeración; 11 pruebas pasan y columna verificada. No se movieron datos reales; hoja consultada vacía.
- [x] Insertar partida: opciones Banco de partidas / Crear nueva; ventana verificada sin alterar datos reales. Inserción desde banco no comprobada por catálogo vacío.
- [x] Plantillas: iconos de acciones en columna vertical a la derecha (hoja limpia, ventana única para alta/edición/copia) y verificación en pantalla.
- [x] Igualar el formato del Dossier APU al Análisis de Precios Unitarios; pantalla y descarga PDF verificadas sin modificar cotizaciones.
- [x] Dejar el porcentaje de herramientas manuales en 5% por defecto (Márgenes APU, partidas nuevas y cálculo); verificado en pantalla.
- [x] Reorganizar especialidades por disciplinas 01–09 y 99 conservando vínculos; hoja e iconos como Insumos y verificación.
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
- [x] Vincular insumos seleccionados por ID y código del catálogo; conservar código generado de los nuevos y verificar en cotizaciones.
- [x] Encabezados del APU (código, descripción, unidad, recurso, cantidad, precio, total) en mayúsculas, en Banco APU y cotizaciones.
- [x] Unidades de las partidas y recursos del Banco APU elegidas de la tabla de unidades (unidades_medida), no texto libre; catálogo completado con H-H y H-M y «glb» unificado a GLB.
- [x] En cotizaciones, la lista desplegable de unidades se justifica a la izquierda (celda UNIDAD en modo edición y ventana de nueva partida).
- [x] En el APU de cotizaciones el pie del panel derecho solo muestra «Análisis de costo unitario» y «Especificaciones técnicas» (sin Metrado ni Consolidado de partida); el panel queda con tamaño fijo y sus pestañas siempre visibles.
- [x] Encabezados de la grilla APU sin traslape: títulos a 10 px, cifras a 11 px y anchos de columna rebalanceados, igual en Banco APU y cotizaciones.
- [x] Quitar la columna Código de la lista de partidas (ventana izquierda del APU); el buscador sigue encontrando por código.
- [x] Cotizaciones: «Agregar categoría» abre selector vinculado al catálogo maestro (categorias_partida), con código y marca de las ya usadas
- [x] Quitar Subpartidas del APU: la receta del banco solo usa mano de obra, materiales, equipos/herramientas y subcontratos.

## Porcentajes
- [x] Alinear GG, utilidad e IGV en la misma vertical y evitar que las etiquetas se traslapen con los campos.
- [x] Ajustar los porcentajes a dos decimales: guardado (trigger en cotizaciones, proyectos y plantillas), hoja, vista previa A4, PDF, Excel y datos de registro de obra; TXN26-C006 y TXN26-C008 corregidos.
- [x] Sincronizar el % de gastos generales al cerrar la ventana (leía el costo directo en 0 y no guardaba; TXN26-C008 pasó de 0 % a 21.17 %).

## Mejora del front end
- [x] Base: cabecera, pestañas, tarjetas, filas de carga, vacío con icono, franja entre filas y foco visible; Configuración adoptada.
- [x] Pestañas uniformes en Tesorería, SIRE y Nómina.
- [x] Cotizaciones: tarjetas de resumen y pestañas uniformes (Caja chica ya cumplía el formato).
- [x] Dashboard y Personal: pestañas uniformes.
- [x] Revisión de contraste en los cinco temas (opcional, a pedido).
- [x] Recordar filtros/vista/grupos en Partidas y Avance físico
- [x] Filtros compactos en Proyectos, Partidas y Avance físico
- [x] Filtros en lupa y tarjetas uniformes con guía
- [x] Lupa de filtros en la barra vertical derecha (integrada a la barra de iconos) en todo el ERP
- [x] Iconos del menú lateral con silueta propia: auto para Vehículos, recibo con código de barras (componente propio) para Facturación Electrónica y carpeta corporativa para Registro de Ventas; verificado en pantalla.

- Diagrama Gantt con dependencias y ruta crítica (Operaciones) — hecho
- [x] Gantt: barras horizontales/verticales en obras de más de un mes; desplazamiento horizontal y último proyecto al volver/recargar verificados. La obra actual tiene solo una partida, sin recorrido vertical necesario.
- [x] Gantt: fila de letras del día (L M M J V S D) sobre los números, domingo en rojo; verificado en vista por días.
- [x] Suspensión de 4ta: fecha obligatoria, año de vigencia automático del año actual (no se escribe a mano), regla de dos días y aviso de renovación anual; 7 pruebas pasan y se verificó en pantalla.

- [x] Quitar del Dashboard de Proyectos las tarjetas «Resumen financiero», «Aprobaciones» y «Partidas de la obra y su límite de compra»; obra seleccionada y «Todos los proyectos» verificados en pantalla, compilación OK.
- [x] Quitar el panel «Cartera de proyectos» del Dashboard de Proyectos; contadores por estado quedan como solo lectura, pantalla y compilación verificadas.
- [x] Dashboard de Proyectos: fondo del icono de Presupuesto más claro (verde claro con billete en verde)
- [x] Costos Directos: quitar el desglose de costo directo y las pestañas; quedan las cinco tarjetas y Control por partida
- [x] Flujo de requerimientos: Generar Requerimiento (APU/TDR) → aprobación de Gerencia → Bandeja de Requerimientos (cotizaciones, comparativo, OC) → envío y recepción en obra; probado de punta a punta y datos de prueba retirados.
