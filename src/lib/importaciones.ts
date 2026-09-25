export const TASA_IGV = 0.16;
export const TASA_IPM = 0.02;

export type ParamsLiquidacion = {
  moneda: "USD" | "PEN";
  tipo_cambio: number;
  flete: number;
  seguro: number;
  pct_percepcion: number;
  gastos_locales: number; // PEN
};
export type ItemLiq = { id: string; cantidad: number; precio_fob: number; pct_advalorem: number };

/**
 * Landed cost: flete, seguro y gastos locales se prorratean por valor FOB.
 * Costo = (CIF + Ad-Valorem) × TC + gastos locales. IGV, IPM y percepción
 * son crédito fiscal / pago a cuenta y no forman parte del costo.
 */
export function liquidar(p: ParamsLiquidacion, items: ItemLiq[]) {
  const tc = p.moneda === "PEN" ? 1 : Number(p.tipo_cambio) || 0;
  const fobTotal = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_fob), 0);
  const filas = items.map((i) => {
    const fob = Number(i.cantidad) * Number(i.precio_fob);
    const peso = fobTotal > 0 ? fob / fobTotal : 0;
    const flete = Number(p.flete) * peso;
    const seguro = Number(p.seguro) * peso;
    const cifPen = (fob + flete + seguro) * tc;
    const advalorem = cifPen * (Number(i.pct_advalorem) / 100);
    const igv = (cifPen + advalorem) * TASA_IGV;
    const ipm = (cifPen + advalorem) * TASA_IPM;
    const percepcion = (cifPen + advalorem + igv + ipm) * (Number(p.pct_percepcion) / 100);
    const locales = Number(p.gastos_locales) * peso;
    const costo = cifPen + advalorem + locales;
    return {
      id: i.id, fob, flete, seguro, cifPen, advalorem, igv, ipm, percepcion, locales, costo,
      unitario: Number(i.cantidad) > 0 ? costo / Number(i.cantidad) : 0,
    };
  });
  const suma = (k: keyof (typeof filas)[number]) => filas.reduce((s, f) => s + Number(f[k]), 0);
  return {
    tc, fobTotal, filas,
    cifPen: suma("cifPen"), advalorem: suma("advalorem"), igv: suma("igv"), ipm: suma("ipm"),
    percepcion: suma("percepcion"), locales: suma("locales"), costo: suma("costo"),
    tributosSunat: suma("advalorem") + suma("igv") + suma("ipm") + suma("percepcion"),
  };
}
