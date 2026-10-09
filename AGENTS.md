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
- The project S-curve plans from the work-item schedule, marks current physical progress as cut-off, and shows cost progress only to money roles — truthful history and role visibility.
- Preliquidation PDFs are generated client-side with @react-pdf/renderer from a dedicated document template — this keeps branded multi-page exports consistent and independent from browser print styling.
- Quotation PDFs use fixed A4 HTML sheets with repeated headers and page numbers — keeps multi-page exports predictable.
- Electronic invoices use dedicated comprobantes_electronicos/items/cuotas tables, while emitted invoices/receipts mirror into ventas for treasury compatibility; numbering is reserved only by an authenticated server function.
- Invoice A4 pages reserve a fixed bottom area repeating the fiscal footer on every page — items never overlap it.
- Quotation, preliquidation and invoice editing render in normal flow with the sidebar visible; preview/PDF stays fixed A4 — navigation stays available.
- Typography comes from the local-font catalogue in configuracion_documentos (UI via --font-global, mono separate; PDF/Excel get the same font) — consistent outputs.
- Document codes (projects, quotations, preliquidations, custom) are configured as rows in codificacion_documentos: free code + zero-padded correlative, generated via siguiente_codigo_documento — single source for all document numbering.
- Insumo types live in the tipos_insumo table (key, name, digit, correlative); code reads them via useTiposInsumo and never hardcodes the type list except the five protected system keys — lets users add independent types with their own tab, margin and APU group.
- The HT (herramientas manuales) type is hidden (tipos_insumo.oculto); calcularApu adds it automatically as the last row of the EQ group using the HT percentage from Márgenes APU — users never attach it manually.
- Sidebar colors use dedicated theme tokens (never altering business screens); primary/action buttons use the sidebar base color — keeps workflows tied to navigation.
- Invoice/quotation/preliquidation colors and font come from src/lib/documento-tema.ts; preliquidation uses one sheet (HojaPreliquidacion.tsx) with amounts in src/lib/preliquidacion-montos.ts — outputs never diverge.
- Purchase invoices downloaded from SUNAT are archived in comprobantes_recibidos(+_items) and the private comprobantes-compra bucket; downloads run only via the authenticated descargarComprobantesSire server fn in batches of 10 — keeps SOL credentials server-side and avoids worker timeouts.
- SIRE uses one persistent period selector and global synchronization control for RVIE and RCE across all SIRE tabs — keeps both books aligned to the same accounting period.
- Quotation hierarchy uses `especialidad` as the chapter for single-discipline quotes, while multidisciplinary quotes use it for discipline and `grupo` for group; templates preserve this structure. Master work-item prices are PEN and convert on entry to the quotation currency — prevents mixed hierarchies and currencies.
- On desktop, AppShell owns the viewport height and gives the sidebar navigation and central workspace independent vertical scrolling — keeps navigation fixed while long business screens remain usable.
- Quotation WBS codes: multidisciplinary = 4 levels Especialidad.Grupo.Categoría.Partida (01.01.01.01); single-discipline = 3 levels Grupo.Categoría.Partida (01.01.01, the chapter is the group). Group 00 = none. Computed by numeracionCotizacion in src/lib/categorias.ts and persisted by the editor; projects copy those codes on conversion — one numbering source for editor, print and projects.
- Vehicle timekeeping uses one row per usage day and only the daily rate; mileage remains in transfers.
- EMO validity is computed in src/lib/emo.ts from each worker's latest exam (emos_trabajador, admin/gerente-only) — one rule feeds every EMO alert.
- Primary creation uses VentanaFlotante (optional hidden scrollbars) with consecutive saves and explicit close; project cost eligibility is enforced by database triggers across every cost source — keeps entry efficient and prevents bypasses.
- Detraction collections store the BN account in ventas.banco_detraccion_id; treasury splits the sale between both banks — no duplicate sale rows.
- Paid Decolecta data is cached and shared ERP-wide: exchange rate via useTipoCambioHoy (tipo_cambio_diario, per Lima date), AFP commissions via useComisionesAfp (afp_comisiones_mensuales, per month) — one paid call per period.
- Honorarium details use recibos_honorarios and one preview/print sheet — aligned outputs.
- Payroll uses DetallePagoNomina WYSIWYG/DOM print; Cerrada gates payments — matches treasury.
