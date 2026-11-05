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

const grupoMoneda = (moneda: string) => /USD|D[ÓO]LAR/i.test(moneda) ? "DÓLARES" : "SOLES";
export const esDolar = (c: CuentaCpe) => /USD|D[ÓO]LAR/i.test(c.monedas);
/** Cuentas que se imprimen en el comprobante: las de soles y la de detracciones; las de dólares no se listan. */
export const cuentasDelComprobante = (cuentas: CuentaCpe[]) => cuentas.filter((c) => esDetraccion(c) || !esDolar(c));

/** Título de la cuenta: «AHORRO EN SOLES», «CUENTA CORRIENTE EN DÓLARES» o «CUENTA DE DETRACCIONES». */
export const tituloCuenta = (c: CuentaCpe) => {
  if (esDetraccion(c)) return "CUENTA DE DETRACCIONES";
  const tipo = /^AHORROS?$/i.test((c.tipo_cuenta || "").trim()) ? "AHORRO" : (c.tipo_cuenta || "CUENTA").toUpperCase();
  return `${tipo} EN ${grupoMoneda(c.monedas)}`;
};

/** Detalle de una cuenta: título arriba y, en la misma fila, CTA: y CCI:. */
export function LineasCuenta({ c, compacto }: { c: CuentaCpe; compacto: boolean }) {
  return (
    <div style={{ lineHeight: compacto ? 1.12 : 1.25, minWidth: 0, overflowWrap: "anywhere" }}>
      <div style={{ fontWeight: 700 }}>{tituloCuenta(c)}</div>
      <div style={{ display: "flex", gap: compacto ? 8 : 14, flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ minWidth: 0 }}>CTA: {c.numero_cuenta}</span>
        {c.cci ? <span style={{ minWidth: 0 }}>CCI: {c.cci}</span> : null}
      </div>
    </div>
  );
}

/** Bloque bancario reutilizable para pago general o detracciones. */
export function CuentasComprobante({ cuentas, tipo = "todas", compacto = false }: { cuentas: CuentaCpe[]; tipo?: "todas" | "normales" | "detraccion"; compacto?: boolean }) {
  const visibles = cuentasDelComprobante(cuentas).filter((cuenta) => tipo === "todas" || (tipo === "detraccion" ? esDetraccion(cuenta) : !esDetraccion(cuenta)));
  if (!visibles.length) return null;
  const titulo = tipo === "detraccion" ? "CUENTA DE DETRACCIONES" : "CUENTAS BANCARIAS";
  const gruposMoneda = tipo === "detraccion" ? [] : (["SOLES", "DETRACCIONES"] as const)
    .map((moneda) => ({ moneda, cuentas: visibles.filter((cuenta) => moneda === "DETRACCIONES" ? esDetraccion(cuenta) : !esDetraccion(cuenta) && grupoMoneda(cuenta.monedas) === moneda) }))
    .filter((grupo) => grupo.cuentas.length > 0);
  return (
    <div style={{ marginTop: compacto ? 6 : 14, borderTop: "1px solid #E5E7EB", paddingTop: compacto ? 4 : 7, fontFamily: "var(--font-global)", fontWeight: 400, fontSize: compacto ? 9 : 11, color: "#374151", minWidth: 0, textAlign: "left" }}>
      <span style={{ fontFamily: "var(--font-global)", fontWeight: 700, fontSize: compacto ? 9 : 11, letterSpacing: 0 }}>{titulo}</span>
      {tipo === "detraccion" ? <div style={{ marginTop: compacto ? 2 : 4 }}>{agruparPorBanco(visibles).map((g, i) => <div key={i} style={{ minWidth: 0 }}><b style={{ fontWeight: 700 }}>{g.banco}</b>{g.cuentas.map((c, j) => <LineasCuenta key={j} c={c} compacto={compacto} />)}</div>)}</div> :
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(gruposMoneda.length, 1)}, 1fr)`, columnGap: 14, rowGap: compacto ? 3 : 6, marginTop: compacto ? 2 : 4 }}>
          {gruposMoneda.map((grupo) => <div key={grupo.moneda} style={{ minWidth: 0 }}><div style={{ fontWeight: 700, marginBottom: 2 }}>{grupo.moneda}</div>{agruparPorBanco(grupo.cuentas).map((g, i) => <div key={i} style={{ minWidth: 0, marginBottom: compacto ? 2 : 4 }}><b style={{ fontWeight: 700 }}>{g.banco}</b>{g.cuentas.map((c, j) => <div key={j} style={{ marginTop: j ? 3 : 0 }}><LineasCuenta c={c} compacto={compacto} /></div>)}</div>)}</div>)}
        </div>}
    </div>
  );
}
