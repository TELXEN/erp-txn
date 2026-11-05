import { cuentasDelComprobante, esDetraccion, prefijoNumeroCuenta, tituloCuenta, type CuentaCpe } from "@/lib/cuentas-comprobante";

export {
  cuentaDetraccionDe,
  cuentasDelComprobante,
  esDetraccion,
  esDolar,
  nombreBanco,
  ordenarCuentas,
  prefijoNumeroCuenta,
  tituloCuenta,
  type CuentaCpe,
} from "@/lib/cuentas-comprobante";

/** Detalle de una cuenta: rótulo en negrita, su segunda línea si la tiene, y CTA:/CCI: en la misma fila. */
export function LineasCuenta({ c, compacto }: { c: CuentaCpe; compacto: boolean }) {
  return (
    <div style={{ lineHeight: compacto ? 1.12 : 1.25, minWidth: 0, overflowWrap: "anywhere" }}>
      <div style={{ fontWeight: 700 }}>{tituloCuenta(c)}</div>
      <div style={{ display: "flex", gap: compacto ? 8 : 14, flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ minWidth: 0 }}>{prefijoNumeroCuenta(c)}{c.numero_cuenta}</span>
        {c.cci ? <span style={{ minWidth: 0 }}>CCI: {c.cci}</span> : null}
      </div>
    </div>
  );
}

/** Bloque bancario de la hoja: una columna por cuenta (soles, dólares, detracciones). */
export function CuentasComprobante({ cuentas, tipo = "todas", compacto = false }: { cuentas: CuentaCpe[]; tipo?: "todas" | "normales" | "detraccion"; compacto?: boolean }) {
  const visibles = cuentasDelComprobante(cuentas).filter((cuenta) => tipo === "todas" || (tipo === "detraccion" ? esDetraccion(cuenta) : !esDetraccion(cuenta)));
  if (!visibles.length) return null;
  const titulo = tipo === "detraccion" ? "CUENTA DE DETRACCIONES" : "CUENTAS BANCARIAS";
  return (
    <div style={{ marginTop: compacto ? 6 : 14, borderTop: "1px solid #E5E7EB", paddingTop: compacto ? 4 : 7, fontFamily: "var(--font-global)", fontWeight: 400, fontSize: compacto ? 10 : 11, color: "#374151", minWidth: 0, textAlign: "left" }}>
      <span style={{ fontFamily: "var(--font-global)", fontWeight: 700, fontSize: compacto ? 10 : 11, letterSpacing: 0 }}>{titulo}</span>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibles.length}, 1fr)`, columnGap: 14, marginTop: compacto ? 2 : 4 }}>
        {visibles.map((cuenta, i) => <div key={i} style={{ minWidth: 0 }}><LineasCuenta c={cuenta} compacto={compacto} /></div>)}
      </div>
    </div>
  );
}
