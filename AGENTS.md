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
- Electronic invoice previews use Calibri with a locally bundled Carlito fallback, and PDFs embed the metric-compatible font — this preserves the requested typography across devices.
- Electronic invoice editing uses a full-viewport overlay and fluid sheet with screen-only typography enhancements; preview/PDF remains fixed A4 — this separates comfortable data entry from fiscal output.
- PDF typography is selected globally from a controlled local-font catalogue in configuracion_documentos and consumed by every preview/export path — this keeps documents consistent without relying on fonts installed on the user's device.
- Document codes (projects, quotations, preliquidations, custom) are configured as rows in codificacion_documentos: free code + zero-padded correlative, generated via siguiente_codigo_documento — single source for all document numbering.
- Insumo types live in the tipos_insumo table (key, name, digit, correlative); code reads them via useTiposInsumo and never hardcodes the type list except the five protected system keys — lets users add independent types with their own tab, margin and APU group.
