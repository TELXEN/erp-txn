import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Printer, Save } from "lucide-react";
import { LogoEmpresa } from "@/components/personal/LogoEmpresa";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import type { Trabajador } from "@/lib/datos";
import { fecha, soles } from "@/lib/format";
import { montoEnLetras } from "@/lib/facturacion";
import { useFuenteDocumento } from "@/lib/fuentes-documentos";
import { DOC } from "@/lib/documento-tema";
import type { ComisionAfp } from "@/lib/decolecta.functions";

export type BoletaNomina = {
  id: string; planilla_id: string; trabajador_id: string; regimen_laboral: string;
  sistema_pensiones: string; dias_laborados: number; sueldo_basico: number;
  asignacion_familiar: number; horas_extra: number; otros_ingresos: number;
  total_ingresos: number; aporte_pension: number; renta_quinta: number; renta_quinta_manual?: boolean;
  otros_descuentos: number; total_descuentos: number; neto_pagar: number;
  essalud: number; estado_pago: string; banco_id: string | null;
  fecha_pago: string | null; numero_operacion: string;
};
export type ValoresNomina = Pick<BoletaNomina, "dias_laborados" | "horas_extra" | "otros_ingresos" | "renta_quinta" | "otros_descuentos">;
type Empresa = { razon_social?: string; ruc?: string; direccion?: string; logo_url?: string; eslogan?: string } | null | undefined;
type Extra = { numero?: string; periodoAfp?: string; comision?: ComisionAfp | undefined; copia?: boolean };

function Dato({ nombre, valor }: { nombre: string; valor?: string | undefined }) {
  return <div className="min-w-0 border-b border-r border-line px-2 py-1"><span className="block text-[7.5px] font-semibold uppercase text-muted-foreground">{nombre}</span><span className="block truncate text-[10px]">{valor || "—"}</span></div>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const ultimoDia = (p: string) => { const [a, m] = p.split("-").map(Number); return new Date(a, m, 0).getDate(); };

function Hoja({ boleta: b, trabajador: t, empresa, periodo, editable, cambiar, numero, periodoAfp, comision, copia }: {
  boleta: BoletaNomina; trabajador?: Trabajador | undefined; empresa: Empresa; periodo: string;
  editable?: boolean; cambiar?: (campo: keyof ValoresNomina, valor: string) => void;
} & Extra) {
  const { fuente } = useFuenteDocumento();
  const fila = (etiqueta: string, importe: number, campo?: keyof ValoresNomina, nota?: string, sub?: boolean) => (
    <div key={etiqueta} className={`grid grid-cols-[minmax(0,1fr)_90px] items-center border-b border-line px-2.5 py-1 text-[10px] ${sub ? "pl-5 text-[9px] text-muted-foreground" : ""}`}>
      <span>{etiqueta}{nota && <span className="ml-1 text-[8px] text-muted-foreground">{nota}</span>}</span>
      {editable && campo && cambiar ? <label className="flex items-center justify-end gap-1 font-semibold"><span>S/</span><input aria-label={etiqueta} type="number" step="0.01" min="0" value={importe} onChange={(e) => cambiar(campo, e.target.value)} className="w-[64px] min-w-0 border-b border-dashed border-primary/40 bg-transparent text-right tabular-nums outline-none focus:border-primary" /></label> : <span className="whitespace-nowrap text-right font-semibold tabular-nums">{soles(importe)}</span>}
    </div>
  );
  const banda = (titulo: string) => <h2 className="px-2 py-1 text-center text-[9px] font-bold uppercase leading-tight text-paper" style={{ background: DOC.dark }}>{titulo}</h2>;
  const pa = periodoAfp ?? "";
  const dias = pa ? ultimoDia(pa) : 30;
  const desde = pa ? `01/${pa.slice(5)}/${pa.slice(0, 4)}` : "";
  const hasta = pa ? `${dias}/${pa.slice(5)}/${pa.slice(0, 4)}` : "";
  const noLab = Math.max(0, 30 - Number(b.dias_laborados));
  // Desglose AFP: se muestra solo si cuadra con el aporte guardado (nunca se reescribe el histórico).
  const rem = Number(b.total_ingresos);
  const partesAfp = comision && b.sistema_pensiones.startsWith("AFP") ? (() => {
    const baseSeg = comision.tope_remuneracion > 0 ? Math.min(rem, comision.tope_remuneracion) : rem;
    const p = [["Aporte obligatorio", r2(rem * comision.aporte_fondo), comision.aporte_fondo], ["Comisión sobre flujo", r2(rem * comision.comision_flujo), comision.comision_flujo], ["Prima de seguro", r2(baseSeg * comision.prima_seguro), comision.prima_seguro]] as const;
    return Math.abs(p.reduce((s, x) => s + x[1], 0) - Number(b.aporte_pension)) <= 0.05 ? p : null;
  })() : null;
  const essaludEt = b.regimen_laboral === "MYPE Micro" ? "SIS" : b.regimen_laboral === "Agrario" ? "EsSalud 6%" : "EsSalud 9%";
  return <article className="honorario-print-sheet relative mx-auto w-[184mm] max-w-full border border-line bg-paper p-5 text-ink shadow-sm" style={{ fontFamily: fuente.css, breakAfter: "page" }}>
    {copia && <span className="absolute right-5 top-1 text-[8px] font-bold uppercase text-muted-foreground">Copia trabajador</span>}
    <header className="mb-3 flex items-stretch justify-between gap-4 border-b-2 pb-3" style={{ borderColor: DOC.dark }}>
      <div className="flex min-w-0 items-center gap-3"><LogoEmpresa empresa={empresa} className="w-[120px]" imgClassName="h-12 w-24 object-contain" iconSize={30} /><div className="min-w-0"><p className="text-sm font-bold uppercase leading-tight">{empresa?.razon_social || "—"}</p><p className="text-[9px]">RUC {empresa?.ruc || "—"}</p><p className="text-[8px] text-muted-foreground">{empresa?.direccion}</p></div></div>
      <div className="w-[190px] shrink-0 border text-center" style={{ borderColor: DOC.dark }}>
        <p className="py-1 text-[11px] font-bold uppercase text-paper" style={{ background: DOC.dark }}>Boleta de pago</p>
        <p className="pt-1 text-[11px] font-bold tabular-nums">N° {numero || "—"}</p>
        <p className="text-[9px]">{periodo}{desde && ` · ${desde} – ${hasta}`}</p>
        <p className="pb-1 text-[9px]">Fecha de pago: {fecha(b.fecha_pago)}</p>
      </div>
    </header>
    <section className="mb-3 border-l border-t border-line">
      {banda("Datos del trabajador")}
      <div className="grid grid-cols-3"><Dato nombre="Apellidos y nombres" valor={t?.nombre} /><Dato nombre="DNI" valor={t?.dni} /><Dato nombre="Cargo" valor={t?.cargo} />
        <Dato nombre="Régimen laboral" valor={b.regimen_laboral} /><Dato nombre="Fecha de ingreso" valor={fecha(t?.fecha_ingreso ?? null)} /><Dato nombre="Sistema de pensiones" valor={b.sistema_pensiones} />
        <Dato nombre="CUSPP" valor={t?.cuspp} /><Dato nombre="Banco" valor={t?.banco} /><Dato nombre="Cuenta de depósito" valor={t?.numero_cuenta} /></div>
      <div className="grid grid-cols-4 bg-muted/25"><Dato nombre="Días laborados" valor={String(b.dias_laborados)} /><Dato nombre="Días no laborados" valor={String(noLab)} /><Dato nombre="Horas extras (S/)" valor={soles(Number(b.horas_extra))} /><Dato nombre="Días de vacaciones" valor="0" /></div>
    </section>
    <div className="grid grid-cols-2 border border-line">
      <section className="border-r border-line">{banda("Ingresos")}{fila("Sueldo básico", b.sueldo_basico, undefined, `(${b.dias_laborados} días)`)}{fila("Asignación familiar", b.asignacion_familiar)}{fila("Horas extras", b.horas_extra)}{fila("Otros ingresos", b.otros_ingresos, "otros_ingresos")}</section>
      <section>{banda("Descuentos")}
        {b.sistema_pensiones === "ONP" ? fila("ONP", b.aporte_pension, undefined, "13%") : partesAfp ? <>{fila(`${b.sistema_pensiones}`, b.aporte_pension)}{partesAfp.map(([e, m, p]) => fila(e, m, undefined, `${(p * 100).toFixed(2)}%`, true))}</> : fila(b.sistema_pensiones && b.sistema_pensiones !== "Ninguno" ? `Aporte previsional (${b.sistema_pensiones})` : "Aporte previsional", b.aporte_pension)}
        {fila("Renta 5ta categoría", b.renta_quinta, "renta_quinta", b.renta_quinta_manual ? "(manual)" : "(proyección anual)")}{fila("Otros descuentos", b.otros_descuentos, "otros_descuentos")}</section>
    </div>
    <div className="mt-2 flex items-center justify-between border border-line bg-muted/25 px-2.5 py-1 text-[9px]"><span><b>Aportes del empleador</b> (no se descuentan del neto): {essaludEt} · base {soles(Math.max(rem, 0))}</span><span className="font-semibold tabular-nums">{soles(b.essalud)}</span></div>
    <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1.2fr] items-center gap-2 text-center">
      <div className="border border-line py-1.5"><p className="text-[8px] uppercase text-muted-foreground">Total ingresos</p><p className="text-sm font-bold tabular-nums">{soles(b.total_ingresos)}</p></div><span className="text-lg">−</span>
      <div className="border border-line py-1.5"><p className="text-[8px] uppercase text-muted-foreground">Total descuentos</p><p className="text-sm font-bold tabular-nums">{soles(b.total_descuentos)}</p></div><span className="text-lg">=</span>
      <div className="border py-1.5 text-paper" style={{ background: DOC.dark, borderColor: DOC.dark }}><p className="text-[8px] uppercase">Neto a pagar</p><p className="text-base font-bold tabular-nums">{soles(b.neto_pagar)}</p></div>
    </div>
    <p className="mt-2 text-[9px] font-semibold">SON: {montoEnLetras(b.neto_pagar, "PEN")}</p>
    <p className="text-[9px] text-muted-foreground">Estado: {b.estado_pago === "Pagado" ? `Pagada${b.numero_operacion ? ` · Operación N° ${b.numero_operacion}` : ""}` : editable ? "Borrador" : "Validada"}</p>
    <div className="mt-12 grid grid-cols-2 gap-16 px-8 text-center text-[9px]">
      <div className="border-t border-line pt-1.5"><b>EMPLEADOR</b><br />{empresa?.razon_social}<br />RUC {empresa?.ruc}</div>
      <div className="border-t border-line pt-1.5"><b>TRABAJADOR</b><br />{t?.nombre}<br />DNI {t?.dni}</div>
    </div>
    <p className="mt-3 flex justify-between text-[8px] text-muted-foreground"><span>D.S. 001-98-TR · D.S. 015-2010-TR</span><span>Emitido: {fecha(new Date().toISOString().slice(0, 10))}</span></p>
  </article>;
}

export function DetallePagoNomina({ boleta, trabajador, empresa, periodo, bloqueada, recalcular, onGuardar, onCerrar, numero, periodoAfp, comisiones }: {
  boleta: BoletaNomina; trabajador?: Trabajador | undefined; empresa: Empresa; periodo: string; bloqueada: boolean;
  recalcular: (valores: ValoresNomina) => Partial<BoletaNomina>;
  onGuardar: (valores: ValoresNomina) => Promise<boolean>; onCerrar: () => void;
  numero?: string; periodoAfp?: string; comisiones?: ComisionAfp[];
}) {
  const [valores, setValores] = useState<ValoresNomina>({ dias_laborados: Number(boleta.dias_laborados), horas_extra: Number(boleta.horas_extra), otros_ingresos: Number(boleta.otros_ingresos), renta_quinta: Number(boleta.renta_quinta), otros_descuentos: Number(boleta.otros_descuentos) });
  const [montado, setMontado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [conCopia, setConCopia] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setMontado(true), []);
  const vista = bloqueada ? boleta : { ...boleta, ...recalcular(valores) };
  const extra: Extra = { numero, periodoAfp, comision: comisiones?.find((c) => c.afp === boleta.sistema_pensiones) };
  const guardar = async () => {
    if (Object.values(valores).some((v) => !Number.isFinite(v) || v < 0) || vista.neto_pagar < 0) return setError("Revisa los importes: el neto no puede ser negativo.");
    setGuardando(true);
    try { if (await onGuardar(valores)) onCerrar(); else setError("No se guardó la boleta. Revisa el mensaje en Nómina."); }
    catch { setError("No se pudo guardar la boleta. Inténtalo nuevamente."); }
    finally { setGuardando(false); }
  };
  const hoja = <><Hoja boleta={vista} trabajador={trabajador} empresa={empresa} periodo={periodo} {...extra} />{conCopia && <Hoja boleta={vista} trabajador={trabajador} empresa={empresa} periodo={periodo} {...extra} copia />}</>;
  return <VentanaFlotante titulo="Detalle de boleta de pago" abierta onCerrar={onCerrar} ancho="max-w-[1100px]" ocultarBarra>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-muted/25 px-4 py-2.5"><span className="text-xs text-muted-foreground">{bloqueada ? <span className="flex items-center gap-1"><Check size={13} /> {boleta.estado_pago === "Pagado" ? "Pagada" : "Validada"}</span> : "Borrador"}</span><div className="flex items-center gap-2"><label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={conCopia} onChange={(e) => setConCopia(e.target.checked)} /> Original + copia del trabajador</label><Boton variante="linea" onClick={() => window.print()}><Printer size={14} /> Imprimir / Guardar PDF</Boton>{!bloqueada && <Boton disabled={guardando} onClick={() => void guardar()}><Save size={14} /> {guardando ? "Guardando…" : "Guardar detalle"}</Boton>}</div></div>
    {error && <p role="alert" className="px-4 py-2 text-xs text-bad">{error}</p>}
    <div className="overflow-auto bg-muted/40 p-4"><Hoja boleta={vista} trabajador={trabajador} empresa={empresa} periodo={periodo} {...extra} editable={!bloqueada} cambiar={(campo, valor) => setValores((actual) => ({ ...actual, [campo]: Number(valor) }))} /></div>
    {montado && createPortal(<div className="honorario-print-root hidden print:block">{hoja}</div>, document.body)}
  </VentanaFlotante>;
}
