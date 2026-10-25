import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { LogoEmpresa } from "@/components/personal/LogoEmpresa";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import { fecha, soles } from "@/lib/format";
import { montoEnLetras } from "@/lib/facturacion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { useEmpresa } from "@/lib/empresa";
import { DOC } from "@/lib/documento-tema";
import { factores } from "@/lib/beneficios";
import type { Trabajador } from "@/lib/datos";

export type RegistroCts = {
  periodo: string; anio: number; fecha_desde: string; fecha_hasta: string; meses: number; dias: number;
  remuneracion_computable: number; monto: number; total: number; detalle: Record<string, number>;
  estado_pago: string; fecha_pago: string | null; numero_operacion: string; banco_id?: string | null; regularizacion?: boolean;
};
type BoletaCts = { registro: RegistroCts; trabajador?: Trabajador | undefined; banco?: string | undefined };

function Dato({ nombre, valor, sinLinea }: { nombre: string; valor?: string | undefined; sinLinea?: boolean }) {
  return <div className={`grid grid-cols-[138px_minmax(0,1fr)] items-center ${sinLinea ? "" : "border-b border-line"}`}><span className="flex justify-between bg-muted/35 px-2 py-1.5 text-[9px] font-semibold uppercase"><span>{nombre}</span><span>:</span></span><span className="min-w-0 break-words px-2 py-1.5 text-[10px]">{valor || "—"}</span></div>;
}
function Fila({ n, v }: { n: string; v: string }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_86px] items-center border-b border-line px-2.5 py-1.5 text-[10px] last:border-0"><span>{n}</span><span className="whitespace-nowrap text-right font-semibold tabular-nums">{v}</span></div>;
}
const grupo = (titulo: string) => <h2 className="border-b border-line px-2 py-1 text-center text-[9px] leading-tight font-bold uppercase text-paper" style={{ background: DOC.dark }}>{titulo}</h2>;
const cabecera = (titulo: string) => <>{grupo(titulo)}<div className="flex justify-between border-b border-line bg-muted/35 px-2 py-0.5 text-[8px] font-bold uppercase"><span>Concepto</span><span>Monto</span></div></>;

function Hoja({ registro: r, trabajador: t, banco }: BoletaCts) {
  const { fuente } = useFuenteDocumento();
  const { data: empresa } = useEmpresa();
  const d = r.detalle ?? {};
  const rc = Number(r.remuneracion_computable);
  const factor = factores(t?.regimen_laboral ?? "General").cts;
  return <article className="honorario-print-sheet mx-auto w-[184mm] max-w-full border border-line bg-paper p-5 text-ink shadow-sm print:break-inside-avoid print:break-after-page print:last:break-after-auto" style={{ fontFamily: fuente.css }}>
    <header className="mb-3 flex items-center justify-between gap-4 border-b-2 border-primary pb-3">
      <LogoEmpresa empresa={empresa} className="w-[150px]" imgClassName="h-12 w-24 object-contain" iconSize={30} />
      <div className="shrink-0 text-center"><h1 className="text-lg font-bold uppercase">Boleta de pago CTS</h1><p className="text-[8px] font-semibold uppercase text-muted-foreground">Compensación por tiempo de servicios</p><p className="mt-1 text-[10px]">{r.periodo} {r.anio}{r.regularizacion ? " · Regularización" : ""}</p></div>
    </header>
    <section className="mb-3 border border-line">
      {grupo("Datos de la empresa")}
      <div className="grid grid-cols-2 divide-x divide-line"><Dato nombre="RUC" valor={empresa?.ruc} /><Dato nombre="Razón social" valor={empresa?.razon_social} /></div>
      <Dato nombre="Dirección fiscal" valor={empresa?.direccion} sinLinea />
    </section>
    <section className="mb-3 border border-line">
      {grupo("Datos del trabajador")}
      <Dato nombre="Apellidos y nombres" valor={t?.nombre} />
      <div className="grid grid-cols-2 divide-x divide-line"><div><Dato nombre="DNI" valor={t?.dni} /><Dato nombre="Cargo" valor={t?.cargo} /><Dato nombre="Régimen" valor={t?.regimen_laboral} /><Dato nombre="Fecha de ingreso" valor={fecha(t?.fecha_ingreso ?? null)} sinLinea /></div><div><Dato nombre="Desde" valor={fecha(r.fecha_desde)} /><Dato nombre="Hasta" valor={fecha(r.fecha_hasta)} /><Dato nombre="Meses computados" valor={String(r.meses)} /><Dato nombre="Días computados" valor={String(r.dias)} sinLinea /></div></div>
    </section>
    <div className="grid grid-cols-2 border border-line">
      <section className="border-r border-line">{cabecera("Remuneración computable")}
        <Fila n="Sueldo básico" v={d.sueldo !== undefined ? soles(d.sueldo) : "—"} />
        <Fila n="Asignación familiar" v={d.asignacion_familiar !== undefined ? soles(d.asignacion_familiar) : "—"} />
        <Fila n="1/6 de gratificación" v={soles(Number(d.sexto_gratificacion ?? 0))} />
      </section>
      <section>{cabecera("Cálculo de CTS")}
        <Fila n={`Por meses: R.C. / 12 × ${r.meses}`} v={soles(rc / 12 * r.meses * factor)} />
        <Fila n={`Por días: R.C. / 360 × ${r.dias}`} v={soles(rc / 360 * r.dias * factor)} />
        <Fila n="Factor del régimen" v={`${(factor * 100).toFixed(2)} %`} />
      </section>
      <div className="border-r border-t border-line bg-muted/35 font-bold"><Fila n="Total remuneración computable" v={soles(rc)} /></div>
      <div className="border-t border-line bg-muted/35 font-bold"><Fila n="Total CTS" v={soles(Number(r.total))} /></div>
    </div>
    <div className="mt-3 flex justify-between border border-primary bg-primary/5 px-3 py-2 text-sm font-bold"><span>CTS A DEPOSITAR</span><span>{soles(Number(r.total))}</span></div>
    <p className="mt-2 text-[9px] font-semibold">{montoEnLetras(Number(r.total), "PEN")}</p>
    <section className="mt-3 border border-line">{grupo("Datos del depósito")}
      <Dato nombre="Entidad / cuenta" valor={banco} />
      <div className="grid grid-cols-2 divide-x divide-line"><Dato nombre="Fecha de depósito" valor={fecha(r.fecha_pago)} /><Dato nombre="N° operación" valor={r.numero_operacion} /></div>
      <Dato nombre="Estado" valor={r.estado_pago} sinLinea />
    </section>
    <div className="mt-12 grid grid-cols-2 gap-16 px-8 text-center text-[10px]"><div className="border-t border-line pt-2">Empleador</div><div className="border-t border-line pt-2">Trabajador</div></div>
  </article>;
}

export function HojaCts({ boletas, onCerrar }: { boletas: BoletaCts[]; onCerrar: () => void }) {
  const [montado, setMontado] = useState(false);
  const [indice, setIndice] = useState(0);
  useEffect(() => setMontado(true), []);
  const activa = boletas[indice];
  return <VentanaFlotante titulo={boletas.length > 1 ? `Boletas de CTS (${boletas.length})` : "Boleta de pago CTS"} abierta onCerrar={onCerrar} ancho="max-w-[1100px]" ocultarBarra>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-muted/25 px-4 py-2.5">
      {boletas.length > 1 ? <select aria-label="Boleta de CTS" value={indice} onChange={(e) => setIndice(Number(e.target.value))} className="min-w-0 max-w-full rounded border border-line bg-background px-2 py-1 text-xs">{boletas.map((b, i) => <option key={i} value={i}>{b.trabajador?.nombre} · {b.registro.periodo} {b.registro.anio}</option>)}</select> : <span className="text-xs text-muted-foreground">{activa?.registro.estado_pago}</span>}
      <Boton variante="linea" onClick={() => window.print()}><Printer size={14} /> {boletas.length > 1 ? "Imprimir ambas / Guardar PDF" : "Imprimir / Guardar PDF"}</Boton>
    </div>
    <div className="overflow-auto bg-muted/40 p-4">{activa && <Hoja {...activa} />}</div>
    {montado && createPortal(<div className="honorario-print-root hidden print:block">{boletas.map((b, i) => <Hoja key={i} {...b} />)}</div>, document.body)}
  </VentanaFlotante>;
}
