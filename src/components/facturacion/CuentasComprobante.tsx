export type CuentaCpe = { nombre: string; numero_cuenta: string; cci: string; monedas: string; tipo_cuenta: string };

export const esDetraccion = (c: CuentaCpe) => /detrac/i.test(c.tipo_cuenta) || /detrac/i.test(c.nombre);
export const cuentaDetraccionDe = (cuentas: CuentaCpe[]) => cuentas.find(esDetraccion) ?? null;
/** Todas las cuentas; la de detracciones al final. */
export const ordenarCuentas = (cuentas: CuentaCpe[]) => [...cuentas.filter((c) => !esDetraccion(c)), ...cuentas.filter(esDetraccion)];

/** Agrupa las cuentas por banco, conservando el orden (detracciones al final). */
export function agruparPorBanco(cuentas: CuentaCpe[]) {
  const grupos: { banco: string; cuentas: CuentaCpe[] }[] = [];
  for (const c of ordenarCuentas(cuentas)) {
    const banco = (c.nombre || "SIN BANCO").toUpperCase();
    const g = grupos.find((x) => x.banco === banco);
    if (g) g.cuentas.push(c); else grupos.push({ banco, cuentas: [c] });
  }
  return grupos;
}

export const detalleCuenta = (c: CuentaCpe) =>
  `${esDetraccion(c) ? "CUENTA DE DETRACCIONES" : `${c.tipo_cuenta} ${c.monedas}`} · N° ${c.numero_cuenta}${!esDetraccion(c) && c.cci ? ` · CCI ${c.cci}` : ""}`.toUpperCase();

/** Pie con todas las cuentas bancarias registradas, agrupadas por banco. */
export function CuentasComprobante({ cuentas }: { cuentas: CuentaCpe[] }) {
  if (!cuentas.length) return null;
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #cbd5e1", paddingTop: 7, fontFamily: "var(--font-global)", fontWeight: 400, fontSize: 9, color: "#000000" }}>
      <span style={{ fontFamily: "var(--font-global)", fontWeight: 300, fontSize: 9, letterSpacing: 0.5 }}>CUENTAS BANCARIAS</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 14, rowGap: 4, marginTop: 4 }}>
        {agruparPorBanco(cuentas).map((g, i) => (
          <div key={i} style={{ lineHeight: 1.25 }}>
            <b style={{ fontWeight: 700 }}>{g.banco}</b>
            {g.cuentas.map((c, j) => <div key={j}>{detalleCuenta(c)}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
