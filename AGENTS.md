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
- Preliquidation uses @react-pdf/renderer; quotation/invoice previews use fixed A4 HTML. Quotation pagination uses measured rows/closing heights via paginacion-cotizacion, keeping headings with items — no premature breaks.
- Project commercial references are copied into preliquidaciones.orden_compra on project selection and saved independently of concepto; previews and exports read the saved reference, not the project's current number, to preserve history.
- Electronic invoices use dedicated comprobantes_electronicos/items/cuotas tables, while emitted invoices/receipts mirror into ventas for treasury compatibility; numbering is reserved only by an authenticated server function.
- Invoice creation chooses its source before opening the editor; keep the selected preliquidation ID in editor state, not the URL, so a later free invoice never inherits an old link.
- Typography: configuracion_documentos/local catalogue, UI --font-global, PDF embeds chosen font, Excel uses catalogue family — consistent outputs.
- Document codes use codificacion_documentos and siguiente_codigo_documento (free code + padded correlative) — one numbering source.
- Read tipos_insumo via useTiposInsumo; only five system keys may be hardcoded — users can add types.
- The HT (herramientas manuales) type is hidden (tipos_insumo.oculto); calcularApu adds it automatically as the last row of the EQ group using the HT percentage from Márgenes APU — users never attach it manually.
- Sidebar has dedicated theme tokens; primary/action buttons use its base color without altering business screens.
- Invoice/quotation/preliquidation colors and font come from src/lib/documento-tema.ts; preliquidation uses one sheet (HojaPreliquidacion.tsx) with amounts in src/lib/preliquidacion-montos.ts — outputs never diverge.
- SUNAT purchase invoices archive in comprobantes_recibidos(+_items) and the private comprobantes-compra bucket; only the authenticated descargarComprobantesSire server fn downloads, in batches of 10 — SOL credentials stay server-side.
- SIRE owns RCE end to end: one persistent period selector and sync control for both books, with the purchase XML/PDF/CDR download and ERP register merged into the RCE conciliation table — Facturación Electrónica is sales-only.
- On desktop, AppShell owns viewport height; sidebar and workspace scroll independently — navigation stays fixed.
- Quotation rows use flat `orden` + `nivel` and niveles-cotizacion.ts; moves preserve descendants and may cross adjacent headings to change groups. HojaNiveles separates bank/new insertion; bank copies recipes, new stays independent. APU inserts use filaRecursoCotizacion for FK/code snapshots; PEN master prices.
- Banco APU partidas are stored and listed alphabetically (Spanish collator, accents/case-insensitive) and their hierarchical codes are renumbered by alphabetical position inside each especialidad branch — single source codigosAlfabetizados/alfabetizarPartidas/guardarPartidaEnBanco in banco-apu.ts, so no screen assigns bank codes by hand.
- EMO validity is computed in src/lib/emo.ts from each worker's latest exam (emos_trabajador, admin/gerente-only) — one rule feeds every EMO alert.
- Primary creation uses VentanaFlotante (optional hidden scrollbars) with consecutive saves and explicit close; cost eligibility, overrun lock and CD ceiling are DB triggers (Gerencia overrides via solicitudes_desbloqueo).
- Detraction collections store the BN account in ventas.banco_detraccion_id; treasury splits the sale between both banks — no duplicate sale rows.
- Paid Decolecta data is cached and shared ERP-wide: exchange rate via useTipoCambioHoy (tipo_cambio_diario, per Lima date), AFP commissions via useComisionesAfp (afp_comisiones_mensuales, per month) — one paid call per period.
- Honoraria (recibos_honorarios) and payroll (DetallePagoNomina) each use one WYSIWYG preview/print sheet; Cerrada gates payroll payments — aligned outputs.
- BEFORE triggers round amounts (2 dp), qtys/prices (4 dp) and percentages (2 dp) on gastos_directos, gastos_generales, ventas, cotizaciones, proyectos, plantillas.
- Real project cost comes only from useCostoObras (src/lib/costo-obra.ts) — every panel shows the same figure; GG charts only regroup by scope.
- UI buttons merge classes with cn() so a passed className beats base utilities; table row actions use BotonIcono (tones neutro/primario/peligro).
- Right action bars share barra-iconos separators; Caja Chica targets selected boxes or receipts, and quotation IGV edits reuse aplica_igv (18%/0%) so previews and exports stay aligned.
- Banco APU: five resource tables + partida_detalle (one FK per row); quitar_recurso_apu deactivates used resources; specs on partidas_apu.especificaciones, metrado on partidas_apu_metrado — preserves history.
- APU dossier is a read-only A4 rendering of the quotation APU grid, preserving its resource columns, group order, quantity semantics and manual-tools row so exports match the editor.
- Text: data-formato/FormatoGlobal; claveNombre folds case/accents for uniqueness.
- Editable catalogues can opt into a shared text-format mode applied both on blur and before saving — brand spelling stays consistent without changing other catalogues.
- Units: unidades_medida only, including APU/quotation/new-item selects; retain H-H (labor), H-M (hourly equipment), % (labor percentage), GLB — no free text.
- Specialties: explicit editable codes; archive removals. Rename via guardar_especialidad for atomic catalog links; preserve history.
- TanStack routes: api/ protected, api/public/ verified external callers; no Edge Functions.
- Quotation incidence uses incidenciaPartidaApu: HT belongs to EQ; missing APU means no resources, not a price adjustment.
- banco_saldos is maintained atomically by source triggers; debits reject insufficient funds. Role-checked loan RPCs preserve posted history and prevent duplicate payments — concurrent writers cannot overspend.
- Module screens use ui-kit CabeceraModulo, Pestanas, TarjetaResumen, FilasCargando and Vacio — one visual language across modules.
- List filters live in MenuFiltros (lupa) at the top of the right icon bar (BarraIconosHoja `filtros`), or `flotante` when a page has no bar — status tabs and data-loading period selectors stay visible.
- Carriers (transportistas + vehiculos/conductores) are a catalogue; guías copy carrier, vehicle and driver data into datos_guia so emitted guides never change when the catalogue does.
- Quotations from a prior year are resumed via retomarCotizacion (new current-year code, Rev. 00, retoma_de_id link, original frozen as Retomada) — yearly numbering stays clean and history is kept.
- Payment reports (ReportePagos) are read-only lists built from Tesorería CxP selection; payee accounts come from terceros_cuentas_bancarias (providers) or trabajadores (staff) via reporte-pagos.ts — reports never mark payments.
- Work valuations (valorizaciones/valorizacion_items) snapshot contracted metrado/P.U.; prior accumulation comes only from approved valuations and approval (DB trigger) requires supervisor signature and freezes the row — history never shifts with live progress.
- Gantt uses escalaCalendario for the timeline viewport and useRecordado for project selection — navigation stays legible and restores the last opened project without changing project data.
