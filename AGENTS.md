<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Project/quotation codes are generated only via server fn reservarCodigo (src/lib/codigos.functions.ts); the SQL functions are service_role-only — prevents direct calls from the browser.
- The programmed-progress matrix stores one percentage per leaf work item and project-defined period; dashboard calculations must exclude grouping rows to avoid double counting.
- The project S-curve uses the configured work-item schedule for its planned line, the current physical progress as the real cut-off marker, and only exposes cost progress to money-authorized roles — this preserves truthful history and role visibility.
- Preliquidation PDFs are generated client-side with @react-pdf/renderer from a dedicated document template — this keeps branded multi-page exports consistent and independent from browser print styling.
- Commercial quotation PDFs render as fixed A4 HTML sheets with repeated company/table headers and page numbering — this keeps html2pdf exports predictable across multi-page item lists.
- Electronic invoices use dedicated comprobantes_electronicos/items/cuotas tables, while emitted invoices/receipts mirror into ventas for treasury compatibility; numbering is reserved only by an authenticated server function.
- Electronic invoice previews use the globally configured local document font, and PDFs embed its compatible family — this keeps screen and exported output consistent.
- Electronic invoice pages reserve a fixed bottom area and repeat the complete fiscal footer, including the amount in words, on every A4 page — this prevents any item count from moving or overlapping the footer.
- Quotation, preliquidation, and electronic invoice editing use full-viewport overlays with fluid sheets; preview/PDF remains fixed A4 — this hides navigation during focused document editing without changing exports.
- ERP and document typography comes from the controlled local-font catalogue in configuracion_documentos; the UI uses --font-global while technical mono text remains separate, and PDF/Excel exporters receive the same selection — this keeps every output consistent.
- Document codes (projects, quotations, preliquidations, custom) are configured as rows in codificacion_documentos: free code + zero-padded correlative, generated via siguiente_codigo_documento — single source for all document numbering.
- Insumo types live in the tipos_insumo table (key, name, digit, correlative); code reads them via useTiposInsumo and never hardcodes the type list except the five protected system keys — lets users add independent types with their own tab, margin and APU group.
- The HT (herramientas manuales) type is hidden (tipos_insumo.oculto); calcularApu adds it automatically as the last row of the EQ group using the HT percentage from Márgenes APU — users never attach it manually.
- Sidebar colors use dedicated semantic theme tokens, separate from header and workspace colors — dark navigation themes must not alter business screens.
- Primary and action buttons use the active theme's sidebar base color — this keeps central workflows visually connected to navigation.
- Invoice, quotation and preliquidation documents take colors and font from src/lib/documento-tema.ts — one change updates all three outputs.

- La preliquidación usa una única hoja compartida (src/components/HojaPreliquidacion.tsx) para edición (fluida, campos en línea) y vista previa/impresión (A4 fijo, solo lectura); los cálculos de montos viven en src/lib/preliquidacion-montos.ts — así edición, vista previa y PDF nunca divergen.
- Purchase invoices downloaded from SUNAT are archived in comprobantes_recibidos(+_items) and the private comprobantes-compra bucket; downloads run only via the authenticated descargarComprobantesSire server fn in batches of 10 — keeps SOL credentials server-side and avoids worker timeouts.
- SIRE uses one persistent period selector and global synchronization control for RVIE and RCE across all SIRE tabs — keeps both books aligned to the same accounting period.
- Quotation hierarchy: single-discipline quotations store the group (Suministro/Montaje) in cotizacion_items.especialidad as the chapter; multidisciplinary ones keep the discipline there and the group in `grupo` (synced by trigger) — reuses the existing two-level editor without a third level. Templates live in plantillas_cotizacion(+_items) and are filled via "Guardar como plantilla".
- On desktop, AppShell owns the viewport height and gives the sidebar navigation and central workspace independent vertical scrolling — keeps navigation fixed while long business screens remain usable.
