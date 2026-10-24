# Módulo de Valorizaciones de obra

## Idea
Hoy el ERP tiene Avance Físico (un % actual por partida, sin historial) y Preliquidaciones (cobro global al cliente). Falta el paso intermedio típico de obra en Perú: la **valorización mensual**, que congela lo ejecutado en el período, lo valoriza con los precios contratados y da el monto a cobrar.

```text
Avance Físico  ->  Valorización N° (período)  ->  Preliquidación  ->  Factura
 (% en campo)      (metrado y S/ congelados)      (cobro acordado)    (SUNAT)
```

## Dónde ubicarlo
- Menú **Operaciones**, justo después de **Avance Físico**: «Valorizaciones».
- Acceso: Ingeniero (prepara, sin ver montos de GG/utilidad), Administración y Gerencia (revisan y aprueban).
- La página actual de Preliquidaciones sigue igual en Comercial (su dirección interna se mantiene).

## Qué verá el usuario
1. **Listado** por proyecto: Valorización N° 1, 2, 3… con período (del–al), monto del período, acumulado, % de avance y estado (Borrador, En revisión, Aprobada, Preliquidada). Tarjetas: contratado, valorizado acumulado, saldo por valorizar, % avance.
2. **Nueva valorización**: elige proyecto y período; se carga la hoja con cada partida (sin filas de agrupación):
   Contratado (metrado, P.U., parcial) | Anterior (metrado, S/, %) | Actual (metrado, S/, %) | Acumulado | Saldo.
   El metrado actual se sugiere desde el Avance Físico (avance actual − acumulado anterior) y es editable; no permite pasar el 100 %.
3. **Resumen al pie**: Costo directo del período, Gastos generales y Utilidad (% del proyecto), subtotal, amortización de adelanto y retención de garantía (opcionales, %), IGV 18 % y **Neto a cobrar**.
4. **Aprobar** congela la valorización (no editable, historial fijo) y habilita **«Generar preliquidación»**, que abre una preliquidación con cliente, proyecto, orden de compra y descripción «Valorización N° X – período» y el monto neto.
5. Vista previa A4 imprimible / PDF y Excel con el mismo formato.

## Preguntas abiertas (se pueden ajustar luego)
- Si usan adelanto directo y retención de garantía en sus contratos (se dejan opcionales por defecto).
- Si la valorización debe exigir la firma/visto del supervisor del cliente (campo de texto opcional).

## Detalles técnicos
- Migración: `valorizaciones` (proyecto_id, numero correlativo por proyecto, periodo_inicio/fin, estado, pct_gg, pct_utilidad, pct_adelanto, pct_retencion, montos totales, preliquidacion_id, aprobado_por/en) y `valorizacion_items` (valorizacion_id, partida_id, snapshot de descripción/unidad/metrado/P.U. contratado, metrado_actual). GRANTs, RLS con `is_admin_o_gerente` para aprobar y `es_personal` para leer; trigger que bloquea edición cuando estado = Aprobada y redondeo 2/4 decimales como en las demás tablas.
- Acumulado anterior = suma de valorizaciones aprobadas previas del proyecto (no se recalcula desde el % vivo), así el historial no cambia.
- `src/lib/valorizaciones.ts`: cálculo puro (parciales, acumulados, resumen, neto) con tests de las reglas (tope 100 %, IGV 18 %, deducciones).
- Ruta `src/routes/_authenticated/valorizaciones-obra.tsx` (la ruta `/valorizaciones` ya es Preliquidaciones), entrada en `AppShell.tsx` bajo Operaciones; UI con CabeceraModulo, TarjetaResumen, BarraIconosHoja con lupa y VentanaFlotante; colores desde `documento-tema.ts`.
- «Generar preliquidación» reutiliza el editor existente precargando cliente/proyecto/orden_compra/concepto y guarda el vínculo en la valorización.
