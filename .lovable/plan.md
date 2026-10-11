# Banco APU: pantalla dividida con botones «+ Aumentar» guiados

Hoy la pestaña Partidas del Banco APU muestra una lista y la receta se abre en una ventana aparte. Se convierte en pantalla dividida y se rediseñan los dos tipos de «+ Aumentar».

## Pantalla dividida (pestaña Partidas)
- Izquierda (~40%): árbol de partidas agrupado por especialidad, con buscador y botón «+ Aumentar».
- Derecha (~60%): APU de la partida elegida, con cuatro grupos plegables (MANO DE OBRA, MATERIALES, EQUIPOS Y HERRAMIENTAS, SUBCONTRATOS), subtotales y costo total del APU.
- La partida seleccionada se recuerda al recargar. Las otras pestañas (Materiales, Mano de obra, etc.) no cambian.

## 1. «+ Aumentar» del panel izquierdo (nueva partida)
Ventana con:
- Especialidad (lista desplegable desde las especialidades configuradas).
- Código jerárquico: al elegir especialidad se sugiere el siguiente correlativo de esa rama (último 04.01.02 → sugiere 04.01.03); editable. Si la rama no tiene partidas, sugiere `NN.01.01` según el número de la especialidad.
- Descripción (obligatoria).
- Unidad (lista desde el catálogo de unidades: und, m, m2, m3, kg, glb…).
- Rendimiento diario (numérico, por defecto 1).
Al guardar: se registra, se limpia y cierra la ventana, y la nueva partida queda seleccionada en el árbol con el APU vacío listo para armar.

## 2. «+» en cada grupo del panel derecho (insumos del APU)
- Botón «+» al costado de cada subtítulo del grupo.
- Ventana con buscador predictivo que filtra en tiempo real solo el banco de ese grupo (p. ej. «+» de Materiales busca solo materiales activos), mostrando Código · Descripción · Marca (si aplica).
- Tras elegir el insumo se pide Cantidad / Cuadrilla (obligatoria, mayor que 0).
- «Agregar» guarda la línea en la receta enlazada a la partida y el panel se refresca al momento con el nuevo parcial y el costo acumulado (calculado con el costo unitario maestro del insumo).
- Si el insumo ya está en la receta, se avisa y se ofrece sumar la cantidad en lugar de duplicar.
- Se mantiene la edición de cantidad en línea y «Quitar» por fila; las subpartidas siguen disponibles como hoy.

## Detalles técnicos
- Archivo principal: `src/components/BancoApu.tsx` (extraer `ArbolPartidas`, `PanelApuMaestro`, `DialogoNuevaPartida`, `DialogoAgregarInsumo`). Reutiliza `VentanaFlotante`, `BotonIcono`, `useTabla`, `useEspecialidadesPartida` y el cálculo existente de costo de `RecetaApu`.
- Sugerencia de código: función pura `siguienteCodigoJerarquico(codigos, prefijo)` en `src/lib/banco-apu.ts`, con prueba unitaria (incremento del último nivel, relleno a 2 dígitos).
- Buscador: Command/Combobox de shadcn sobre la tabla del grupo (`materiales`, `mano_obra`, `equipos_herramientas`, `subcontratos`), filtrando `activo`.
- Inserción en `partida_detalle` con la FK correspondiente; invalidación de las consultas de la receta. Sin cambios de base de datos.
- Persistencia de selección en `localStorage` (`banco-apu:partida`). Verificación con Playwright: crear partida, ver código sugerido, agregar un material y confirmar el total.
