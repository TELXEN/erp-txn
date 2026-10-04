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
  `${esDetraccion(c) ? "CUENTA DE DETRACCIONES" : `${c.tipo_cuenta} ${c.monedas}`} · N° ${c.numero_cuenta}`.toUpperCase();

const grupoMoneda = (moneda: string) => /USD|D[ÓO]LAR/i.test(moneda) ? "DÓLARES" : "SOLES";

/** Bloque bancario reutilizable para pago general o detracciones. */
export function CuentasComprobante({ cuentas, tipo = "todas", compacto = false }: { cuentas: CuentaCpe[]; tipo?: "todas" | "normales" | "detraccion"; compacto?: boolean }) {
  const visibles = cuentas.filter((cuenta) => tipo === "todas" || (tipo === "detraccion" ? esDetraccion(cuenta) : !esDetraccion(cuenta)));
  if (!visibles.length) return null;
  const titulo = tipo === "detraccion" ? "CUENTA DE DETRACCIONES" : "CUENTAS BANCARIAS";
  const gruposMoneda = tipo === "detraccion" ? [] : (["SOLES", "DÓLARES"] as const)
    .map((moneda) => ({ moneda, cuentas: visibles.filter((cuenta) => grupoMoneda(cuenta.monedas) === moneda) }))
    .filter((grupo) => grupo.cuentas.length > 0);
  return (
    <div style={{ marginTop: compacto ? 6 : 14, borderTop: "1px solid #cbd5e1", paddingTop: compacto ? 4 : 7, fontFamily: "var(--font-global)", fontWeight: 400, fontSize: compacto ? 8 : 10, color: "#0f172a", minWidth: 0, textAlign: "left" }}>
      <span style={{ fontFamily: "var(--font-global)", fontWeight: 700, fontSize: compacto ? 8 : 10, letterSpacing: 0 }}>{titulo}</span>
      {tipo === "detraccion" ? <div style={{ marginTop: compacto ? 2 : 4 }}>{agruparPorBanco(visibles).map((g, i) => <div key={i} style={{ lineHeight: compacto ? 1.12 : 1.25, minWidth: 0, overflowWrap: "anywhere" }}><b style={{ fontWeight: 700 }}>{g.banco}</b>{g.cuentas.map((c, j) => <div key={j}>N° {c.numero_cuenta}</div>)}</div>)}</div> :
        <div style={{ display: "grid", gridTemplateColumns: gruposMoneda.length > 1 ? "1fr 1fr" : "1fr", columnGap: 14, rowGap: compacto ? 3 : 6, marginTop: compacto ? 2 : 4 }}>
          {gruposMoneda.map((grupo) => <div key={grupo.moneda} style={{ minWidth: 0 }}><div style={{ fontWeight: 700, marginBottom: 2 }}>{grupo.moneda}</div>{agruparPorBanco(grupo.cuentas).map((g, i) => <div key={i} style={{ lineHeight: compacto ? 1.12 : 1.25, minWidth: 0, overflowWrap: "anywhere", marginBottom: compacto ? 2 : 4 }}><b style={{ fontWeight: 700 }}>{g.banco}</b>{g.cuentas.map((c, j) => <div key={j}><div>{detalleCuenta(c)}</div>{c.cci ? <div>CCI {c.cci}</div> : null}</div>)}</div>)}</div>)}
        </div>}
    </div>
  );
}
