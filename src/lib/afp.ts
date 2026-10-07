import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obtenerComisionesAfp, type ComisionAfp, type ResultadoComisionesAfp } from "@/lib/decolecta.functions";

/** Tasas de respaldo si nunca se pudo consultar Decolecta. */
export const AFP_RESPALDO: ComisionAfp[] = [
  { afp: "AFP Integra", aporte_fondo: 0.1, prima_seguro: 0.0137, comision_flujo: 0.0155, tope_remuneracion: 0 },
  { afp: "AFP Prima", aporte_fondo: 0.1, prima_seguro: 0.0137, comision_flujo: 0.016, tope_remuneracion: 0 },
  { afp: "AFP Profuturo", aporte_fondo: 0.1, prima_seguro: 0.0137, comision_flujo: 0.0169, tope_remuneracion: 0 },
  { afp: "AFP Habitat", aporte_fondo: 0.1, prima_seguro: 0.0137, comision_flujo: 0.0147, tope_remuneracion: 0 },
];

/** Comisiones AFP del período (YYYY-MM); una consulta a Decolecta por mes, compartida por todo el ERP. */
export function useComisionesAfp(periodo: string) {
  const fn = useServerFn(obtenerComisionesAfp);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["afp-comisiones", periodo],
    staleTime: Infinity,
    queryFn: () => fn({ data: { periodo } }),
  });
  const actualizar = async () => {
    const r = await fn({ data: { periodo, forzar: true } });
    qc.setQueryData<ResultadoComisionesAfp>(["afp-comisiones", periodo], r);
    return r;
  };
  const comisiones = q.data?.comisiones.length ? q.data.comisiones : AFP_RESPALDO;
  return { ...q, comisiones, origen: q.data?.comisiones.length ? q.data.origen : "respaldo", actualizar };
}

/** Descuento AFP: fondo + comisión sobre toda la remuneración; prima de seguro hasta el tope asegurable. */
export function aporteAfp(c: ComisionAfp | undefined, remuneracion: number) {
  if (!c) return 0;
  const baseSeguro = c.tope_remuneracion > 0 ? Math.min(remuneracion, c.tope_remuneracion) : remuneracion;
  return remuneracion * (c.aporte_fondo + c.comision_flujo) + baseSeguro * c.prima_seguro;
}
