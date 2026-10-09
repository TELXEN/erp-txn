import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, Printer, Save } from "lucide-react";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import type { Trabajador } from "@/lib/datos";
import { fecha, soles } from "@/lib/format";
import { montoEnLetras } from "@/lib/facturacion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";

export type BoletaNomina = {
  id: string; planilla_id: string; trabajador_id: string; regimen_laboral: string;
  sistema_pensiones: string; dias_laborados: number; sueldo_basico: number;
  asignacion_familiar: number; horas_extra: number; otros_ingresos: number;
  total_ingresos: number; aporte_pension: number; renta_quinta: number;
  otros_descuentos: number; total_descuentos: number; neto_pagar: number;
  essalud: number; estado_pago: string; banco_id: string | null;
  fecha_pago: string | null; numero_operacion: string;
};
export type ValoresNomina = Pick<BoletaNomina, "dias_laborados" | "horas_extra" | "otros_ingresos" | "renta_quinta" | "otros_descuentos">;
type Empresa = { razon_social?: string; ruc?: string; direccion?: string; logo_url?: string } | null | undefined;

function Dato({ nombre, valor }: { nombre: string; valor?: string | undefined }) {
  return <div className="grid grid-cols-[138px_minmax(0,1fr)] items-center border-b border-line last:border-0"><span className="flex justify-between bg-muted/35 px-2 py-1.5 text-[9px] font-semibold uppercase"><span>{nombre}</span><span>:</span></span><span className="min-w-0 px-2 py-1.5 text-[10px]">{valor || "—"}</span></div>;
}

function Hoja({ boleta: b, trabajador: t, empresa, periodo, editable, cambiar }: {
  boleta: BoletaNomina; trabajador?: Trabajador | undefined; empresa: Empresa; periodo: string;
  editable?: boolean; cambiar?: (campo: keyof ValoresNomina, valor: string) => void;
}) {
  const { fuente } = useFuenteDocumento();
  const fila = (etiqueta: string, importe: number, campo?: keyof ValoresNomina) => (
    <div key={etiqueta} className="grid grid-cols-[minmax(0,1fr)_104px] items-center border-b border-line px-2.5 py-1.5 text-[10px] last:border-0">
      <span>{etiqueta}</span>
      {editable && campo && cambiar ? <label className="flex items-center justify-end gap-1 font-semibold"><span>S/</span><input aria-label={etiqueta} type="number" step="0.01" min="0" value={importe} onChange={(e) => cambiar(campo, e.target.value)} className="w-[78px] min-w-0 border-b border-dashed border-primary/40 bg-transparent text-right tabular-nums outline-none focus:border-primary" /></label> : <span className="whitespace-nowrap text-right font-semibold tabular-nums">{soles(importe)}</span>}
    </div>
  );
  const cabecera = (titulo: string) => <><h2 className="bg-primary px-2.5 py-2 text-center text-[10px] font-bold uppercase text-primary-foreground">{titulo}</h2><div className="flex justify-between border-b border-line bg-muted/35 px-2.5 py-1 text-[8px] font-bold uppercase"><span>Concepto</span><span>Monto</span></div></>;
  return <article className="honorario-print-sheet mx-auto w-[184mm] max-w-full border border-line bg-paper p-5 text-ink shadow-sm" style={{ fontFamily: fuente.css }}>
    <header className="mb-3 flex items-center justify-between gap-4 border-b-2 border-primary pb-3">
      <div className="flex min-w-0 items-center gap-3">{empresa?.logo_url ? <img src={empresa.logo_url} alt={empresa.razon_social ?? "Empresa"} className="h-12 w-24 object-contain" /> : <Building2 size={30} className="text-primary" />}<span className="text-sm font-bold">{empresa?.razon_social ?? "TELXEN SAC"}</span></div>
      <div className="shrink-0 text-center"><h1 className="text-lg font-bold uppercase">Boleta de pago</h1><p className="text-[8px] font-semibold uppercase text-muted-foreground">Quinta categoría</p><p className="mt-1 text-[10px]">{periodo}</p></div>
    </header>
    <section className="mb-3 border border-line">
      <div className="grid grid-cols-2 divide-x divide-line"><Dato nombre="RUC" valor={empresa?.ruc} /><Dato nombre="Razón social" valor={empresa?.razon_social} /></div>
      <Dato nombre="Dirección fiscal" valor={empresa?.direccion} />
    </section>
    <section className="mb-3 border border-line">
      <Dato nombre="Apellidos y nombres" valor={t?.nombre} />
      <div className="grid grid-cols-2 divide-x divide-line"><div><Dato nombre="DNI" valor={t?.dni} /><Dato nombre="Cargo" valor={t?.cargo} /><Dato nombre="Régimen" valor={b.regimen_laboral} /><Dato nombre="Días laborados" valor={String(b.dias_laborados)} /></div><div><Dato nombre="Cuenta de depósito" valor={t?.numero_cuenta} /><Dato nombre="Banco" valor={t?.banco} /><Dato nombre="CUSPP" valor={t?.cuspp} /><Dato nombre="Fecha de ingreso" valor={fecha(t?.fecha_ingreso ?? null)} /></div></div>
    </section>
    <div className="grid grid-cols-[1.12fr_1.12fr_0.9fr] border border-line">
      <section className="border-r border-line">{cabecera("Remuneraciones")}{fila("Sueldo básico", b.sueldo_basico)}{fila("Asignación familiar", b.asignacion_familiar)}{fila("Horas extra", b.horas_extra)}{fila("Otros ingresos", b.otros_ingresos, "otros_ingresos")}</section>
      <section className="border-r border-line">{cabecera("Descuentos")}{fila(b.sistema_pensiones && b.sistema_pensiones !== "Ninguno" ? `Aporte previsional (${b.sistema_pensiones})` : "Aporte previsional", b.aporte_pension)}{fila("Renta 5ta categoría", b.renta_quinta, "renta_quinta")}{fila("Otros descuentos", b.otros_descuentos, "otros_descuentos")}</section>
      <section>{cabecera("Aportes empleador")}{fila(b.regimen_laboral === "MYPE Micro" ? "SIS" : "EsSalud", b.essalud)}</section>
      <div className="border-r border-t border-line bg-muted/35 font-bold">{fila("Total ingresos", b.total_ingresos)}</div><div className="border-r border-t border-line bg-muted/35 font-bold">{fila("Total descuentos", b.total_descuentos)}</div><div className="border-t border-line bg-muted/35 font-bold">{fila("Total aportes", b.essalud)}</div>
    </div>
    <div className="mt-3 flex justify-between border border-primary bg-primary/5 px-3 py-2 text-sm font-bold"><span>NETO A PAGAR</span><span>{soles(b.neto_pagar)}</span></div>
    <p className="mt-2 text-[9px] font-semibold">{montoEnLetras(b.neto_pagar, "PEN")}</p>
    <div className="mt-12 grid grid-cols-2 gap-16 px-8 text-center text-[10px]"><div className="border-t border-line pt-2">Empleador</div><div className="border-t border-line pt-2">Trabajador</div></div>
    <p className="mt-3 text-right text-[8px] text-muted-foreground">D.S. 001-98-TR</p>
  </article>;
}

export function DetallePagoNomina({ boleta, trabajador, empresa, periodo, bloqueada, recalcular, onGuardar, onCerrar }: {
  boleta: BoletaNomina; trabajador?: Trabajador | undefined; empresa: Empresa; periodo: string; bloqueada: boolean;
  recalcular: (valores: ValoresNomina) => Partial<BoletaNomina>;
  onGuardar: (valores: ValoresNomina) => Promise<boolean>; onCerrar: () => void;
}) {
  const [valores, setValores] = useState<ValoresNomina>({ dias_laborados: Number(boleta.dias_laborados), horas_extra: Number(boleta.horas_extra), otros_ingresos: Number(boleta.otros_ingresos), renta_quinta: Number(boleta.renta_quinta), otros_descuentos: Number(boleta.otros_descuentos) });
  const [montado, setMontado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setMontado(true), []);
  const vista = bloqueada ? boleta : { ...boleta, ...recalcular(valores) };
  const guardar = async () => {
    if (Object.values(valores).some((v) => !Number.isFinite(v) || v < 0) || vista.neto_pagar < 0) return setError("Revisa los importes: el neto no puede ser negativo.");
    setGuardando(true);
    try { if (await onGuardar(valores)) onCerrar(); else setError("No se guardó la boleta. Revisa el mensaje en Nómina."); }
    catch { setError("No se pudo guardar la boleta. Inténtalo nuevamente."); }
    finally { setGuardando(false); }
  };
  const hoja = <Hoja boleta={vista} trabajador={trabajador} empresa={empresa} periodo={periodo} />;
  return <VentanaFlotante titulo="Detalle de boleta de pago" abierta onCerrar={onCerrar} ancho="max-w-[1100px]" ocultarBarra>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-muted/25 px-4 py-2.5"><span className="text-xs text-muted-foreground">{bloqueada ? <span className="flex items-center gap-1"><Check size={13} /> {boleta.estado_pago === "Pagado" ? "Pagada" : "Validada"}</span> : "Borrador"}</span><div className="flex gap-2"><Boton variante="linea" onClick={() => window.print()}><Printer size={14} /> Imprimir / Guardar PDF</Boton>{!bloqueada && <Boton disabled={guardando} onClick={() => void guardar()}><Save size={14} /> {guardando ? "Guardando…" : "Guardar detalle"}</Boton>}</div></div>
    {error && <p role="alert" className="px-4 py-2 text-xs text-bad">{error}</p>}
    <div className="overflow-auto bg-muted/40 p-4"><Hoja boleta={vista} trabajador={trabajador} empresa={empresa} periodo={periodo} editable={!bloqueada} cambiar={(campo, valor) => setValores((actual) => ({ ...actual, [campo]: Number(valor) }))} /></div>
    {montado && createPortal(<div className="honorario-print-root hidden print:block">{hoja}</div>, document.body)}
  </VentanaFlotante>;
}