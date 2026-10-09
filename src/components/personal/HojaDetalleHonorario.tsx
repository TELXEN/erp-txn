import { Building2 } from "lucide-react";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
import { montoEnLetras } from "@/lib/facturacion";
import { MESES, soles } from "@/lib/format";

export type DetalleHonorario = {
  numero_recibo: string;
  fecha_emision: string;
  concepto: string;
  mes: number;
  anio: number;
  dias_laborados: number;
  dias_viaje: number;
  horas_extras: number;
  otros_remuneraciones: number;
  induccion: number;
  costo_unitario: number;
  saldo_mes_anterior: number;
  adelantos: number;
  devolucion_gastos: number;
  pagos_a_cuenta_planilla: number;
  fondo_pensiones: number;
  descuento_herramientas: number;
  lugar_emision: string;
  retencion: number;
};

export type SelectoresHonorario = {
  trabajadores: { id: string; nombre: string }[];
  proyectos: { id: string; nombre: string; codigo?: string | null }[];
  trabajadorId: string;
  proyectoId: string;
  onTrabajador: (id: string) => void;
  onProyecto: (id: string) => void;
};

type Props = {
  empresa: { razon_social?: string; ruc?: string; rubro?: string; direccion?: string; logo_url?: string } | null;
  trabajador: { dni?: string; nombre?: string; numero_cuenta?: string; banco?: string } | null;
  proyecto: string;
  detalle: DetalleHonorario;
  totalRemuneraciones: number;
  totalDescuentos: number;
  neto: number;
  /** Modo WYSIWYG: los valores se editan directamente sobre la hoja. */
  editable?: boolean;
  onCambiar?: (campo: keyof DetalleHonorario, valor: string) => void;
  selectores?: SelectoresHonorario;
};

const fechaLarga = (valor: string, lugar: string) => {
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (!anio || !mes || !dia) return lugar;
  return `${lugar}, ${dia} de ${MESES[mes - 1]?.toLowerCase() ?? ""} del ${anio}`;
};

const INPUT_NUM = "w-full min-w-0 bg-transparent text-right text-[10px] font-semibold tabular-nums outline-none border-b border-dashed border-primary/40 focus:border-primary print:border-0";
const INPUT_DATO = "min-w-0 flex-1 border-0 border-b border-dashed border-primary/40 bg-transparent px-1 py-1 text-[10px] font-semibold outline-none focus:border-primary print:border-0 print:appearance-none";

const ANCHO_ETIQUETA = "w-[128px]";

function EtiquetaDosp({ texto }: { texto: string }) {
  return (
    <span className={`flex ${ANCHO_ETIQUETA} shrink-0 items-center justify-between px-2 py-1.5 text-[9px] font-bold uppercase`} style={{ background: DOC.soft }}>
      <span>{texto}</span>
      <span>:</span>
    </span>
  );
}

function Fila({ etiqueta, valor, valorIzquierda, children }: { etiqueta: string; valor?: string; valorIzquierda?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-stretch border-b last:border-b-0" style={{ borderColor: DOC.line }}>
      <EtiquetaDosp texto={etiqueta} />
      {children ?? <span className={`flex-1 px-2 py-1.5 text-[10px] ${valorIzquierda ? "text-left" : "text-right"}`}>{valor || "—"}</span>}
    </div>
  );
}

const COL_MONTO = "grid-cols-[minmax(0,1fr)_48px_90px]";

function MontoCant({ etiqueta, cantidad, valor }: { etiqueta: string; cantidad?: string | undefined; valor: number }) {
  return (
    <div className={`grid ${COL_MONTO} items-center gap-2 border-b px-2.5 py-2 last:border-b-0`} style={{ borderColor: DOC.line }}>
      <span className="text-[10px] leading-tight">{etiqueta}</span>
      <span className="text-center text-[10px] font-semibold tabular-nums">{cantidad ?? "—"}</span>
      <span className="whitespace-nowrap text-right text-[10px] font-semibold tabular-nums">{soles(valor)}</span>
    </div>
  );
}

function Monto({ etiqueta, valor, editable, onCambiar }: { etiqueta: string; valor: number; editable?: boolean; onCambiar?: (valor: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-2 py-2 last:border-b-0" style={{ borderColor: DOC.line }}>
      <span className="text-[10px] leading-tight">{etiqueta}</span>
      {editable && onCambiar
        ? <span className="flex min-w-[98px] items-center justify-end gap-1"><span className="text-[10px] font-semibold">S/</span><input type="number" min="0" step="0.01" className={`${INPUT_NUM} max-w-[76px]`} value={valor} onChange={(e) => onCambiar(e.target.value)} /></span>
        : <span className="whitespace-nowrap text-[10px] font-semibold tabular-nums">{soles(valor)}</span>}
    </div>
  );
}

export function HojaDetalleHonorario({ empresa, trabajador, proyecto, detalle, totalRemuneraciones, totalDescuentos, neto, editable = false, onCambiar, selectores }: Props) {
  const cambia = (campo: keyof DetalleHonorario) => (valor: string) => {
    onCambiar?.(campo, valor);
  };
  // Cada concepto se valora en jornales: viaje/2, extras/10.5, feriados×2.
  const remuneraciones: { etiqueta: string; campo?: keyof DetalleHonorario; cantidad?: string; valor: number }[] = [
    { etiqueta: "Días laborados", campo: "dias_laborados", cantidad: String(detalle.dias_laborados || 0), valor: detalle.dias_laborados * detalle.costo_unitario },
    { etiqueta: "Días de viaje", campo: "dias_viaje", cantidad: String(detalle.dias_viaje || 0), valor: (detalle.dias_viaje / 2) * detalle.costo_unitario },
    { etiqueta: "Horas extras", campo: "horas_extras", cantidad: String(detalle.horas_extras || 0), valor: (detalle.horas_extras / 10.5) * detalle.costo_unitario },
    { etiqueta: "Feriados", campo: "otros_remuneraciones", cantidad: String(detalle.otros_remuneraciones || 0), valor: detalle.otros_remuneraciones * 2 * detalle.costo_unitario },
    { etiqueta: "Inducción", campo: "induccion", cantidad: String(detalle.induccion || 0), valor: detalle.induccion * detalle.costo_unitario },
    { etiqueta: "Costo unitario", campo: "costo_unitario", valor: detalle.costo_unitario },
    { etiqueta: "Saldo del mes anterior", campo: "saldo_mes_anterior", valor: detalle.saldo_mes_anterior },
  ];
  const descuentos: { etiqueta: string; campo?: keyof DetalleHonorario; valor: number }[] = [
    { etiqueta: "Adelantos", campo: "adelantos", valor: detalle.adelantos },
    { etiqueta: "Devolución de gastos", campo: "devolucion_gastos", valor: detalle.devolucion_gastos },
    { etiqueta: "Pagos a cuenta", campo: "pagos_a_cuenta_planilla", valor: detalle.pagos_a_cuenta_planilla },
    { etiqueta: "Pérdida de herramientas", campo: "descuento_herramientas", valor: detalle.descuento_herramientas },
    { etiqueta: "Otros", campo: "fondo_pensiones", valor: detalle.fondo_pensiones },
    { etiqueta: "Retención de 4ta categoría", valor: detalle.retencion },
  ];

  return (
    <article className="honorario-print-sheet mx-auto flex min-h-[297mm] w-[248mm] max-w-none flex-col bg-paper p-[12mm] text-ink shadow-lg print:min-h-0 print:p-[6mm] print:shadow-none" style={{ fontFamily: DOC_FUENTE_CSS }}>
      <header className="grid grid-cols-[150px_1fr_150px] items-center border-b-2 pb-4" style={{ borderColor: DOC.dark }}>
        <div className="flex h-16 items-center justify-start">
          {empresa?.logo_url ? <img src={empresa.logo_url} alt="Logotipo" className="max-h-16 max-w-36 object-contain" /> : <Building2 size={42} style={{ color: DOC.dark }} />}
        </div>
        <h1 className="text-center text-xl font-bold uppercase" style={{ color: DOC.dark }}>Detalle de pago</h1>
        <div className="text-right text-[9px]">
          <b>RECIBO</b>
          <p>{detalle.numero_recibo || "Pendiente de N°"}</p>
        </div>
      </header>

      <section className="mt-4 border" style={{ borderColor: DOC.line }}>
        <h2 className="px-2 py-1.5 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Datos de la empresa</h2>
        <div className="grid grid-cols-[0.72fr_1.28fr]">
          <div className="border-r" style={{ borderColor: DOC.line }}><Fila etiqueta="RUC" valor={empresa?.ruc ?? ""} /></div>
          <div><Fila etiqueta="Razón social" valor={empresa?.razon_social ?? ""} /></div>
          <div className="col-span-2 border-t" style={{ borderColor: DOC.line }}><Fila etiqueta="Dirección fiscal" valor={empresa?.direccion ?? ""} valorIzquierda /></div>
        </div>
      </section>

      <section className="mt-3 border" style={{ borderColor: DOC.line }}>
        <h2 className="px-2 py-1.5 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Datos del trabajador</h2>
        <div className="grid grid-cols-[1.2fr_0.8fr]">
          <div className="border-r" style={{ borderColor: DOC.line }}>
            <Fila etiqueta="DNI" valor={trabajador?.dni ?? ""} valorIzquierda />
            <Fila etiqueta="Apellidos y nombres">
              {editable && selectores ? (
                <select aria-label="Apellidos y nombres" className={INPUT_DATO} value={selectores.trabajadorId} onChange={(e) => selectores.onTrabajador(e.target.value)}>
                  <option value="">Seleccionar prestador</option>
                  {selectores.trabajadores.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              ) : <span className="flex-1 px-2 py-1.5 text-left text-[10px]">{trabajador?.nombre || "—"}</span>}
            </Fila>
          </div>
          <div>
            <Fila etiqueta="Cta. de depósito" valor={trabajador?.numero_cuenta ?? ""} />
            <Fila etiqueta="Banco" valor={trabajador?.banco ?? ""} />
          </div>
          <div className="col-span-2 grid grid-cols-[1fr_0.55fr] border-t" style={{ borderColor: DOC.line }}>
            <div className="flex items-center gap-3 border-r" style={{ borderColor: DOC.line }}>
              <span className="shrink-0 px-2 py-1.5 text-[9px] font-bold uppercase" style={{ background: DOC.soft }}>Mes</span>
              {editable ? (
                <select aria-label="Mes" className={INPUT_DATO} value={detalle.mes} onChange={(e) => cambia("mes")(e.target.value)}>
                  {MESES.map((mes, indice) => <option key={mes} value={indice + 1}>{mes}</option>)}
                </select>
              ) : <span className="flex-1 px-2 py-1.5 text-left text-[10px]">{MESES[detalle.mes - 1] ?? "—"}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 px-2 py-1.5 text-[9px] font-bold uppercase" style={{ background: DOC.soft }}>Año</span>
              {editable ? (
                <input aria-label="Año" type="number" min="2020" max="2100" className={`${INPUT_DATO} text-center tabular-nums`} value={detalle.anio} onChange={(e) => cambia("anio")(e.target.value)} />
              ) : <span className="flex-1 px-2 py-1.5 text-left text-[10px] tabular-nums">{detalle.anio}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>
        <span className="shrink-0">Proyecto:</span>
        <span>{proyecto || "Oficina Central"}</span>
      </div>

      <section className="mt-3 grid flex-1 grid-cols-[1.18fr_1fr_1.12fr] border" style={{ borderColor: DOC.line }}>
        <div className="border-r" style={{ borderColor: DOC.line }}>
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Remuneraciones</h3>
          <div className={`grid ${COL_MONTO} items-center gap-2 border-b px-2 py-1 text-[8px] font-bold uppercase`} style={{ borderColor: DOC.line, background: DOC.soft }}>
            <span>Concepto</span><span className="text-center">Cant.</span><span className="text-right">Monto</span>
          </div>
          {remuneraciones.map((r) =>
            r.campo === "costo_unitario" || r.campo === "saldo_mes_anterior" ? (
               <Monto key={r.etiqueta} etiqueta={r.etiqueta} valor={r.valor} />
            ) : (
               <MontoCant key={r.etiqueta} etiqueta={r.etiqueta} cantidad={r.cantidad} valor={r.valor} />
            ),
          )}
        </div>
        <div className="border-r" style={{ borderColor: DOC.line }}>
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Descuentos</h3>
          {descuentos.map((d) => d.campo && editable
            ? <Monto key={d.etiqueta} etiqueta={d.etiqueta} valor={d.valor} editable onCambiar={cambia(d.campo)} />
            : <Monto key={d.etiqueta} etiqueta={d.etiqueta} valor={d.valor} />)}
        </div>
        <div className="flex flex-col">
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Concepto del recibo por honorarios</h3>
          {editable ? (
            <textarea maxLength={800} rows={8} className="w-full flex-1 resize-none bg-transparent px-3 py-3 text-[10px] leading-relaxed outline-none placeholder:text-muted-foreground" placeholder="Describe el servicio prestado…" value={detalle.concepto} onChange={(e) => cambia("concepto")(e.target.value)} />
          ) : (
            <p className="flex-1 whitespace-pre-wrap px-3 py-3 text-[10px] leading-relaxed">{detalle.concepto || "—"}</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 border-x border-b" style={{ borderColor: DOC.line }}>
        <div className="border-r px-3 py-3" style={{ borderColor: DOC.line }}><p className="text-[9px] uppercase">Total remuneraciones</p><p className="mt-1 text-right text-sm font-bold">{soles(totalRemuneraciones)}</p></div>
        <div className="border-r px-3 py-3" style={{ borderColor: DOC.line }}><p className="text-[9px] uppercase">Total descuentos</p><p className="mt-1 text-right text-sm font-bold">{soles(totalDescuentos)}</p></div>
        <div className="px-3 py-3" style={{ background: DOC.total }}><p className="text-[9px] font-bold uppercase">Neto a pagar</p><p className="mt-1 text-right text-base font-bold">{soles(neto)}</p></div>
      </section>

      <p className="border-x border-b px-3 py-2 text-[10px] font-bold uppercase" style={{ borderColor: DOC.line, background: DOC.soft }}>
        {montoEnLetras(neto, "PEN")}
      </p>

      <footer className="mt-8 print:mt-4">
        <p className="text-right text-[10px]">{fechaLarga(detalle.fecha_emision, detalle.lugar_emision || "Huancayo")}</p>
        <div className="mt-12 grid grid-cols-2 gap-24 px-10 text-center text-[9px] font-bold print:mt-8">
          <div className="border-t pt-2" style={{ borderColor: DOC.ink }}>EMPLEADOR</div>
          <div className="border-t pt-2" style={{ borderColor: DOC.ink }}>TRABAJADOR</div>
        </div>
      </footer>
    </article>
  );
}
