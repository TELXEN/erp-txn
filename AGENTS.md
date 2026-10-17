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
- Reserve project/quotation codes via reservarCodigo only; SQL functions are service_role-only — no browser numbering.
- Programmed progress stores percentages per leaf item/period; dashboards exclude grouping rows — no double counting.
- S-curve uses work-item schedules and current physical cut-off; cost progress is money-role-only — truthful history.
- Preliquidation PDFs use @react-pdf/renderer; quotation/invoice previews are fixed A4 HTML sheets (repeated headers, page numbers, invoice fiscal footer) while editing stays in normal flow — predictable exports.
- Electronic invoices use dedicated comprobantes_electronicos/items/cuotas tables, while emitted invoices/receipts mirror into ventas for treasury compatibility; numbering is reserved only by an authenticated server function.
- Typography: configuracion_documentos/local catalogue, UI --font-global, PDF embeds chosen font, Excel uses catalogue family — consistent outputs.
- Document codes use codificacion_documentos and siguiente_codigo_documento (free code + padded correlative) — one numbering source.
- Read tipos_insumo via useTiposInsumo; only five system keys may be hardcoded — users can add types.
- The HT (herramientas manuales) type is hidden (tipos_insumo.oculto); calcularApu adds it automatically as the last row of the EQ group using the HT percentage from Márgenes APU — users never attach it manually.
- Sidebar has dedicated theme tokens; primary/action buttons use its base color without altering business screens — consistent navigation.
- Invoice/quotation/preliquidation colors and font come from src/lib/documento-tema.ts; preliquidation uses one sheet (HojaPreliquidacion.tsx) with amounts in src/lib/preliquidacion-montos.ts — outputs never diverge.
- SUNAT purchase invoices archive in comprobantes_recibidos(+_items) and the private comprobantes-compra bucket; only the authenticated descargarComprobantesSire server fn downloads, in batches of 10 — SOL credentials stay server-side.
- SIRE uses one persistent period selector and sync control for RVIE and RCE — books stay aligned.
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
- Banco APU: five resource tables + partida_detalle (one nullable FK per row); removal via quitar_recurso_apu (deactivates if used); specs on partidas_apu.especificaciones, metrado in partidas_apu_metrado — recipes keep history.
- Text: data-formato and FormatoGlobal/formato-texto.ts — shared rules.
- Units come only from unidades_medida (selects in Banco APU, cotización sheet and new-partida dialogs); the canonical symbols the costing code compares are H-H (mano de obra), H-M (equipos por hora), % (porcentaje sobre MO) and GLB — keep them in the catalogue so nothing falls back to free text.
- TanStack routes: api/ protected, api/public/ verified external callers; no Edge Functions.
- banco_saldos is maintained atomically by source triggers; debits reject insufficient funds. Role-checked loan RPCs preserve posted history and prevent duplicate payments — concurrent writers cannot overspend.
