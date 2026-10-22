# Descarga de XML, PDF y CDR de compras desde SUNAT

## Qué sabemos
- La descarga ya usa tus credenciales del SIRE (Client ID, Secret, Usuario y Clave SOL); no hace falta nada más de tu parte.
- El único intento guardado quedó como «No disponible: el servicio de consulta no respondió»: la conexión con SUNAT se cortó antes de recibir respuesta. No fue rechazo de credenciales. La causa exacta (dirección del servicio, formato de la consulta o bloqueo de SUNAT) aún no está confirmada.

## Pasos
1. **Diagnóstico con una factura real**: lanzar la descarga de un comprobante de septiembre 2026 y registrar la respuesta completa de SUNAT (permiso, estado y mensaje) en cada paso: permiso con el alcance de consulta de comprobantes, XML, PDF y CDR.
2. **Corregir la conexión según el manual vigente de SUNAT**: ajustar la dirección del servicio, el formato del identificador del comprobante (RUC-tipo-serie-número) y el tipo de archivo solicitado. Si el alcance de consulta no se acepta, probar con el alcance del SIRE.
3. **Mensajes claros por comprobante**: distinguir «SUNAT no tiene el archivo», «credenciales sin permiso de consulta» y «SUNAT no respondió, reintentar», en vez del aviso genérico actual.
4. **Reintento**: botón para volver a descargar los que quedaron «No disponible», respetando lotes de 10.
5. Verificar que el XML se guarda, se leen sus ítems y que el PDF/CDR se pueden abrir desde la lista de Compras.

## Detalles técnicos
- `src/lib/sire-cpe.server.ts`: registrar la causa del error de `fetch` (hoy se oculta), revisar URL `api-cpe.sunat.gob.pe/v1/contribuyente/consultacpe/comprobantes/{ruc}-{tipo}-{serie}-{numero}-2/{01|02|03}` y la respuesta (archivo directo o JSON en base64).
- `descargarComprobantesSire`: devolver el motivo detallado por comprobante; sin cambios en permisos ni en la tabla.
- Si SUNAT bloquea las llamadas desde el servidor de la app, lo informaré con la evidencia y la alternativa (subir el XML del proveedor).
