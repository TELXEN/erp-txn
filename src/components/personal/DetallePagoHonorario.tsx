import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Save, Wand2 } from "lucide-react";
import { Boton, VentanaFlotante } from "@/components/ui-kit";
import { HojaDetalleHonorario, type DetalleHonorario } from "@/components/personal/HojaDetalleHonorario";
import { soles } from "@/lib/format";
import type { Tareo } from "@/lib/datos";

type Opcion = { id: string; nombre: string; codigo?: string | null };
type Trabajador = Opcion & { dni?: string; numero_cuenta?: string; banco?: string; suspension_cuarta?: boolean; jornal_diario?: number };

/** Resume el tareo del trabajador en el proyecto y período elegidos. */
export function resumenTareoHonorario(tareos: Tareo[], trabajadorId: string, proyectoId: string, mes: number, anio: number, jornal: number) {
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  const filas = tareos.filter((t) =>
    t.trabajador_id === trabajadorId &&
    (proyectoId ? t.proyecto_id === proyectoId : true) &&
    typeof t.fecha === "string" && t.fecha.startsWith(prefijo),
  );
  // Cantidades (no soles): viaje en días, extras en horas. La fórmula del
  // detalle convierte todo a jornales: viaje/2, extras/10.5, feriados×2, inducción×1.
  let dias = 0, viaje = 0, extras = 0, feriados = 0, induccion = 0;
  for (const t of filas) {
    const asistencia = Number(t.asistencia) || 0;
    if (t.tipo === "extras") extras += Number(t.horas) || 0;
    else if (t.tipo === "viaje") viaje += asistencia || 1;
    else if (t.tipo === "feriado") feriados += 1; // el tareo guarda asistencia 2 en feriados; aquí cuenta 1 día y se valora ×2
    else if (t.tipo === "induccion") induccion += asistencia || 1;
    else dias += asistencia;
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { filas: filas.length, dias: r2(dias), viaje: r2(viaje), extras: r2(extras), feriados: r2(feriados), induccion: r2(induccion) };
}

export type FormularioHonorario = DetalleHonorario & { trabajador_id: string; proyecto_id: string };

export const HORAS_DIA_EXTRA = 10.5;

/** Jornales equivalentes: laborados + viaje/2 + extras/10.5 + feriados×2 + inducción. */
export function jornalesHonorario(form: Pick<FormularioHonorario, "dias_laborados" | "dias_viaje" | "horas_extras" | "otros_remuneraciones" | "induccion">) {
  return form.dias_laborados + form.dias_viaje / 2 + form.horas_extras / HORAS_DIA_EXTRA + form.otros_remuneraciones * 2 + form.induccion;
}

export function calcularDetalleHonorario(form: FormularioHonorario, suspension = false) {
  const bruto = Math.round(form.costo_unitario * jornalesHonorario(form) * 100) / 100;
  const retencion = !suspension && bruto > 1500 ? Math.round(bruto * 8) / 100 : 0;
  const otrosDescuentos = form.adelantos + form.devolucion_gastos + form.pagos_a_cuenta_planilla + form.fondo_pensiones + form.descuento_herramientas;
  const descuentos = otrosDescuentos + retencion;
  return { bruto, retencion, descuentos, neto: bruto - descuentos };
}

const CAMPOS_NUMERICOS = new Set<keyof DetalleHonorario>([
  "mes", "anio", "dias_laborados", "dias_viaje", "horas_extras", "otros_remuneraciones", "induccion",
  "costo_unitario", "saldo_mes_anterior", "adelantos", "devolucion_gastos", "pagos_a_cuenta_planilla",
  "fondo_pensiones", "descuento_herramientas",
]);

export function DetallePagoHonorario({
  abierta,
  inicial,
  empresa,
  trabajadores,
  proyectos,
  tareos = [],
  guardando,
  error,
  onCerrar,
  onGuardar,
}: {
  abierta: boolean;
  inicial: FormularioHonorario;
  empresa: { razon_social?: string; ruc?: string; rubro?: string; direccion?: string; logo_url?: string; eslogan?: string } | null;
  trabajadores: Trabajador[];
  proyectos: Opcion[];
  tareos?: Tareo[];
  guardando: boolean;
  error: string;
  onCerrar: () => void;
  onGuardar: (form: FormularioHonorario) => Promise<void>;
}) {
  const [form, setForm] = useState(inicial);
  const [avisoTareo, setAvisoTareo] = useState("");
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Imprime en el mismo documento: los estilos de Tailwind no viajan completos
  // a un marco copiado, por eso la hoja se imprime en el sitio y el CSS de
  // impresión (styles.css) oculta todo lo demás y anula la escala de vista previa.
  const imprimir = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 50));
  };
  const trabajador = trabajadores.find((item) => item.id === form.trabajador_id) ?? null;
  const proyecto = proyectos.find((item) => item.id === form.proyecto_id);
  const totales = useMemo(() => calcularDetalleHonorario(form, !!trabajador?.suspension_cuarta), [form, trabajador]);

  const onCambiar = (campo: keyof DetalleHonorario, valor: string) =>
    setForm((actual) => ({ ...actual, [campo]: CAMPOS_NUMERICOS.has(campo) ? Math.max(0, Number(valor) || 0) : valor }));

  // Autocompletar desde la ficha del trabajador y su tareo del período.
  const clavePeriodo = `${form.trabajador_id}|${form.proyecto_id}|${form.mes}|${form.anio}`;
  useEffect(() => {
    if (!form.trabajador_id) { setAvisoTareo(""); return; }
    const jornal = Number(trabajador?.jornal_diario) || 0;
    const resumen = resumenTareoHonorario(tareos, form.trabajador_id, form.proyecto_id, form.mes, form.anio, jornal);
    setForm((actual) => ({
      ...actual,
      dias_laborados: resumen.dias,
      dias_viaje: resumen.viaje,
      horas_extras: resumen.extras,
      otros_remuneraciones: resumen.feriados,
      induccion: resumen.induccion,
      costo_unitario: jornal > 0 ? jornal : actual.costo_unitario,
    }));
    setAvisoTareo(
      resumen.filas > 0
        ? `Completado automáticamente desde el tareo: ${resumen.dias} días laborados, ${resumen.viaje} de viaje, ${resumen.extras} h. extras, ${resumen.feriados} feriados y ${resumen.induccion} de inducción. Puedes ajustar los valores si lo necesitas.`
        : "Sin tareo registrado en este período: completa los importes manualmente.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePeriodo, tareos]);

  const hojaImpresion = <HojaDetalleHonorario empresa={empresa} trabajador={trabajador} proyecto={proyecto ? `${proyecto.codigo ?? ""} ${proyecto.nombre}`.trim() : "Oficina Central"} detalle={{ ...form, retencion: totales.retencion }} totalRemuneraciones={totales.bruto} totalDescuentos={totales.descuentos} neto={totales.neto} />;

  return (
    <VentanaFlotante titulo="Detalle de pago por honorarios" subtitulo="Edita los datos directamente sobre la hoja; lo que ves es lo que se imprime." abierta={abierta} onCerrar={onCerrar} ancho="max-w-[1100px]" ocultarBarra>
      <div className="flex min-h-[680px] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-muted/25 px-4 py-2.5 print:hidden">
          {avisoTareo ? (
            <p className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px] text-muted-foreground">
              <Wand2 size={12} className="mt-0.5 shrink-0 text-primary" /> <span className="min-w-0">{avisoTareo}</span>
            </p>
          ) : <span className="flex-1" />}
          <div className="flex shrink-0 items-center gap-2">
            <Boton type="button" variante="linea" onClick={imprimir}><Printer size={14} /> Imprimir / Guardar PDF</Boton>
            <Boton type="button" disabled={guardando || totales.bruto <= 0 || totales.neto < 0 || !form.trabajador_id} onClick={() => void onGuardar(form)}><Save size={14} /> {guardando ? "Guardando…" : "Guardar detalle"}</Boton>
          </div>
        </div>
        {error && <p className="border-b border-line bg-bad/5 px-4 py-2 text-xs text-bad print:hidden">{error}</p>}

        <div className="flex-1 overflow-auto bg-muted/40 p-4 print:overflow-visible print:bg-paper print:p-0">
          <HojaDetalleHonorario
            editable
            empresa={empresa}
            trabajador={trabajador}
            proyecto={proyecto ? `${proyecto.codigo ?? ""} ${proyecto.nombre}`.trim() : "Oficina Central"}
            detalle={{ ...form, retencion: totales.retencion }}
            totalRemuneraciones={totales.bruto}
            totalDescuentos={totales.descuentos}
            neto={totales.neto}
            onCambiar={onCambiar}
            selectores={{
              trabajadores,
              proyectos,
              trabajadorId: form.trabajador_id,
              proyectoId: form.proyecto_id,
              onTrabajador: (id) => setForm((actual) => ({ ...actual, trabajador_id: id })),
              onProyecto: (id) => setForm((actual) => ({ ...actual, proyecto_id: id })),
            }}
          />
        </div>
      </div>
      {/* Copia exclusiva para impresión, fuera de la ventana: nada la recorta ni escala. */}
      {montado && abierta && createPortal(<div className="honorario-print-root hidden print:block">{hojaImpresion}</div>, document.body)}
    </VentanaFlotante>
  );
}
