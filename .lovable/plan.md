# Retomar una cotización de un año anterior

## Situación
Una cotización hecha en 2026 (p. ej. TXN26-C005) queda en espera. En 2027 el cliente la retoma. Hoy solo se puede crear una nueva revisión (Rev. 01), que mantiene el código del año 2026, y eso confunde la numeración del año nuevo.

## Propuesta: "Retomar en el año actual"
1. En la lista de cotizaciones, las que son de un año anterior y no están aprobadas muestran la acción **"Retomar en 2027"** en la barra derecha.
2. Al pulsarla se abre una ventana corta con:
   - El nuevo código que va a recibir (p. ej. TXN27-C002, el siguiente del año).
   - Opción **"Actualizar precios al Banco APU actual"** (sí/no). Si dice no, se copian los precios tal como estaban.
   - Fecha nueva (hoy) y validez reiniciada.
3. Al confirmar:
   - Se crea una cotización nueva con el código del año actual, Rev. 00, copiando todo: partidas, APU, gastos generales, condiciones y cliente.
   - La nueva muestra en sus datos: **"Retoma de TXN26-C005 Rev. 02"**, también en la vista previa y en el PDF.
   - La cotización original queda congelada con el estado **"Retomada → TXN27-C002"**: no se borra y no se puede editar, así el historial de 2026 se conserva.
4. Desde cualquiera de las dos se puede abrir la otra con un clic.

## Lo que no cambia
- Las revisiones normales (Rev. 01, 02…) dentro del mismo año siguen igual.
- La numeración sale del mismo contador de Codificación de documentos. No hace falta cambiarlo a mano, salvo el cambio de año que ya se hace cada enero.
- Si el cliente aprueba la cotización nueva, se convierte en obra como siempre.

## Detalles técnicos
- Migración aditiva: `cotizaciones.retoma_de_id uuid null` (referencia a cotizaciones) y estado `Retomada`. Sin borrar columnas.
- Código nuevo solo a través del servidor (`reservarCodigo` tipo cotizacion). Copia con la misma rutina que clona revisiones (items, apu_detalle, gastos_generales).
- Al actualizar precios, se usa el flujo actual de inserción desde el banco (filaRecursoCotizacion, precios maestros en PEN).
- Prueba unitaria: solo pueden retomarse las cotizaciones de un año anterior que no estén aprobadas. Verificación en Playwright con una cotización de prueba, que se borra al terminar. Las cotizaciones reales no se tocan.
- Regla en AGENTS.md y memoria de revisiones.
