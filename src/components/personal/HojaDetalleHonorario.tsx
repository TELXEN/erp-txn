import { Building2 } from "lucide-react";
import { DOC, DOC_FUENTE_CSS } from "@/lib/documento-tema";
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

type Props = {
  empresa: { razon_social?: string; ruc?: string; rubro?: string; direccion?: string; logo_url?: string } | null;
  trabajador: { dni?: string; nombre?: string; numero_cuenta?: string; banco?: string } | null;
  proyecto: string;
  detalle: DetalleHonorario;
  totalRemuneraciones: number;
  totalDescuentos: number;
  neto: number;
};

const fechaLarga = (valor: string, lugar: string) => {
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (!anio || !mes || !dia) return lugar;
  return `${lugar}, ${dia} de ${MESES[mes - 1]?.toLowerCase() ?? ""} del ${anio}`;
};

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="grid grid-cols-[108px_1fr] border-b last:border-b-0" style={{ borderColor: DOC.line }}>
      <span className="px-2 py-1.5 text-[9px] font-bold uppercase" style={{ background: DOC.soft }}>{etiqueta}</span>
      <span className="px-2 py-1.5 text-[10px]">{valor || "—"}</span>
    </div>
  );
}

function Monto({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-2 py-2 last:border-b-0" style={{ borderColor: DOC.line }}>
      <span className="text-[9px] leading-tight">{etiqueta}</span>
      <span className="whitespace-nowrap text-[9px] font-semibold tabular-nums">{soles(valor)}</span>
    </div>
  );
}

export function HojaDetalleHonorario({ empresa, trabajador, proyecto, detalle, totalRemuneraciones, totalDescuentos, neto }: Props) {
  const remuneraciones = [
    ["Días laborados", detalle.dias_laborados * detalle.costo_unitario],
    ["Días de viaje", detalle.dias_viaje],
    ["Horas extras", detalle.horas_extras],
    ["Otros", detalle.otros_remuneraciones],
    ["Costo unitario", detalle.costo_unitario],
    ["Saldo del mes anterior", detalle.saldo_mes_anterior],
  ] as const;
  const descuentos = [
    ["Adelantos", detalle.adelantos],
    ["Devolución de gastos", detalle.devolucion_gastos],
    ["Pagos a cuenta (Planilla)", detalle.pagos_a_cuenta_planilla],
    ["Fondo de pensiones", detalle.fondo_pensiones],
    ["Pérdida de herramientas", detalle.descuento_herramientas],
    ["Retención de 4ta categoría", detalle.retencion],
  ] as const;

  return (
    <article className="honorario-print-sheet mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-paper p-[12mm] text-ink shadow-lg print:min-h-0 print:w-[186mm] print:p-[6mm] print:shadow-none" style={{ fontFamily: DOC_FUENTE_CSS }}>
      <header className="grid grid-cols-[150px_1fr_150px] items-center border-b-2 pb-4" style={{ borderColor: DOC.dark }}>
        <div className="flex h-16 items-center justify-start">
          {empresa?.logo_url ? <img src={empresa.logo_url} alt="Logotipo" className="max-h-16 max-w-36 object-contain" /> : <Building2 size={42} style={{ color: DOC.dark }} />}
        </div>
        <h1 className="text-center text-xl font-bold uppercase" style={{ color: DOC.dark }}>Detalle de pago</h1>
        <div className="text-right text-[9px]">
          <b>RECIBO</b>
          <p>{detalle.numero_recibo || "—"}</p>
        </div>
      </header>

      <section className="mt-4 border" style={{ borderColor: DOC.line }}>
        <h2 className="px-2 py-1.5 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Datos de la empresa</h2>
        <div className="grid grid-cols-2">
          <div className="border-r" style={{ borderColor: DOC.line }}><Fila etiqueta="RUC" valor={empresa?.ruc ?? ""} /><Fila etiqueta="Razón social" valor={empresa?.razon_social ?? ""} /></div>
          <div><Fila etiqueta="Rubro" valor={empresa?.rubro ?? ""} /><Fila etiqueta="Dirección" valor={empresa?.direccion ?? ""} /></div>
        </div>
      </section>

      <section className="mt-3 border" style={{ borderColor: DOC.line }}>
        <h2 className="px-2 py-1.5 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Datos del trabajador</h2>
        <div className="grid grid-cols-2">
          <div className="border-r" style={{ borderColor: DOC.line }}><Fila etiqueta="DNI" valor={trabajador?.dni ?? ""} /><Fila etiqueta="Apellidos y nombres" valor={trabajador?.nombre ?? ""} /><Fila etiqueta="Periodo" valor={`${MESES[detalle.mes - 1] ?? "—"} ${detalle.anio}`} /></div>
          <div><Fila etiqueta="Cta. de depósito" valor={trabajador?.numero_cuenta ?? ""} /><Fila etiqueta="Banco" valor={trabajador?.banco ?? ""} /><Fila etiqueta="Fecha de emisión" valor={detalle.fecha_emision.split("-").reverse().join("/")} /></div>
        </div>
      </section>

      <div className="mt-3 px-3 py-2 text-[10px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Proyecto: {proyecto || "Oficina Central"}</div>

      <section className="mt-3 grid flex-1 grid-cols-3 border" style={{ borderColor: DOC.line }}>
        <div className="border-r" style={{ borderColor: DOC.line }}>
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Remuneraciones</h3>
          {remuneraciones.map(([etiqueta, valor]) => <Monto key={etiqueta} etiqueta={etiqueta} valor={valor} />)}
        </div>
        <div className="border-r" style={{ borderColor: DOC.line }}>
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Descuentos</h3>
          {descuentos.map(([etiqueta, valor]) => <Monto key={etiqueta} etiqueta={etiqueta} valor={valor} />)}
        </div>
        <div className="flex flex-col">
          <h3 className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ background: DOC.total }}>Concepto del recibo por honorarios</h3>
          <p className="flex-1 whitespace-pre-wrap px-3 py-3 text-[10px] leading-relaxed">{detalle.concepto || "—"}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 border-x border-b" style={{ borderColor: DOC.line }}>
        <div className="border-r px-3 py-3" style={{ borderColor: DOC.line }}><p className="text-[9px] uppercase">Total remuneraciones</p><p className="mt-1 text-right text-sm font-bold">{soles(totalRemuneraciones)}</p></div>
        <div className="border-r px-3 py-3" style={{ borderColor: DOC.line }}><p className="text-[9px] uppercase">Total descuentos</p><p className="mt-1 text-right text-sm font-bold">{soles(totalDescuentos)}</p></div>
        <div className="px-3 py-3" style={{ background: DOC.total }}><p className="text-[9px] font-bold uppercase">Neto a pagar</p><p className="mt-1 text-right text-base font-bold">{soles(neto)}</p></div>
      </section>

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