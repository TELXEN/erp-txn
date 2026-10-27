# Instrumentista 10600005 y codificación T+EE+SS+NNN

## Situación encontrada
- Instrumentista tiene la especialidad **05 Instrumentación**, por eso hoy recibe 10500001. Capataz, Operario, Oficial y Peón están en **06 Eléctrica** (10600001–10600004).
- Hoy solo los materiales usan la subfamilia en el código; mano de obra, equipos, herramientas y EPP llevan siempre «00» en esas dos cifras.

## Cambios
1. **Instrumentista → Eléctrica (06).** Se cambia su especialidad y queda como **10600005**, el quinto de la cuadrilla eléctrica (orden Capataz, Operario, Oficial, Peón, Instrumentista).
2. **Patrón único para todos los rubros:**
   - Cifra 1: rubro (1 MO, 2 MAT, 3 Equipos, 4 Herramientas, 5 Subcontratos, 6 EPP).
   - Cifras 2–3: especialidad (01 Arquitectura … 05 Instrumentación, 06 Eléctrica…).
   - Cifras 4–5: subfamilia, ahora en **todos** los rubros; si la ficha no tiene subfamilia va «00».
   - Cifras 6–8: correlativo de 3 cifras, sin huecos, por cada combinación rubro+especialidad+subfamilia.
3. **Recodificación automática** de las fichas existentes con el nuevo patrón (las que no tienen subfamilia conservan «00», así que la mano de obra no cambia salvo Instrumentista).
4. **Pantalla de Codificación de insumos:** el formato mostrado pasa a `TEESSNNN` en todos los rubros.

## Detalle técnico
- Migración: actualizar `siguiente_codigo_insumo_modular` para usar la subfamilia en cualquier tipo (no solo MAT); `UPDATE insumos SET especialidad_id = <06>` para Instrumentista junto con regeneración del código; el trigger de renumeración por prefijo de 5 dígitos ya cierra huecos.
- Orden de MO dentro del prefijo usa `orden-mano-obra` para que Instrumentista sea 005.
- Ajustar `CodificacionInsumos.tsx` y la prueba de `digito-insumo`; actualizar la memoria de código de insumos.
