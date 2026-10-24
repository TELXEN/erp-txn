import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CuentaTercero = {
  id: string;
  tercero_id: string;
  banco: string;
  moneda: "PEN" | "USD";
  numero_cuenta: string;
  cci: string;
  es_principal: boolean;
  es_detraccion: boolean;
  activo: boolean;
};

/** Cuenta destino de un pago: banco, número y CCI (sin importar el origen). */
export type CuentaDestino = { banco: string; numero_cuenta: string; cci: string; moneda?: string };

export type FilaReporte = {
  clave: string;
  beneficiario: string;
  documentoIdentidad: string;
  moneda: string;
  monto: number;
  concepto: string;
  cuentas: CuentaDestino[];
  cuenta: CuentaDestino | null;
};

export const useCuentasTerceros = () =>
  useQuery({
    queryKey: ["terceros_cuentas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terceros_cuentas_bancarias" as never)
        .select("*")
        .eq("activo", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CuentaTercero[];
    },
  });

/**
 * Cuenta sugerida para pagar en `moneda`: la principal de esa moneda, luego cualquiera de esa
 * moneda; para detracciones, la cuenta de detracción. Sin coincidencia devuelve null.
 */
export function cuentaSugerida(
  cuentas: (CuentaDestino & { es_principal?: boolean; es_detraccion?: boolean })[],
  moneda: string,
  detraccion = false,
): CuentaDestino | null {
  if (detraccion) return cuentas.find((c) => c.es_detraccion) ?? null;
  const misma = cuentas.filter((c) => !c.es_detraccion && (!c.moneda || c.moneda === moneda));
  return misma.find((c) => c.es_principal) ?? misma[0] ?? null;
}

/** Concepto automático: documento – obra (sin obra si es Oficina). */
export function conceptoPago(documento: string, obra: string, descripcion = "") {
  const doc = documento && documento !== "—" ? documento : descripcion;
  const o = obra && obra !== "Oficina" && obra !== "—" ? obra : "";
  return [doc, o].filter(Boolean).join(" – ");
}

/** Totales del reporte por moneda, sin conversión. */
export function totalesPorMoneda(filas: Pick<FilaReporte, "moneda" | "monto">[]) {
  return filas.reduce(
    (t, f) => {
      if (f.moneda === "USD") t.USD += Number(f.monto) || 0;
      else t.PEN += Number(f.monto) || 0;
      return t;
    },
    { PEN: 0, USD: 0 },
  );
}

export const sinCuenta = (f: Pick<FilaReporte, "cuenta">) =>
  !f.cuenta || (!f.cuenta.numero_cuenta && !f.cuenta.cci);
