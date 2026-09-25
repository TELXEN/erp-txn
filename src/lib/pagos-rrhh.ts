import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MESES } from "@/lib/format";

/** Pagos de Recursos Humanos y obligaciones con el Estado, para Tesorería y Flujo de Caja. */

type Fila = Record<string, unknown>;

async function todo(tabla: string, columnas = "*") {
  const { data, error } = await supabase.from(tabla as never).select(columnas);
  if (error) throw error;
  return (data ?? []) as unknown as Fila[];
}

export type DocRRHH = {
  id: string; // id del registro, planilla o clave de obligación
  tabla: "recibos_honorarios" | "boletas" | "beneficios_sociales" | "pagos_estado";
  tercero: string;
  documento: string;
  obra: string;
  detalle: string;
  descripcion: string;
  emision: string;
  vencimiento: string | null;
  monto: number;
  extra?: { anio: number; mes: number; concepto: string };
};

export type EgresoRRHH = { banco_id: string | null; fecha_pago: string | null; monto: number };

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => (v == null ? "" : String(v));
const pad = (x: number) => String(x).padStart(2, "0");
/** Día 15 del mes siguiente (cronograma SUNAT aproximado). */
const venceEstado = (anio: number, mes: number) => (mes === 12 ? `${anio + 1}-01-15` : `${anio}-${pad(mes + 1)}-15`);
const finMes = (anio: number, mes: number) => {
  const d = new Date(Date.UTC(anio, mes, 0));
  return d.toISOString().slice(0, 10);
};

export function usePagosRRHH() {
  return useQuery({
    queryKey: ["pagos_rrhh"],
    queryFn: async () => {
      const [recibos, boletas, planillas, beneficios, trabajadores, pagosEstado, proyectos] = await Promise.all([
        todo("recibos_honorarios"),
        todo("boletas"),
        todo("planillas"),
        todo("beneficios_sociales"),
        todo("trabajadores", "id,nombre"),
        todo("pagos_estado"),
        todo("proyectos", "id,nombre"),
      ]);
      const nombre = (id: unknown) => s(trabajadores.find((t) => t.id === id)?.nombre) || "—";
      const obra = (id: unknown) => (id ? s(proyectos.find((p) => p.id === id)?.nombre) || "—" : "Oficina");
      const pendientes: DocRRHH[] = [];
      const egresos: EgresoRRHH[] = [];

      // Recibos por honorarios
      recibos.forEach((r) => {
        if (r.estado_pago === "Pagado") egresos.push({ banco_id: s(r.banco_id) || null, fecha_pago: s(r.fecha_pago) || null, monto: n(r.monto_neto) });
        else
          pendientes.push({
            id: s(r.id), tabla: "recibos_honorarios", tercero: nombre(r.trabajador_id),
            documento: s(r.numero_recibo) || "—", obra: obra(r.proyecto_id), detalle: "Recibo por honorarios (neto)",
            descripcion: s(r.concepto), emision: s(r.fecha_emision), vencimiento: s(r.fecha_emision) || null, monto: n(r.monto_neto),
          });
      });

      // Boletas: una deuda por planilla cerrada
      boletas.forEach((b) => {
        if (b.estado_pago === "Pagado") egresos.push({ banco_id: s(b.banco_id) || null, fecha_pago: s(b.fecha_pago) || null, monto: n(b.neto_pagar) });
      });
      planillas.filter((p) => p.estado === "Cerrada").forEach((p) => {
        const anio = n(p.anio), mes = n(p.mes);
        const pend = boletas.filter((b) => b.planilla_id === p.id && b.estado_pago !== "Pagado");
        if (!pend.length) return;
        pendientes.push({
          id: s(p.id), tabla: "boletas", tercero: `Trabajadores en planilla (${pend.length})`,
          documento: `Planilla ${MESES[mes - 1] ?? mes} ${anio}`, obra: "Recursos Humanos", detalle: "Remuneraciones netas",
          descripcion: pend.map((b) => `${nombre(b.trabajador_id)}: S/ ${n(b.neto_pagar).toFixed(2)}`).join(" · "),
          emision: finMes(anio, mes), vencimiento: finMes(anio, mes), monto: pend.reduce((a, b) => a + n(b.neto_pagar), 0),
        });
      });

      // Beneficios sociales
      beneficios.forEach((b) => {
        if (b.estado_pago === "Pagado") egresos.push({ banco_id: s(b.banco_id) || null, fecha_pago: s(b.fecha_pago) || null, monto: n(b.total) });
        else
          pendientes.push({
            id: s(b.id), tabla: "beneficios_sociales", tercero: nombre(b.trabajador_id),
            documento: `${s(b.tipo)} ${s(b.periodo)} ${s(b.anio)}`.trim(), obra: "Recursos Humanos",
            detalle: s(b.tipo) === "CTS" ? "Depósito CTS" : s(b.tipo) === "Liquidación" ? "Liquidación de beneficios" : "Gratificación + bonificación",
            descripcion: `${s(b.tipo)} · ${s(b.periodo)}`, emision: s(b.fecha_hasta), vencimiento: s(b.fecha_hasta) || null, monto: n(b.total),
          });
      });

      // Obligaciones con el Estado
      pagosEstado.forEach((p) => egresos.push({ banco_id: s(p.banco_id) || null, fecha_pago: s(p.fecha_pago) || null, monto: n(p.monto) }));
      const oblig = new Map<string, { anio: number; mes: number; concepto: string; monto: number }>();
      const sumar = (anio: number, mes: number, concepto: string, monto: number) => {
        if (monto <= 0) return;
        const k = `${anio}-${mes}-${concepto}`;
        const o = oblig.get(k) ?? { anio, mes, concepto, monto: 0 };
        o.monto += monto;
        oblig.set(k, o);
      };
      planillas.filter((p) => p.estado === "Cerrada").forEach((p) => {
        const anio = n(p.anio), mes = n(p.mes);
        boletas.filter((b) => b.planilla_id === p.id).forEach((b) => {
          sumar(anio, mes, "EsSalud", n(b.essalud));
          const sis = s(b.sistema_pensiones);
          if (sis && sis !== "Ninguno") sumar(anio, mes, sis, n(b.aporte_pension));
          sumar(anio, mes, "Renta 5ta categoría", n(b.renta_quinta));
        });
      });
      recibos.forEach((r) => {
        const f = s(r.fecha_emision);
        if (!f) return;
        sumar(Number(f.slice(0, 4)), Number(f.slice(5, 7)), "Retención 4ta categoría", n(r.retencion));
      });
      oblig.forEach((o, k) => {
        if (pagosEstado.some((p) => n(p.anio) === o.anio && n(p.mes) === o.mes && p.concepto === o.concepto)) return;
        const entidad = o.concepto === "EsSalud" ? "EsSalud" : o.concepto.startsWith("AFP") ? o.concepto : o.concepto === "ONP" ? "ONP (SUNAT)" : "SUNAT";
        pendientes.push({
          id: k, tabla: "pagos_estado", tercero: entidad, documento: `PLAME ${pad(o.mes)}/${o.anio}`,
          obra: "Obligaciones con el Estado", detalle: o.concepto.startsWith("AFP") ? "Declarar y pagar en AFPnet" : "Declarar y pagar en PLAME / PDT 621",
          descripcion: `${o.concepto} · ${MESES[o.mes - 1] ?? o.mes} ${o.anio}`, emision: finMes(o.anio, o.mes),
          vencimiento: venceEstado(o.anio, o.mes), monto: Math.round(o.monto * 100) / 100, extra: o,
        });
      });

      return { pendientes, egresos };
    },
  });
}

/** Registra el pago de un documento de RR.HH. o del Estado. */
export async function pagarRRHH(d: DocRRHH, banco_id: string, fecha_pago: string, numero_operacion: string) {
  const cambios = { estado_pago: "Pagado", banco_id, fecha_pago, numero_operacion };
  if (d.tabla === "boletas") {
    return supabase.from("boletas").update(cambios as never).eq("planilla_id", d.id).neq("estado_pago", "Pagado");
  }
  if (d.tabla === "pagos_estado" && d.extra) {
    return supabase.from("pagos_estado" as never).insert({ ...d.extra, banco_id, fecha_pago, numero_operacion } as never);
  }
  return supabase.from(d.tabla).update(cambios as never).eq("id", d.id);
}
