import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { costoPersonalPorProyecto, type DocPersonal } from "@/lib/pagos-rrhh";
import {
  clasificacionDeCargo,
  leerTodo,
  useCargos,
  useGastosDirectos,
  useGastosGenerales,
  useTareos,
  useTrabajadores,
} from "@/lib/datos";
import { useTareoVehiculos } from "@/lib/vehiculos";

export type CostoObra = {
  materiales: number;
  subcontratos: number;
  equipos: number; // incluye flota propia (tareo vehicular)
  servicios: number;
  herramientas: number; // herramientas manuales compradas
  mod: number;
  honorarios: number;
  staff: number;
  generales: number;
  costoDirectoReal: number;
  ggReal: number;
  costoReal: number;
};

const VACIO: CostoObra = {
  materiales: 0, subcontratos: 0, equipos: 0, servicios: 0, herramientas: 0, mod: 0, honorarios: 0,
  staff: 0, generales: 0, costoDirectoReal: 0, ggReal: 0, costoReal: 0,
};

type Recibo = { trabajador_id: string; proyecto_id: string | null; mes: number; anio: number; monto_bruto: number };
type BoletaNom = { trabajador_id: string; total_ingresos: number; essalud: number; planillas: { anio: number; mes: number } | null };

export const useRecibosCosto = () =>
  useQuery({
    queryKey: ["recibos_honorarios"],
    queryFn: () =>
      leerTodo<Recibo>(() =>
        supabase.from("recibos_honorarios").select("trabajador_id,proyecto_id,mes,anio,monto_bruto").order("id"),
      ),
  });

export const useBoletasCosto = () =>
  useQuery({
    queryKey: ["boletas_dashboard"],
    queryFn: () =>
      leerTodo<BoletaNom>(() =>
        supabase.from("boletas").select("trabajador_id,total_ingresos,essalud,planillas(anio,mes)").order("id"),
      ),
  });

/**
 * Costo real único por obra: compras + gastos generales + flota + personal
 * (boletas/recibos repartidos por tareo; estimado con tareo si aún no hay documento).
 * Todos los paneles deben leer de aquí.
 */
export function useCostoObras() {
  const { data: gastosD = [] } = useGastosDirectos();
  const { data: gastosG = [] } = useGastosGenerales();
  const { data: tareos = [] } = useTareos();
  const { data: tareoVeh = [] } = useTareoVehiculos();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: cargos = [] } = useCargos();
  const { data: recibos = [] } = useRecibosCosto();
  const { data: boletas = [] } = useBoletasCosto();

  const personal = useMemo(() => {
    const clasif = new Map<string, string>();
    trabajadores.forEach((t) => clasif.set(t.id, clasificacionDeCargo(t.cargo ?? "", cargos)));
    const docs: DocPersonal[] = [
      ...boletas.filter((b) => b.planillas).map((b) => ({
        trabajador_id: b.trabajador_id, anio: b.planillas!.anio, mes: b.planillas!.mes,
        monto: Number(b.total_ingresos) + Number(b.essalud), tipo: "boleta" as const,
      })),
      ...recibos.filter((r) => r.mes && r.anio).map((r) => ({
        trabajador_id: r.trabajador_id, anio: r.anio, mes: r.mes,
        monto: Number(r.monto_bruto), tipo: "honorario" as const, proyecto_id: r.proyecto_id,
      })),
    ];
    return costoPersonalPorProyecto(docs, tareos, (id) => clasif.get(id) === "Indirecto");
  }, [boletas, recibos, tareos, trabajadores, cargos]);

  const porProyecto = useMemo(() => {
    const m = new Map<string, CostoObra>();
    const get = (id: string) => {
      let c = m.get(id);
      if (!c) { c = { ...VACIO }; m.set(id, c); }
      return c;
    };
    gastosD.forEach((g) => {
      const c = get(g.proyecto_id);
      const v = Number(g.monto_soles);
      const r = g.rubro ?? "Materiales";
      if (r === "Subcontratos") c.subcontratos += v;
      else if (r === "Equipos") c.equipos += v;
      else if (r === "Servicios") c.servicios += v;
      else if (r === "Herramientas manuales") c.herramientas += v;
      else c.materiales += v;
    });
    tareoVeh.forEach((t: { proyecto_id: string; costo_soles: number }) => { get(t.proyecto_id).equipos += Number(t.costo_soles); });
    gastosG.forEach((g) => { if (g.proyecto_id) get(g.proyecto_id).generales += Number(g.monto_soles); });
    personal.porProyecto.forEach((p, id) => {
      const c = get(id);
      c.mod += p.mod; c.honorarios += p.honorarios; c.staff += p.staff;
    });
    m.forEach((c) => {
      c.costoDirectoReal = c.materiales + c.subcontratos + c.equipos + c.servicios + c.herramientas + c.mod + c.honorarios;
      c.ggReal = c.generales + c.staff;
      c.costoReal = c.costoDirectoReal + c.ggReal;
    });
    return m;
  }, [gastosD, gastosG, tareoVeh, personal]);

  const costoDe = (id: string): CostoObra => porProyecto.get(id) ?? VACIO;
  return { porProyecto, costoDe, personal };
}
