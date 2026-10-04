# Preliquidaciones: edición y vista previa idénticas

## Objetivo
Que la preliquidación se vea exactamente igual al editarla y al verla como impresión:
- **Edición**: hoja a ancho completo de la ventana (fluida), con los campos editables directamente sobre el documento.
- **Vista previa**: la misma hoja en tamaño A4 fijo, tal como saldrá impresa y en el PDF.

Hoy la edición es un formulario gris con tabla genérica, muy distinto de la hoja A4 de la vista previa. Además, la vista previa aún usa restos de color verde (emerald) que no coinciden con la paleta azul marino/dorado compartida.

## Cambios

### 1. Hoja compartida `HojaPreliquidacion` (nuevo componente)
- Se crea `src/components/HojaPreliquidacion.tsx`, siguiendo el mismo patrón que ya usa la factura electrónica (`HojaComprobante`): **una sola hoja** con el encabezado (logo, razón social, recuadro PRELIQUIDACIÓN + RUC + código), bloque de cliente/proyecto con borde dorado, tabla de líneas, desglose de totales y pie con datos bancarios (Soles / Dólares / Detracciones) y aviso legal.
- La hoja recibe una propiedad `editable`: cuando está activa, los textos se muestran como campos de escritura en línea (misma posición, mismo tamaño de letra); cuando no, se muestran como texto plano.
- Colores y letra tomados de `src/lib/documento-tema.ts` (azul marino, dorado, Roboto), igual que factura y cotización.

### 2. Edición a ventana completa
- En `src/components/Preliquidaciones.tsx`, el editor deja de ser el formulario actual y pasa a mostrar la hoja compartida en modo editable, ocupando todo el ancho de la ventana (como ya hace la edición de la factura).
- Se conservan las funciones actuales: agregar/quitar líneas, cargar partidas de la obra, condiciones de pago, régimen tributario y detracción, totales automáticos.

### 3. Vista previa = impresión
- `src/routes/_authenticated/preliquidacion-vista.tsx` pasa a usar la misma hoja compartida en modo solo lectura, con tamaño A4 fijo (794 px) y el pie bancario fijo al final, igual que ahora.
- Se eliminan los colores verdes (emerald) que quedaban en la vista previa para que coincida con la paleta compartida.

### 4. PDF
- `PreliquidacionPdf.tsx` ya usa la paleta compartida; se verifica que siga coincidiendo con la hoja (no se reescribe, solo ajustes menores si algo difiere).

## Detalles técnicos
- Patrón idéntico al de facturación: un componente de hoja con inputs en línea en modo edición; la detección de impresión se mantiene con `window.matchMedia("print")` si aplica.
- Edición fluida (ancho de ventana); vista previa e impresión A4 fijo — se respeta la regla vigente del ERP.
- Verificación: `bunx tsgo --noEmit`, build OK y revisión con Playwright de la edición y la vista previa de una preliquidación (TXN26-PL003) comparando que ambas se vean iguales.
