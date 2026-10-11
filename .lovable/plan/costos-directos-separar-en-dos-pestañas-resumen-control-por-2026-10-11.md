# Costos Directos: separar en dos pestañas (Resumen / Control por partida)

## Objetivo
Evitar la saturación de la pantalla de Costos Directos mostrando el contenido en dos pestañas dentro de la misma pantalla:

- **Resumen de Costos Directos**: tarjetas de indicadores + desglose por rubro.
- **Control por partida**: tabla de partidas con compras, buscador y acciones.

## Cambios (solo `src/routes/_authenticated/gastos-directos.tsx`)

1. **Pestañas** bajo el encabezado, al estilo de otras pantallas del sistema (Nómina, Configuración):
   - Estado `pestana: "resumen" | "partidas"`, valor inicial y persistido en `localStorage` clave `gastos-directos:pestana` (mismo criterio de recordar la vista que ya se aplica con la obra).
   - Botones de pestaña con estado activo resaltado (borde/fondo primario suave).

2. **Contenido compartido (visible en ambas pestañas):**
   - Encabezado con botón «Exportar a Excel».
   - Panel de selección de Obra + Cliente.
   - Aviso de solicitudes de desbloqueo pendientes (si existen).

3. **Pestaña «Resumen»:**
   - Las 5 tarjetas de indicadores actuales (Partidas, Presupuesto CD, Costo real, Saldo, Consumo con barra semáforo).
   - El panel `DesgloseCd` (desglose por rubro: materiales, mano de obra, equipos, HT, subcontratos).

4. **Pestaña «Control por partida»:**
   - El Panel actual con buscador y tabla de partidas agrupadas por categoría, filas expandibles de compras, barras de consumo, botón «Compra», edición/eliminación.
   - Sin cambios funcionales: registro, edición, bloqueo por sobrecosto, autorizaciones de Gerencia y modal de compra quedan exactamente igual.

5. **Sin cambios** en la lógica de datos, guardado, exportación a Excel ni en el modal «Registrar/Editar compra».

## Verificación
- Compilación sin errores y typecheck.
- Playwright: ambas pestañas abren con los datos reales, la pestaña activa se recuerda al recargar, y el flujo de «Registrar compra» sigue funcionando desde la pestaña «Control por partida».
