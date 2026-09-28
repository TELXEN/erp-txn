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
