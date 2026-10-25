import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { LogoEmpresa } from "@/components/personal/LogoEmpresa";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import { fecha, soles } from "@/lib/format";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useEmpresa } from "@/lib/empresa";
import { DOC } from "@/lib/documento-tema";
import type { Trabajador } from "@/lib/datos";

export type RegistroCts = {
  periodo: string; anio: number; fecha_desde: string; fecha_hasta: string; meses: number; dias: number;
  remuneracion_computable: number; monto: number; total: number; detalle: Record<string, number>;
  estado_pago: string; fecha_pago: string | null; numero_operacion: string; banco_id?: string | null; regularizacion?: boolean;
};

function Fila({ n, v }: { n: string; v: string }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_120px] border-b border-line px-2.5 py-1.5 text-[10px] last:border-0"><span>{n}</span><span className="text-right font-semibold tabular-nums">{v}</span></div>;
}
const grupo = (t: string) => <h2 className="px-2 py-1 text-center text-[9px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>{t}</h2>;

function Hoja({ r, t, banco }: { r: RegistroCts; t?: Trabajador | undefined; banco?: string | undefined }) {
  const { fuente } = useFuenteDocumento();
  const { data: empresa } = useEmpresa();
  const d = r.detalle ?? {};
  const rc = Number(r.remuneracion_computable);
  return <article className="honorario-print-sheet mx-auto w-[184mm] max-w-full border border-line bg-paper p-5 text-ink shadow-sm" style={{ fontFamily: fuente.css }}>
    <header className="mb-3 flex items-center justify-between gap-4 border-b-2 border-primary pb-3">
      <LogoEmpresa empresa={empresa} className="w-[150px]" imgClassName="h-12 w-24 object-contain" iconSize={30} />
      <div className="text-center"><h1 className="text-lg font-bold uppercase">Liquidación de depósito CTS</h1><p className="text-[10px]">Periodo {r.periodo} {r.anio}{r.regularizacion ? " · Regularización" : ""}</p></div>
    </header>
    <section className="mb-3 border border-line">{grupo("Empleador")}<Fila n="Razón social" v={empresa?.razon_social ?? "—"} /><Fila n="RUC" v={empresa?.ruc ?? "—"} /></section>
    <section className="mb-3 border border-line">{grupo("Trabajador")}
      <Fila n="Nombre" v={t?.nombre ?? "—"} /><Fila n="DNI" v={t?.dni ?? "—"} /><Fila n="Cargo" v={t?.cargo ?? "—"} />
      <Fila n="Fecha de ingreso" v={fecha(t?.fecha_ingreso ?? null)} /><Fila n="Régimen laboral" v={t?.regimen_laboral ?? "—"} />
    </section>
    <section className="mb-3 border border-line">{grupo("Periodo computado")}
      <Fila n="Desde – hasta" v={`${fecha(r.fecha_desde)} – ${fecha(r.fecha_hasta)}`} /><Fila n="Tiempo computable" v={`${r.meses} meses ${r.dias} días`} />
    </section>
    <section className="mb-3 border border-line">{grupo("Remuneración computable")}
      {d.sueldo !== undefined && <Fila n="Remuneración básica" v={soles(d.sueldo)} />}
      {d.asignacion_familiar !== undefined && <Fila n="Asignación familiar" v={soles(d.asignacion_familiar)} />}
      <Fila n="1/6 de gratificación" v={soles(Number(d.sexto_gratificacion ?? 0))} />
      <Fila n="Total remuneración computable" v={soles(rc)} />
    </section>
    <section className="mb-3 border border-line">{grupo("Cálculo")}
      <Fila n={`Por meses: ${soles(rc)} / 12 × ${r.meses}`} v={soles((rc / 12) * r.meses)} />
      <Fila n={`Por días: ${soles(rc)} / 360 × ${r.dias}`} v={soles((rc / 360) * r.dias)} />
      <Fila n="Monto a depositar" v={soles(Number(r.total))} />
    </section>
    <section className="mb-6 border border-line">{grupo("Depósito")}
      <Fila n="Entidad / cuenta" v={banco ?? "—"} /><Fila n="Fecha de depósito" v={fecha(r.fecha_pago)} /><Fila n="N° de operación" v={r.numero_operacion || "—"} /><Fila n="Estado" v={r.estado_pago} />
    </section>
    <div className="mt-14 grid grid-cols-2 gap-10 text-center text-[10px]"><div className="border-t border-ink pt-1">Empleador</div><div className="border-t border-ink pt-1">Trabajador</div></div>
  </article>;
}

export function HojaCts({ registro, trabajador, banco, onCerrar }: { registro: RegistroCts; trabajador?: Trabajador | undefined; banco?: string | undefined; onCerrar: () => void }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return <VentanaFlotante titulo="Hoja de liquidación de CTS" abierta onCerrar={onCerrar} ancho="max-w-[1000px]" ocultarBarra>
    <div className="flex justify-end border-b border-line bg-muted/25 px-4 py-2.5"><Boton variante="linea" onClick={() => window.print()}><Printer size={14} /> Imprimir / Guardar PDF</Boton></div>
    <div className="overflow-auto bg-muted/40 p-4"><Hoja r={registro} t={trabajador} banco={banco} /></div>
    {montado && createPortal(<div className="honorario-print-root hidden print:block"><Hoja r={registro} t={trabajador} banco={banco} /></div>, document.body)}
  </VentanaFlotante>;
}
