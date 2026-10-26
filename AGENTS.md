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
- S-curve lives in CurvaSObra on the Gantt tab route, not the dashboard; shared project selector, leaf schedules, physical cut-off and money-role-only costs preserve history.
- Preliquidation uses @react-pdf/renderer; quotation/invoice previews use fixed A4 HTML. Quotation pagination measures row/closing heights via paginacion-cotizacion, keeping headings with items.
- Project commercial refs are copied to preliquidaciones.orden_compra on selection, saved apart from concepto; outputs read the saved ref — history preserved.
- Electronic invoices use comprobantes_electronicos/items/cuotas; emitted invoices/receipts mirror into ventas for treasury; numbering reserved only by an authenticated server function.
- Invoice creation chooses its source before opening the editor; keep the selected preliquidation ID in editor state, not the URL, so a later free invoice never inherits an old link.
- Typography: configuracion_documentos/local catalogue, UI --font-global, PDF embeds chosen font, Excel uses catalogue family — consistent outputs.
- Document codes use codificacion_documentos and siguiente_codigo_documento (free code + padded correlative) — one numbering source.
- Read tipos_insumo via useTiposInsumo; only five system keys may be hardcoded — users can add types.
- HT type is hidden (tipos_insumo.oculto); calcularApu auto-adds it last in EQ using Márgenes APU % — never manual.
- Sidebar has dedicated theme tokens; primary/action buttons use its base color without altering business screens.
- Document colors/font: documento-tema.ts; preliquidation: one sheet + preliquidacion-montos.ts — outputs never diverge.
- SUNAT purchases archive in comprobantes_recibidos(+_items) + private bucket; only authenticated descargarComprobantesSire downloads (batches of 10) — SOL creds server-side.
- SIRE owns RCE: one period/sync control for both books; purchase XML/PDF/CDR + ERP register in the RCE table — Facturación Electrónica is sales-only.
- On desktop, AppShell owns viewport height; sidebar and workspace scroll independently — navigation stays fixed.
- Quotation rows: flat `orden`+`nivel` (niveles-cotizacion.ts); moves keep descendants. Bank inserts copy recipes; APU inserts snapshot via filaRecursoCotizacion; PEN master prices.
- Banco APU codes come only from banco-apu.ts (alphabetical, Spanish collator, renumbered per especialidad) — no hand-assigned codes.
- EMO validity is computed in src/lib/emo.ts from each worker's latest exam (emos_trabajador, admin/gerente-only) — one rule feeds every EMO alert.
- Primary creation uses VentanaFlotante (optional hidden scrollbars) with consecutive saves; cost eligibility, overrun lock and CD ceiling are DB triggers (Gerencia overrides via solicitudes_desbloqueo).
- Detraction collections store the BN account in ventas.banco_detraccion_id; treasury splits the sale between both banks — no duplicate sale rows.
- Paid Decolecta data cached: useTipoCambioHoy (per Lima date), useComisionesAfp (per month) — one paid call per period.
- Honoraria (recibos_honorarios) and payroll (DetallePagoNomina) each use one WYSIWYG preview/print sheet; Cerrada gates payroll payments — aligned outputs.
- BEFORE triggers round amounts (2 dp), qtys/prices (4 dp) and percentages (2 dp) on gastos_directos, gastos_generales, ventas, cotizaciones, proyectos, plantillas.
- Real project cost comes only from useCostoObras (src/lib/costo-obra.ts) — every panel shows the same figure; GG charts only regroup by scope.
- UI buttons merge classes with cn() so a passed className beats base utilities; table row actions use BotonIcono (tones neutro/primario/peligro).
- Right action bars share barra-iconos separators; Caja Chica targets selected boxes or receipts, and quotation IGV edits reuse aplica_igv (18%/0%) so previews and exports stay aligned.
- Banco APU: five resource tables + partida_detalle (one FK/row); quitar_recurso_apu deactivates used ones; specs/metrado in own tables — history kept.
- APU dossier is a read-only A4 rendering of the quotation APU grid, preserving its resource columns, group order, quantity semantics and manual-tools row so exports match the editor.
- Text: data-formato/FormatoGlobal; claveNombre folds case/accents for uniqueness.
- Editable catalogues can opt into a shared text-format mode applied both on blur and before saving — brand spelling stays consistent without changing other catalogues.
- Units: unidades_medida only, including APU/quotation/new-item selects; retain H-H (labor), H-M (hourly equipment), % (labor percentage), GLB — no free text.
- Specialties: explicit editable codes; archive removals. Rename via guardar_especialidad for atomic catalog links; preserve history.
- TanStack routes: api/ protected, api/public/ verified external callers; no Edge Functions.
- Quotation incidence uses incidenciaPartidaApu: HT belongs to EQ; missing APU means no resources, not a price adjustment.
- banco_saldos kept atomically by triggers; debits reject insufficient funds; role-checked loan RPCs block duplicates.
- Module screens use ui-kit CabeceraModulo, Pestanas, TarjetaResumen, FilasCargando and Vacio — one visual language across modules.
- List filters live in MenuFiltros (lupa) at the top of the right icon bar (BarraIconosHoja `filtros`), or `flotante` when a page has no bar — status tabs and data-loading period selectors stay visible.
- Carriers (transportistas + vehiculos/conductores) are a catalogue; guías copy carrier, vehicle and driver data into datos_guia so emitted guides never change when the catalogue does.
- Quotations from a prior year are resumed via retomarCotizacion (new current-year code, Rev. 00, retoma_de_id link, original frozen as Retomada) — yearly numbering stays clean and history is kept.
- ReportePagos: read-only from CxP selection; payee accounts via reporte-pagos.ts — never marks payments.
- Valuations snapshot contracted metrado/P.U.; prior accumulation only from approved ones; approval (DB trigger) needs supervisor signature and freezes the row — stable history.
- Gantt uses escalaCalendario and useRecordado for the timeline and last project.
- Inventory reuses materiales, equipos_herramientas and BancoEpp; categoria_inventario splits equipment/tools only in logistics. Unclassified rows stay under equipment; APU stays combined.
- Collapsible sections use Panel's colapsable/abierto/onAbrirCambiar props (header with totals stays visible, body hides) — one folding mechanism, not per-screen show/hide markup.
- CTS regularization: conflict-ignore inserts, independent period IDs. CTS/gratification/settlement share one sheet with saved amounts; calcGrat snapshots breakdown — no invented history.

- Employment periods: vinculos_laborales; liquidation/rehire/cese annulment only via their RPCs — atomic, history kept.
- Company regime: dated regimenes_empresa; a worker's regime can't be below the company's at hire (trigger + errorRegimenTrabajador) — changes hit only new hires.
- Company settings use DatosEmpresaTabs (general, banks, regime), not top-level tabs.
- Insumo codes renumber via AFTER DELETE trigger per 5-digit prefix — no gaps; inactive rows keep codes.
- Requerimientos: obra generates (APU saldo or TDR) → only gerente approves (trigger) → Bandeja quotes via solicitudes_cotizacion → approved quote creates OC → obra receives via recepcionar_orden_obra RPC — one status trail.
- Supplier quotation management opens from each inbox requirement; its request dialog selects outstanding items and suppliers together — purchasing actions must not depend on discovering hidden item-selection steps.
- Purchase orders use HojaOrdenCompra, DOC and A4 printing; orden-compra-montos shares tax totals, orden-compra-pago encodes terms in the existing field — costs/history unchanged.
