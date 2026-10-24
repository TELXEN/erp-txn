import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, FileSpreadsheet, Printer, X } from "lucide-react";
import { Boton } from "@/components/ui-kit";
import { useTerceros, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { fecha as fmtFecha, hoy } from "@/lib/format";
import {
  conceptoPago,
  cuentaSugerida,
  sinCuenta,
  totalesPorMoneda,
  useCuentasTerceros,
  type CuentaDestino,
  type FilaReporte,
} from "@/lib/reporte-pagos";

export type DeudaReporte = {
  clave: string;
  tercero: string;
  terceroId?: string | null;
  trabajadorId?: string | null;
  documento: string;
  obra: string;
  descripcion: string;
  moneda: string;
  monto: number;
  esDet?: boolean;
};

const fmt = (n: number, m: string) =>
  `${m === "USD" ? "$" : "S/"} ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const textoCuenta = (c: CuentaDestino | null) =>
  c ? [c.numero_cuenta, c.cci ? `CCI ${c.cci}` : ""].filter(Boolean).join(" · ") : "";

/** Reporte de pagos (solo lista para pagar; no registra pagos). */
export function ReportePagos({ deudas, onCerrar }: { deudas: DeudaReporte[]; onCerrar: () => void }) {
  const { data: terceros = [] } = useTerceros();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: cuentasT = [] } = useCuentasTerceros();

  const inicial = useMemo<FilaReporte[]>(
    () =>
      deudas.map((d) => {
        const t = d.terceroId ? terceros.find((x) => x.id === d.terceroId) : null;
        const w = d.trabajadorId ? (trabajadores as unknown as Record<string, string>[]).find((x) => x["id"] === d.trabajadorId) : null;
        const cuentas: (CuentaDestino & { es_principal?: boolean; es_detraccion?: boolean })[] = t
          ? cuentasT.filter((c) => c.tercero_id === t.id)
          : w && (w["numero_cuenta"] || w["cci"])
            ? [{ banco: w["banco"] ?? "", numero_cuenta: w["numero_cuenta"] ?? "", cci: w["cci"] ?? "", es_principal: true }]
            : [];
        return {
          clave: d.clave,
          beneficiario: d.tercero,
          documentoIdentidad: (t as { numero_documento?: string } | null)?.numero_documento ?? w?.["dni"] ?? "",
          moneda: d.moneda,
          monto: Number(d.monto) || 0,
          concepto: conceptoPago(d.documento, d.obra, d.descripcion),
          cuentas,
          cuenta: cuentaSugerida(cuentas, d.esDet ? "PEN" : d.moneda, d.esDet),
        };
      }),
    [deudas, terceros, trabajadores, cuentasT],
  );
  const [cambios, setCambios] = useState<Record<string, Partial<FilaReporte>>>({});
  const filas = inicial.map((f) => ({ ...f, ...cambios[f.clave] }));
  const editar = (clave: string, c: Partial<FilaReporte>) => setCambios((p) => ({ ...p, [clave]: { ...p[clave], ...c } }));
  const totales = totalesPorMoneda(filas);
  const faltan = filas.filter(sinCuenta).length;

  const filasPlanas = filas.map((f, i) => ({
    "N°": i + 1,
    Beneficiario: f.beneficiario,
    "RUC/DNI": f.documentoIdentidad,
    Moneda: f.moneda === "USD" ? "USD" : "PEN",
    "Monto a pagar": Number(f.monto.toFixed(2)),
    Concepto: f.concepto,
    Banco: f.cuenta?.banco ?? "",
    "N° cuenta": f.cuenta?.numero_cuenta ?? "",
    CCI: f.cuenta?.cci ?? "",
  }));

  function imprimir() {
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;
    const fuente = getComputedStyle(document.body).fontFamily;
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    w.document.write(`<!doctype html><html><head><title>Reporte de pagos ${hoy()}</title><style>
      @page{size:A4 landscape;margin:12mm} body{font-family:${fuente};font-size:10px;color:#1e293b}
      h1{font-size:14px;margin:0 0 2px} table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#e2e8f0;text-align:left;font-size:9px;text-transform:uppercase} th,td{border:1px solid #cbd5e1;padding:4px}
      .r{text-align:right;white-space:nowrap} .t{font-weight:700;background:#f1f5f9} .bad{color:#b91c1c}
    </style></head><body><h1>Reporte de pagos — cuentas por pagar</h1><div>Fecha: ${fmtFecha(hoy())} · ${filas.length} pago(s)</div>
    <table><thead><tr><th>N°</th><th>Beneficiario</th><th>RUC/DNI</th><th>Moneda</th><th class="r">Monto a pagar</th><th>Concepto</th><th>Banco</th><th>N° cuenta / CCI</th></tr></thead><tbody>
    ${filas.map((f, i) => `<tr><td>${i + 1}</td><td>${esc(f.beneficiario)}</td><td>${esc(f.documentoIdentidad)}</td><td>${f.moneda === "USD" ? "USD" : "PEN"}</td><td class="r">${fmt(f.monto, f.moneda)}</td><td>${esc(f.concepto)}</td><td>${esc(f.cuenta?.banco)}</td><td>${sinCuenta(f) ? '<span class="bad">Sin cuenta</span>' : esc(textoCuenta(f.cuenta))}</td></tr>`).join("")}
    <tr class="t"><td colspan="4">Total en Soles</td><td class="r">${fmt(totales.PEN, "PEN")}</td><td colspan="3"></td></tr>
    <tr class="t"><td colspan="4">Total en Dólares</td><td class="r">${fmt(totales.USD, "USD")}</td><td colspan="3"></td></tr>
    </tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  async function copiar() {
    const cab = Object.keys(filasPlanas[0] ?? {}).join("\t");
    await navigator.clipboard.writeText([cab, ...filasPlanas.map((f) => Object.values(f).join("\t"))].join("\n"));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="my-8 w-full max-w-7xl rounded-lg border border-line bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Reporte de pagos ({filas.length})</h2>
            <p className="text-[11px] text-muted-foreground">Lista para pagar: no registra ningún pago. Concepto y monto se pueden ajustar antes de imprimir.</p>
          </div>
          <div className="flex items-center gap-2">
            <Boton variante="linea" onClick={imprimir}><Printer size={13} /> Imprimir / PDF</Boton>
            <Boton variante="linea" onClick={() => void exportarExcel(`reporte-pagos-${hoy()}`, [{ nombre: "Pagos", filas: filasPlanas }])}><FileSpreadsheet size={13} /> Excel</Boton>
            <Boton variante="linea" onClick={() => void copiar()}><Copy size={13} /> Copiar</Boton>
            <button type="button" onClick={onCerrar} className="rounded-md p-1 text-muted-foreground hover:bg-muted" title="Cerrar"><X size={16} /></button>
          </div>
        </div>
        {faltan > 0 && (
          <p className="mb-2 rounded border border-bad/40 bg-bad/5 px-3 py-1.5 text-xs text-bad">
            {faltan} beneficiario(s) sin cuenta registrada. Regístrala en <Link to="/proveedores" className="underline">Proveedores</Link> (ficha › Cuentas bancarias) o en Personal.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-2 py-2">N°</th><th className="px-2 py-2">Beneficiario</th><th className="px-2 py-2">RUC/DNI</th><th className="px-2 py-2">Moneda</th>
                <th className="px-2 py-2 text-right">Monto a pagar</th><th className="px-2 py-2">Concepto</th><th className="px-2 py-2">Banco</th><th className="px-2 py-2">N° cuenta / CCI</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const original = inicial[i]!.monto;
                const falta = sinCuenta(f);
                return (
                  <tr key={f.clave} className={`border-b border-line/60 ${falta ? "bg-bad/5" : ""}`}>
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5 text-ink">{f.beneficiario}</td>
                    <td className="px-2 py-1.5 font-mono">{f.documentoIdentidad || "—"}</td>
                    <td className="px-2 py-1.5">{f.moneda === "USD" ? "USD" : "PEN"}</td>
                    <td className="px-2 py-1.5 text-right">
                      <input type="number" step="0.01" min={0} max={original} className="h-7 w-28 rounded border border-line bg-background px-1.5 text-right tabular-nums"
                        value={f.monto} onChange={(e) => editar(f.clave, { monto: Math.min(Math.max(Number(e.target.value) || 0, 0), original) })} />
                    </td>
                    <td className="px-2 py-1.5"><input className="h-7 w-full min-w-56 rounded border border-line bg-background px-1.5" value={f.concepto} onChange={(e) => editar(f.clave, { concepto: e.target.value })} /></td>
                    <td className="px-2 py-1.5">
                      {f.cuentas.length > 1 ? (
                        <select className="h-7 rounded border border-line bg-background px-1" value={f.cuentas.indexOf(f.cuenta as never)} onChange={(e) => editar(f.clave, { cuenta: f.cuentas[Number(e.target.value)] ?? null })}>
                          {f.cuentas.map((c, k) => <option key={k} value={k}>{c.banco} {c.moneda === "USD" ? "$" : c.moneda ? "S/" : ""}</option>)}
                        </select>
                      ) : (f.cuenta?.banco || "—")}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{falta ? <span className="font-sans font-semibold text-bad">Sin cuenta</span> : textoCuenta(f.cuenta)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-line font-semibold"><td colSpan={4} className="px-2 py-1.5">Total en Soles</td><td className="px-2 py-1.5 text-right text-moneda-pen">{fmt(totales.PEN, "PEN")}</td><td colSpan={3} /></tr>
              <tr className="font-semibold"><td colSpan={4} className="px-2 py-1.5">Total en Dólares</td><td className="px-2 py-1.5 text-right text-moneda-usd">{fmt(totales.USD, "USD")}</td><td colSpan={3} /></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
