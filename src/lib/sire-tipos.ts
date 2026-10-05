export type Libro = "RVIE" | "RCE";
export type Estado = "match" | "discrepancia" | "faltante" | "solo_erp";
export type Item = {
  clave: string; fecha: string; tipo: string; serie_numero: string; ruc: string; razon: string;
  base: number; igv: number; total_sunat: number | null; total_erp: number | null; igv_erp: number | null; estado: Estado;
  vencimiento?: string; no_gravado?: number; isc?: number; otros?: number; moneda?: string; tipo_cambio?: number; raw?: Record<string, string>;
};
export type ItemSunat = { clave: string; fecha: string; vencimiento: string; tipo: string; serie_numero: string; ruc: string; razon: string; base: number; igv: number; no_gravado: number; isc: number; otros: number; total: number; moneda: string; tipo_cambio: number; raw: Record<string, string> };

