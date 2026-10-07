# Tipo de cambio único por día para todo el ERP

## Objetivo
Una sola consulta diaria a Decolecta. El valor se guarda y todo el ERP (Facturación Electrónica, Cotizaciones, Preliquidaciones, Tesorería) lo reutiliza sin volver a consultar hasta el día siguiente (hora Lima).

## Cambios
1. **Fuente única**: un solo punto de acceso "tipo de cambio de hoy" que primero lee el valor guardado del día; solo si no existe, consulta Decolecta una vez y lo guarda. Todas las pantallas usan ese punto, nunca llaman a Decolecta por su cuenta.
2. **Evitar consultas duplicadas**: si dos usuarios abren pantallas a la vez, solo una consulta llega a Decolecta (bloqueo por fecha en el servidor); en el navegador el valor se mantiene en memoria todo el día.
3. **Facturación Electrónica** como origen: la consulta del día se dispara al abrir este módulo (y en el panel API Decolecta se muestra "TC de hoy: 3.xxx · consultado a las hh:mm"). Si otra pantalla se abre antes, usa el mismo mecanismo pero sigue siendo una única consulta diaria.
4. **Preliquidaciones**: el campo T. cambio (moneda USD) se precarga con el TC del día al crear; en preliquidaciones existentes aparece el botón "SUNAT 3.xxx" para aplicarlo, igual que en Cotizaciones. Se elimina el valor fijo 3.75.
5. **Tesorería y Cotizaciones**: pasan a usar la misma fuente (sin llamada propia).
6. Si Decolecta falla, se usa el último TC guardado con aviso; no se reintenta en bucle (máximo un reintento manual).

## Detalle técnico
- `src/lib/tipo-cambio.ts`: hook `useTipoCambioHoy()` (React Query, key `["tc", fechaLima]`, staleTime hasta medianoche Lima) llamando a `consultarTipoCambio`.
- `consultarTipoCambio` ya cachea en `tipo_cambio_diario`; añadir guarda contra concurrencia (insert previo con estado "consultando" o `pg_advisory_xact_lock` vía RPC) y registrar hora de consulta.
- Reemplazar `useTipoCambioActual` (cotizaciones.ts), lógica en tesoreria.tsx y HojaComprobante.tsx por el hook; integrar en `Preliquidaciones.tsx`.
- Regla en AGENTS.md: el TC diario solo se obtiene vía la fuente única.
