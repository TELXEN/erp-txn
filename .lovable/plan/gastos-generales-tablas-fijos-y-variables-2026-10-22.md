# Gastos generales: tablas Fijos y Variables

## Qué verá el usuario
- La ventana **Gastos generales** de la cotización muestra dos tablas editables con columnas Ítem, Descripción, Unidad, Cantidad, Tiempo (meses), Costo unitario y Total:
  - **Tabla 1 – Gastos generales fijos** (no dependen del plazo): 1.1 Ingeniería/Legales/As-Built, 1.2 Movilización/Logística/Desmovilización, 1.3 Facilidades/Almacén, 1.4 Seguros/Financieros, con las unidades y cantidades del documento (Global 1, Viaje 2). La columna Tiempo muestra «N/A» y el total es Cantidad × Costo unitario.
  - **Tabla 2 – Gastos generales variables** (dependen del plazo): 2.1 Staff (5 filas, Planificador con 0.5), 2.2 Logística (4), 2.3 Seguridad (3), 2.4 Herramientas (3), unidad Mes. Total = Cantidad × Tiempo × Costo unitario.
- Arriba, un campo **Duración del proyecto (meses)**. Las filas variables toman ese valor como Tiempo por defecto; si se cambia la duración se actualizan las filas que no se hayan editado a mano.
- Cantidad, tiempo y costo unitario se editan directamente en la celda. Cada tabla tiene su botón **Agregar fila** (además de editar, copiar, eliminar, subir y bajar en la barra derecha).
- **Resumen de presupuesto** al pie, con % Utilidad (10% por defecto) e IGV (18%/0%, como hoy) editables:
  Costo directo total, (+) GG fijos, (+) GG variables, (=) Subtotal valor referencial, (+) Utilidad, (=) Valor venta neto, (+) IGV, (=) PRESUPUESTO FINAL TOTAL.
- El % GG de la cotización sigue calculándose como (fijos + variables) ÷ costo directo, así el desglose, la vista previa, PDF y Excel coinciden con este resumen.
- Botón **Generar reporte / Imprimir**: la hoja A4 existente pasa a mostrar las dos tablas y el resumen final, lista para imprimir o guardar en PDF.
- Cotizaciones nuevas (o con la hoja de GG vacía) reciben esta precarga. Las cotizaciones que ya tienen GG conservan sus filas; se ofrece un botón «Cargar estructura estándar» que reemplaza la hoja (con confirmación). Revisiones anteriores siguen en solo lectura.

## Detalles técnicos
- Migración: `cotizaciones.duracion_meses numeric default 1`; `cotizacion_gastos_generales.tipo text default 'variable'` ('fijo'|'variable') y `tiempo_manual boolean default false`. Filas existentes quedan 'variable'.
- `gastos-generales-cotizacion.ts`: nuevo `ESTRUCTURA_GG` con bloques 1 (fijos) y 2 (variables); `parcialGG` ignora tiempo cuando `tipo='fijo'`; `totalesGG` devuelve {fijos, variables}; función `resumenPresupuesto(cd, fijos, variables, pctUtil, igv)`.
- Unidades «Global», «Viaje», «Mes» se añaden a `unidades_medida` si faltan (GLB ya existe; se reutiliza).
- `GastosGeneralesCotizacion.tsx` renderiza dos tablas filtrando por bloque/tipo; utilidad e IGV escriben `pct_utilidad`/`aplica_igv` de la cotización.
- `gg-vista.tsx` muestra ambas tablas y el resumen.
- Pruebas: fijo ignora tiempo (1 × 500 = 500); variable 0.5 × 6 × 1000 = 3000; resumen con CD 10,000, GG 1,000+2,000, 10% y 18% → 13,000 / 14,300 / 16,874.
