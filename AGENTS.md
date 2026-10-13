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
- Preliquidation PDFs use @react-pdf/renderer; quotation PDFs use fixed A4 HTML sheets with repeated headers/page numbers — predictable multi-page exports.
- Electronic invoices use dedicated comprobantes_electronicos/items/cuotas tables, while emitted invoices/receipts mirror into ventas for treasury compatibility; numbering is reserved only by an authenticated server function.
- Quotation/preliquidation/invoice editing renders in normal flow with sidebar visible; preview/PDF is fixed A4 and invoices repeat the fiscal footer in a reserved bottom area.
- Typography comes from the local-font catalogue in configuracion_documentos (UI via --font-global, mono separate; PDF/Excel get the same font) — consistent outputs.
- Document codes (projects, quotations, preliquidations, custom) are configured as rows in codificacion_documentos: free code + zero-padded correlative, generated via siguiente_codigo_documento — single source for all document numbering.
- Insumo types live in the tipos_insumo table (key, name, digit, correlative); code reads them via useTiposInsumo and never hardcodes the type list except the five protected system keys — users can add types.
- The HT (herramientas manuales) type is hidden (tipos_insumo.oculto); calcularApu adds it automatically as the last row of the EQ group using the HT percentage from Márgenes APU — users never attach it manually.
- Sidebar colors use dedicated theme tokens (never altering business screens); primary/action buttons use the sidebar base color — keeps workflows tied to navigation.
- Invoice/quotation/preliquidation colors and font come from src/lib/documento-tema.ts; preliquidation uses one sheet (HojaPreliquidacion.tsx) with amounts in src/lib/preliquidacion-montos.ts — outputs never diverge.
- SUNAT purchase invoices archive in comprobantes_recibidos(+_items) and the private comprobantes-compra bucket; only the authenticated descargarComprobantesSire server fn downloads, in batches of 10 — SOL credentials stay server-side.
- SIRE uses one persistent period selector and global synchronization control for RVIE and RCE across all SIRE tabs — keeps both books aligned to the same accounting period.
- Quotation hierarchy uses `especialidad` as the chapter for single-discipline quotes, while multidisciplinary quotes use it for discipline and `grupo` for group; templates preserve this structure. Master prices are PEN, converted on entry — no mixed currencies.
- On desktop, AppShell owns viewport height; sidebar and workspace scroll independently — navigation stays fixed.
- Quotation WBS codes: multidisciplinary = 4 levels Especialidad.Grupo.Categoría.Partida (01.01.01.01); single-discipline = 3 levels Grupo.Categoría.Partida (chapter is the group). Group 00 = none. numeracionCotizacion (src/lib/categorias.ts) is the single source; projects copy codes on conversion.
- EMO validity is computed in src/lib/emo.ts from each worker's latest exam (emos_trabajador, admin/gerente-only) — one rule feeds every EMO alert.
- Primary creation uses VentanaFlotante (optional hidden scrollbars) with consecutive saves and explicit close; cost eligibility, overrun lock and CD ceiling are DB triggers (Gerencia overrides via solicitudes_desbloqueo).
- Detraction collections store the BN account in ventas.banco_detraccion_id; treasury splits the sale between both banks — no duplicate sale rows.
- Paid Decolecta data is cached and shared ERP-wide: exchange rate via useTipoCambioHoy (tipo_cambio_diario, per Lima date), AFP commissions via useComisionesAfp (afp_comisiones_mensuales, per month) — one paid call per period.
- Honoraria (recibos_honorarios) and payroll (DetallePagoNomina) each use one WYSIWYG preview/print sheet; Cerrada gates payroll payments — aligned outputs.
- BEFORE triggers round amounts (2 dp) and quantities/unit prices (4 dp) on gastos_directos, gastos_generales and ventas — one rounding rule for every writer.
- Real project cost comes only from useCostoObras (src/lib/costo-obra.ts) — every panel shows the same figure; GG charts only regroup by scope.
- UI buttons merge classes with cn() so a passed className beats base utilities; table row actions use BotonIcono (tones neutro/primario/peligro) — icons never get squeezed by padding.
- Banco APU: five resource tables + partida_detalle (one nullable FK per row); removal goes through quitar_recurso_apu (deactivates if used) — recipes keep history.
- APU pie: specs on partidas_apu.especificaciones, metrado on partidas_apu_metrado, consolidado derived.
- Text auto-format: inputs opt in with data-formato=oracion|titulo|cargo|unidad, handled globally by FormatoGlobal (AppShell) using src/lib/formato-texto.ts — one rule set for every form.
