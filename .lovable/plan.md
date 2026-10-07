# Comisiones AFP de Decolecta en Nómina

Hoy Nómina calcula los aportes AFP con tasas fijas escritas en el código (fondo 10%, seguro 1.37%, comisión por AFP). Se reemplazan por las comisiones oficiales del mes obtenidas de Decolecta.

## Qué verá el usuario
- En Nómina, un cuadro "Comisiones AFP del mes" con Integra, Prima, Profuturo y Habitat: aporte al fondo, prima de seguro, comisión sobre flujo y tope de remuneración asegurable.
- Indicador de origen: "Decolecta – mes/año" o "Último registro guardado" si la consulta falla.
- Botón "Actualizar desde Decolecta" (solo Gerente/Administrador); los demás roles solo ven las tasas.
- Las boletas y la planilla usan esas tasas; la prima de seguro respeta el tope.

## Consumo del token
- Una sola consulta por mes: se guarda en el sistema y todo el ERP reutiliza ese valor (mismo criterio que el tipo de cambio diario).
- Si Decolecta no responde, se usa el último mes guardado y luego las tasas actuales como respaldo.

## Detalles técnicos
- Tabla `afp_comisiones_mensuales` (periodo YYYY-MM, afp, aporte_fondo, prima_seguro, comision_flujo, tope_remuneracion, origen, consultado_en); unique (periodo, afp); RLS lectura para autenticados, escritura solo vía server fn.
- Server fn autenticada `obtenerComisionesAfp(periodo)` en `src/lib/decolecta.functions.ts`: lee caché; si falta, llama `GET /v1/afp/comisiones` con la clave guardada, normaliza nombres de AFP y guarda. Forzar actualización solo para Gerente/Administrador.
- Eliminar `consultarAfpSbs` (endpoint inexistente).
- Hook `useComisionesAfp(periodo)` en `src/lib/afp.ts`; `nomina.tsx` sustituye `AFP_FONDO/AFP_SEGURO/AFP_COMISION` por estos datos, conservando las constantes como respaldo.
- Primero se verifica la forma real de la respuesta del endpoint con una llamada de prueba antes de mapear campos.
- Registrar regla en AGENTS.md.
