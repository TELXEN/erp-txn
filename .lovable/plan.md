# SIRE: corregir «Enviar Aceptación a SUNAT»

## Qué pasa
Al pulsar «Enviar Aceptación a SUNAT» (Ventas RVIE, septiembre 2026) SUNAT responde «Unprocessable Entity – Se presentaron errores de validación». Hoy solo mostramos ese mensaje genérico; SUNAT envía además el detalle de cada error (código y motivo), que estamos descartando. La causa exacta aún no está confirmada.

## Pasos
1. **Ver el motivo real**: mostrar en el aviso todos los errores que devuelve SUNAT (código + texto) y guardarlos en el registro del servidor. Reproducir el envío para leer la causa.
2. **Corregir la solicitud según el manual SIRE vigente**: revisar la dirección y los datos que se envían al aceptar (RVIE y RCE por separado; hoy mandamos un cuerpo vacío `{}` y la misma ruta para ambos libros). Ajustar a lo que exige SUNAT (p. ej. sin cuerpo, parámetros del período, o el paso previo que pida el libro).
3. **Avisos claros antes de enviar**: si SUNAT rechaza por una condición del período (ya aceptado, propuesta vencida, período no habilitado, falta resincronizar), traducirlo a un mensaje en español con la acción a seguir.
4. **Al aceptar con éxito**: marcar el período como Aceptado con fecha y usuario (y guardar el ticket que devuelva SUNAT), como ya está previsto.
5. Probar el envío real con tus credenciales en Ventas y Compras de septiembre 2026.

## Detalles técnicos
- `src/lib/sire-sunat.server.ts`: en `api()` concatenar `j.errors[].cod/msg`; `aceptarPropuesta` ajustada por libro (método, cuerpo y ruta según manual; consultar ticket si responde con `numTicket`).
- `src/lib/sire.functions.ts` `aceptarSire`: devolver el detalle del error y el ticket.
- `sire.tsx` `enviar`: mostrar el detalle y persistir estado Aceptado solo con `ok`.
- Riesgo: aceptar en SUNAT es irreversible para el período; la prueba final la haremos solo cuando confirmes.
