import { Campo, Input, Select } from "@/components/ui-kit";
import { fecha as fmtFecha, hoy } from "@/lib/format";

export const PLAZOS = [15, 30, 45, 60, 90];

export type Condicion = { condicion_pago: string; dias_credito: string };
export const condicionVacia = (c = "Contado"): Condicion => ({
  condicion_pago: c,
  dias_credito: c === "Crédito" ? "30" : "0",
});

export function calcularVencimiento(fechaBase: string, dias: number) {
  const d = new Date(`${fechaBase || hoy()}T00:00:00`);
  d.setDate(d.getDate() + (dias || 0));
  return d.toISOString().slice(0, 10);
}

/** Campos para compras / gastos / facturas. */
export function datosCondicion(c: Condicion, fechaBase: string) {
  const credito = c.condicion_pago === "Crédito";
  const dias = credito ? Math.max(0, Math.round(Number(c.dias_credito || 0))) : 0;
  return {
    condicion_pago: credito ? "Crédito" : "Contado",
    dias_credito: dias,
    fecha_vencimiento: calcularVencimiento(fechaBase, dias),
  };
}

export function CamposCondicion({
  valor,
  onChange,
  fechaBase,
}: {
  valor: Condicion;
  onChange: (c: Condicion) => void;
  fechaBase: string;
}) {
  const credito = valor.condicion_pago === "Crédito";
  const venc = datosCondicion(valor, fechaBase).fecha_vencimiento;
  return (
    <>
      <Campo etiqueta="Condición de pago">
        <Select value={valor.condicion_pago} onChange={(e) => onChange(condicionVacia(e.target.value))}>
          <option value="Contado">Contado</option>
          <option value="Crédito">Crédito</option>
        </Select>
      </Campo>
      {credito && (
        <Campo etiqueta={`Días de crédito · vence ${fmtFecha(venc)}`}>
          <div className="flex gap-2">
            <Select
              value={PLAZOS.includes(Number(valor.dias_credito)) ? valor.dias_credito : "otro"}
              onChange={(e) => e.target.value !== "otro" && onChange({ ...valor, dias_credito: e.target.value })}
            >
              {PLAZOS.map((p) => (
                <option key={p} value={String(p)}>{p} días</option>
              ))}
              <option value="otro">Otro</option>
            </Select>
            <Input
              type="number"
              min="0"
              step="1"
              className="w-20"
              value={valor.dias_credito}
              onChange={(e) => onChange({ ...valor, dias_credito: e.target.value })}
            />
          </div>
        </Campo>
      )}
    </>
  );
}

/** Insignia: Contado · Pagada / Crédito · vence dd/mm / Vencida. */
export function InsigniaPago({
  condicion,
  vencimiento,
  pagado,
}: {
  condicion?: string | null | undefined;
  vencimiento?: string | null | undefined;
  pagado: boolean;
}) {
  if (condicion !== "Crédito")
    return <span className="rounded bg-good/15 px-1.5 py-0.5 text-[10px] text-good">Contado</span>;
  if (pagado)
    return <span className="rounded bg-good/15 px-1.5 py-0.5 text-[10px] text-good">Crédito · Pagada</span>;
  const vencida = !!vencimiento && vencimiento < hoy();
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] ${vencida ? "bg-bad/15 text-bad" : "bg-accent text-accent-foreground"}`}>
      {vencida ? "Vencida" : "Crédito"} · {fmtFecha(vencimiento ?? null)}
    </span>
  );
}

/** Facturas mayores a este monto (S/) requieren detracción. */
export const UMBRAL_DETRACCION = 700;
export const estadoDetraccion = (montoSoles: number, actual?: string | null) =>
  montoSoles > UMBRAL_DETRACCION ? (actual === "Pagada" ? "Pagada" : "No pagada") : "No aplica";

/** Insignia de detracción: roja y visible mientras no esté pagada. */
export function InsigniaDetraccion({ estado, onClick }: { estado?: string | null | undefined; onClick?: () => void }) {
  if (!estado || estado === "No aplica") return null;
  const pagada = estado === "Pagada";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cambiar estado de la detracción"
      className={`mt-1 inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${pagada ? "bg-good/15 text-good" : "bg-bad text-background"}`}
    >
      Detracción · {pagada ? "Pagada" : "No pagada"}
    </button>
  );
}

/** Campo del formulario: aparece solo si la factura supera el umbral. */
export function CampoDetraccion({ montoSoles, valor, onChange, className = "" }: { montoSoles: number; valor: string; onChange: (v: string) => void; className?: string }) {
  if (montoSoles <= UMBRAL_DETRACCION) return null;
  const pagada = valor === "Pagada";
  return (
    <div className={`rounded-md border px-3 py-2 ${pagada ? "border-line" : "border-bad bg-bad/10"} ${className}`}>
      <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${pagada ? "text-muted-foreground" : "text-bad"}`}>
        Factura mayor a S/ {UMBRAL_DETRACCION} · registra la detracción
      </p>
      <select value={pagada ? "Pagada" : "No pagada"} onChange={(e) => onChange(e.target.value)} className="h-8 w-full rounded border border-line bg-background px-2 text-xs">
        <option value="No pagada">Detracción no pagada</option>
        <option value="Pagada">Detracción pagada</option>
      </select>
    </div>
  );
}
