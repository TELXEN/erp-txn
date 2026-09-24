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
  condicion?: string | null;
  vencimiento?: string | null;
  pagado: boolean;
}) {
  if (condicion !== "Crédito")
    return <span className="rounded bg-good/15 px-1.5 py-0.5 text-[10px] text-good">Contado</span>;
  if (pagado)
    return <span className="rounded bg-good/15 px-1.5 py-0.5 text-[10px] text-good">Crédito · Pagada</span>;
  const vencida = !!vencimiento && vencimiento < hoy();
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] ${vencida ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>
      {vencida ? "Vencida" : "Crédito"} · {fmtFecha(vencimiento ?? null)}
    </span>
  );
}
