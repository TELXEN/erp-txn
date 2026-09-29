export type CuentaCpe = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

export const esDetraccion = (c: CuentaCpe) => /detrac/i.test(c.tipo_cuenta) || /detrac/i.test(c.nombre);
export const cuentaDetraccionDe = (cuentas: CuentaCpe[]) => cuentas.find(esDetraccion) ?? null;
/** Todas las cuentas; la de detracciones al final. */
export const ordenarCuentas = (cuentas: CuentaCpe[]) => [...cuentas.filter((c) => !esDetraccion(c)), ...cuentas.filter(esDetraccion)];

/** Pie con todas las cuentas bancarias registradas (formato hoja A4). */
export function CuentasComprobante({ cuentas }: { cuentas: CuentaCpe[] }) {
  if (!cuentas.length) return null;
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #cbd5e1", paddingTop: 8, fontSize: 8.5, color: "#334155" }}>
      <b style={{ fontSize: 8, color: "#065f46", letterSpacing: 0.6 }}>CUENTAS BANCARIAS</b>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 2, marginTop: 4, textTransform: "uppercase" }}>
        {ordenarCuentas(cuentas).map((c, i) => (
          <div key={i} style={{ lineHeight: 1.3 }}>
            <b>{c.nombre}</b> · {esDetraccion(c) ? "CUENTA DE DETRACCIONES" : `${c.tipo_cuenta} ${c.monedas}`} · N° {c.numero_cuenta}
            {!esDetraccion(c) && c.cci ? ` · CCI ${c.cci}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
