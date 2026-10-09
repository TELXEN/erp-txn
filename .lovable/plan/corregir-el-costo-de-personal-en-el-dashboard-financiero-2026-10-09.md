# Corregir el costo de personal en el Dashboard Financiero

## Problema encontrado
Hoy el panel suma el personal dos veces y desde la fuente equivocada:
- Toma el **tareo** (días × jornal) como costo de mano de obra directa y staff.
- Además suma los **recibos por honorarios** del proyecto.
- Un locador con tareo y recibo aparece **duplicado** (tareo + recibo).
- Las **boletas de nómina** no se suman en ninguna parte.
- Los recibos con varios proyectos (sin proyecto asignado) se pierden.

## Nueva regla
1. **El tareo es único por trabajador** y solo sirve para **repartir** el costo entre proyectos (días de cada proyecto ÷ días totales del mes). Ya no es costo por sí mismo.
2. **El costo real de personal sale solo de lo pagado/emitido**:
   - Boletas de nómina: total de ingresos + EsSalud del trabajador.
   - Recibos por honorarios: monto bruto del recibo del trabajador.
3. Cada boleta/recibo se reparte a los proyectos según el tareo de **ese trabajador en ese mes**. Si el recibo tiene un solo proyecto y no hay tareo, va completo a ese proyecto. Sin tareo ni proyecto: «Oficina Central / sin asignar» (visible en el consolidado global).
4. Clasificación por cargo del trabajador:
   - **Directo** → Costo directo (Mano de obra directa / Honorarios).
   - **Indirecto** → Gastos generales (Staff técnico).
5. Gastos directos y gastos generales de compras siguen igual.

## Qué verás
- «Mano de obra», «Honorarios» y «GG + Staff» ya no se duplican.
- Una nota pequeña bajo el panel: «Personal valorizado desde boletas y recibos, repartido por tareo».
- Si hay tareo de un mes sin boleta/recibo generado, aviso ámbar: «X trabajadores con tareo sin boleta en [mes]» (no se suma hasta generarla).
- El Excel/PDF del dashboard usa los mismos montos.

## Detalles técnicos
- `dashboard.tsx`: cargar `boletas` (+ `planillas` para mes/año) y `recibos_honorarios` con `trabajador_id, proyecto_id, mes, anio, monto_bruto`.
- Nueva función pura `costoPersonalPorProyecto()` en `src/lib/pagos-rrhh.ts`: agrupa tareos por (trabajador, año-mes, proyecto) con días ponderados, y prorratea cada documento; devuelve `{proyecto → {mod, honorarios, staff}}` + sin asignar + pendientes.
- Reemplaza el bloque actual de tareo (líneas 120–135). Sin cambios de base de datos.
- Verificación: compilación y revisión en vista previa con octubre 2026 (S/ 800 de Eder Garay pasan a valorizarse por su boleta/recibo).
