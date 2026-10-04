# SIRE: traer el detalle real de compras y ventas desde SUNAT

## Objetivo

Que «Sincronizar Propuesta con SUNAT» descargue de verdad la propuesta del RVIE (ventas) y del RCE (compras) del período elegido y muestre cada comprobante tal como lo tiene SUNAT, en lugar de la simulación actual.

## Qué necesitas tener (una sola vez)

En SUNAT Operaciones en Línea (Clave SOL) → «Credenciales de API SUNAT» se generan el **Client ID** y el **Client Secret** del SIRE. Con eso, más el RUC, el Usuario SOL y la Clave SOL, se completa la pestaña **Configuración API SOL** que ya existe.

## Qué cambia en la pantalla

1. **Validar Conexión**: ahora pide un permiso real a SUNAT y dice si las credenciales funcionan o el motivo del rechazo.
2. **Paso 1 – Sincronizar**: SUNAT prepara la propuesta (puede tardar unos segundos); la barra de progreso muestra «Solicitando», «SUNAT procesando», «Descargando». Si SUNAT aún no la tiene lista, se avisa y se puede reintentar.
3. **Paso 2 – Detalle SUNAT**: la tabla muestra todos los campos que entrega SUNAT por comprobante: fecha de emisión y vencimiento, tipo, serie, número, RUC y razón social, base gravada, IGV, no gravado/exonerado, ISC, otros tributos, total, moneda y tipo de cambio. Clic en una fila abre un panel con el detalle completo.
4. La conciliación con el ERP (verde, naranja, rojo) se mantiene, ahora comparando contra los datos reales.
5. **Paso 3**: totales calculados con la propuesta real. «Enviar Aceptación a SUNAT» acepta la propuesta de verdad; el TXT usa el RUC real.
6. Si no hay credenciales guardadas, el botón de sincronizar indica que primero se complete la configuración (se quita la simulación).

## Detalles técnicos

- Server functions autenticadas (solo administrador/gerente) en `src/lib/sire.functions.ts`; las credenciales se leen con el cliente privilegiado dentro del handler, nunca llegan al navegador.
- Token: `POST https://api-seguridad.sunat.gob.pe/v1/clientessol/{client_id}/oauth2/token/` (grant_type=password, scope `https://api-sire.sunat.gob.pe`, username = RUC+UsuarioSOL).
- Propuesta: endpoints SIRE `api-sire.sunat.gob.pe/v1/contribuyente/migeigv/libros/rvie|rce/propuesta/web/propuesta/{periodo}/exportapropuesta` → ticket; consulta de estado del ticket y descarga del archivo (ZIP con TXT separado por «|»). Se descomprime en el servidor con una librería compatible (fflate) y se convierte a filas.
- Polling del ticket hasta ~60 s con avisos de estado; si no termina, se guarda el ticket en `sire_periodos` para reintentar luego.
- `sire_periodos`: se agregan columnas `ticket` y `origen` ('sunat'); los ítems guardan todos los campos del TXT.
- Aceptación: endpoint de aceptar propuesta del libro correspondiente.
- Errores de SUNAT se traducen a mensajes claros (credenciales inválidas, período sin propuesta, servicio caído).
- Riesgo: los endpoints y nombres de campos del SIRE cambian a veces; se verificará contra el manual vigente de SUNAT y se probará con tus credenciales reales al terminar.
