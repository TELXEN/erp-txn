# Banco APU: barra vertical de iconos a la derecha

## Qué cambia
- En la pestaña Banco APU se agrega a la derecha (después del panel del APU) una columna vertical fija con los mismos iconos de Insumos: **Agregar** (+), **Editar** (lápiz), **Copiar** (copiar), **Eliminar** (tacho rojo), con tooltip.
- Los iconos actúan sobre el **último elemento seleccionado**:
  - **Partida** (clic en una fila de la lista izquierda): Agregar abre «Nueva partida»; Editar abre la partida; Copiar crea una partida nueva con su receta APU copiada (código nuevo, descripción con « (copia)»); Eliminar pide confirmación y aplica la regla actual (desactiva si está en uso).
  - **Insumo del APU** (clic en una fila de la receta, a la derecha): Agregar abre el selector de insumo de ese grupo y lo agrega debajo; Editar enfoca la cantidad para cambiarla; Copiar duplica la fila debajo; Eliminar la quita. La fila automática de Herramientas manuales no se puede editar, copiar ni eliminar.
- La fila seleccionada se resalta; el tooltip de cada icono dice sobre qué actúa («Editar partida» / «Editar insumo del APU»). Sin selección, Editar/Copiar/Eliminar quedan desactivados.
- Se quitan los botones de editar/quitar de cada fila de la lista de partidas (quedan en la barra). El clic derecho del APU se mantiene.

## Detalles técnicos
- `src/components/BancoApu.tsx`: `SplitPartidas` guarda `foco: {tipo:"partida"} | {tipo:"apu", fila, grupo}`; grid 12 col + columna `w-10` sticky con `BotonIcono`.
- `ListaBanco` expone `abrir`/`quitar` vía props/ref controlados por la barra; `PanelApuMaestro` recibe `onSeleccionFila` y reutiliza `accionMenu` ("debajo", "eliminar") y `DialogoAgregarInsumo`.
- Copiar partida: insertar en `partidas_apu` y duplicar sus filas de `partida_detalle` con `orden`. Sin cambios de base de datos.
- Verificación con Playwright de cada icono en ambos modos.
