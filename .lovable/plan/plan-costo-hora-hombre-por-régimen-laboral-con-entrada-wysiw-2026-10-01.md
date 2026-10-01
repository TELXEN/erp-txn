# Plan: Costo Hora-Hombre por régimen laboral, con entrada WYSIWYG

## Objetivo
En Maestro de insumos › Mano de obra, el registro y edición se hará con experiencia WYSIWYG similar a la hoja de cotizaciones: edición en línea sobre la propia "ficha" del insumo, con el Costo HH y su desglose recalculándose en vivo mientras se escribe, sin formularios separados.

## Experiencia WYSIWYG (estilo cotizaciones)
- La pestaña Mano de obra muestra una **tabla con edición en línea inmediata**, como las partidas de la cotización:
  - Clic en cualquier campo (descripción, sueldo, margen, régimen) lo vuelve editable al instante; Enter/Tab guarda y pasa al siguiente; Escape cancela.
  - Fila fantasma punteada al pie: al escribir la descripción y pulsar Enter se crea el insumo con código automático y queda otra fila lista (igual que la fila fantasma de cotizaciones).
  - El **Costo HH se recalcula en vivo** en la propia fila al cambiar sueldo, régimen o categoría, con desglose plegable "Cómo se calcula" (gratificaciones, vacaciones, CTS, EsSalud, SCTR, etc.).
  - P. Venta = Costo HH + margen %, visible y actualizada en vivo.
- Código automático de solo lectura, asignado al guardar (reservado en servidor).
- **Unidad fija: HH** (hora-hombre). No es editable en mano de obra; se muestra como dato fijo en la fila y se guarda siempre como "hh".

## Regímenes laborales y fórmula del Costo HH
Selector de régimen por insumo: **Régimen General Común**, **MYPE Pequeña Empresa**, **Construcción Civil**.

- **Régimen General**: sueldo×12 + 2 gratificaciones (+9% bonif. extraordinaria) + vacaciones 30 días + CTS (sueldo + 1/6 grati) + EsSalud 9% + SCTR y Vida Ley configurables.
- **MYPE Pequeña Empresa**: sueldo×12 + 1 gratificación (½ julio + ½ diciembre, +9%) + vacaciones 15 días + CTS ½ sueldo + asignación familiar 10% RMV opcional.
- **Construcción Civil**: jornal × días laborables + 80 jornales de gratificación (40 Fiestas Patrias + 40 Navidad) + vacaciones 10% del jornal + CTS 15% + BUC 32% operario / 30% oficial y peón + pasaje diario + 5% herramienta (operario). CONAFOVICER 2% informativo (lo paga el trabajador). Categorías: Operario, Oficial, Peón.
- Horas efectivas anuales ≈ 2.192 (configurable). **Costo HH = costo anual / horas efectivas.**

## Código automático
- Un dígito de tipo + correlativo, sin separadores, máx. 8 dígitos: 1=MO, 2=MAT, 3=EQ, 4=HT, 5=SC (ej. 10000001).
- Configurable en Catálogos Maestros (panel "Codificación de insumos"); numeración reservada solo por servidor (RPC service_role).

## Configuración del Sistema (solo Gerente)
Panel "Parámetros laborales": RMV, % EsSalud, % SCTR, % Vida Ley, horas semanales, feriados; y para Construcción Civil: jornal vigente por categoría, % BUC por categoría, pasaje diario, % herramienta.

## Detalles técnicos
- Migración: columnas `sueldo_mensual`, `regimen_laboral` ('General' | 'MYPE Pequeña' | 'Construcción Civil'), `categoria_obrero`, `asignacion_familiar` en `insumos`; tabla `parametros_laborales` (fila única, GRANTs + RLS: lectura autenticados, edición gerente); tabla `codificacion_insumo` + función `siguiente_codigo_insumo(tipo)` solo service_role, invocada desde `codigos.functions.ts`.
- `src/lib/apu.ts`: función pura `calcularCostoHH(insumo, params)` con rama por régimen que devuelve desglose y total; para MO se guarda `precio = Costo HH` y `unidad = 'hh'` siempre, así el APU y el buscador siguen usando `precioVenta` sin cambios.
- `src/components/Insumos.tsx`: edición en línea WYSIWYG en la pestaña MO (patrón de `CotizacionHoja.tsx`: estado de celda activa, guardado al salir, fila fantasma), columnas Código, Descripción, Régimen, Sueldo mensual, Unidad (HH fija), Costo HH, Margen %, P. Venta.
- Verificación en navegador: crear insumo MO de cada régimen, revisar código, cálculo en vivo y que aparezca en el APU con su P. Venta.
