# Actualizar boletas generadas cuando cambia el tareo

## Objetivo
Si el tareo del mes se corrige después de generar las boletas de pago, las boletas que aún están pendientes (sin N° de recibo) se actualizan solas con los nuevos días laborados, días de viaje y horas extras.

## Cambios

1. **Recálculo automático al abrir Recibos por Honorarios** (`src/routes/_authenticated/honorarios.tsx`):
   - Al cargar la página, para cada boleta en estado «Pendiente de N°» (sin número de recibo y sin pago registrado) se recalcula el consolidado del tareo de su mes/año con `resumenTareoHonorario` (la misma función que usa el generador).
   - Si los valores difieren (días laborados, días de viaje, horas extras o costo unitario), la boleta se actualiza en la base de datos automáticamente.
   - Se muestra un aviso breve cuando alguna boleta se actualizó.

2. **Protección de boletas ya cerradas**:
   - Las boletas que ya tienen N° de recibo o pago registrado NO se tocan: ya representan un documento emitido ante SUNAT y solo se corrigen a mano.

3. **Indicador en la lista**: las boletas actualizadas desde tareo conservan la nota azul «datos del tareo» al abrirlas, y los valores siguen siendo editables manualmente antes de completar el N°.

## Detalles técnicos
- Reutiliza `resumenTareoHonorario` de `src/lib/honorarios.ts` y el jornal del trabajador (costo unitario), igual que `GenerarBoletasHonorarios.tsx`.
- La actualización es un `update` sobre `recibos_honorarios` solo cuando hay diferencias, para no escribir de más.
- No requiere migración de base de datos.

## Verificación
- Compilación sin errores.
- Prueba con Playwright: generar boleta de un mes, modificar el tareo de ese mes, reabrir Recibos por Honorarios y confirmar que la boleta refleja los nuevos valores.
