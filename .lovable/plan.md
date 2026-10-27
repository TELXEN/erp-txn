# Codificación T+EE+SS+NNN en todos los rubros

## Situación encontrada
- Hoy solo los materiales usan la subfamilia en el código; mano de obra, equipos, herramientas y EPP llevan siempre «00» en esas dos cifras.
- Instrumentista (05 Instrumentación) se mantiene como **10500001**, sin cambios.

## Cambios
1. **Patrón único para todos los rubros:**
   - Cifra 1: rubro (1 MO, 2 MAT, 3 Equipos, 4 Herramientas, 5 Subcontratos, 6 EPP).
   - Cifras 2–3: especialidad (01 Arquitectura … 05 Instrumentación, 06 Eléctrica…).
   - Cifras 4–5: subfamilia, ahora en **todos** los rubros; sin subfamilia va «00».
   - Cifras 6–8: correlativo de 3 cifras, sin huecos, por rubro+especialidad+subfamilia.
2. **Recodificación automática** de fichas existentes con el nuevo patrón (las que no tienen subfamilia conservan su código actual).
3. **Pantalla de Codificación de insumos:** formato `TEESSNNN` en todos los rubros.

## Detalle técnico
- Migración: `siguiente_codigo_insumo_modular` usa la subfamilia para cualquier tipo (no solo MAT); el trigger de renumeración por prefijo de 5 dígitos ya cierra huecos.
- Ajustar `CodificacionInsumos.tsx` y la prueba de `digito-insumo`; actualizar la memoria de código de insumos.
