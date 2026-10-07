import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Eye, Pencil, Plus, Settings, Trash2, Truck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { soles as fmtSoles } from "@/lib/format";
import { useCajasChicas } from "@/lib/datos";
import { toast } from "sonner";
import {
  ESTADOS_VEHICULO,
  TIPOS_VEHICULO,
  costoTareo,
  diasPara,
  useMantenimientos,
  usePlanMantenimiento,
  useTareoVehiculos,
  useTraslados,
  useVehiculos,
  type Vehiculo,
} from "@/lib/vehiculos";

export const Route = createFileRoute("/_authenticated/vehiculos")({
  head: () => ({
    meta: [
      { title: "Vehículos — ERP TELXEN SAC" },
      { name: "description", content: "Gestión de flota: tareo vehicular, traslados a obra y mantenimiento." },
      { property: "og:title", content: "Vehículos — ERP TELXEN SAC" },
      { property: "og:description", content: "Gestión de flota: tareo vehicular, traslados a obra y mantenimiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaVehiculos,
});

type Proyecto = { id: string; codigo: string; nombre: string };
type Trabajador = { id: string; nombre: string };

type PagoForm = { origen_pago: "Banco" | "Caja chica"; banco_id: string; caja_chica_id: string; numero_operacion: string };
const PAGO_VACIO: PagoForm = { origen_pago: "Banco", banco_id: "", caja_chica_id: "", numero_operacion: "" };

type Pestaña = "flota" | "tareo" | "traslados" | "mantenimiento" | "resumen";

const PESTAÑAS: { id: Pestaña; texto: string }[] = [
  { id: "flota", texto: "Flota" },
  { id: "tareo", texto: "Tareo vehicular" },
  { id: "traslados", texto: "Traslados" },
  { id: "mantenimiento", texto: "Mantenimiento" },
  { id: "resumen", texto: "Resumen" },
];
const GRUPOS_VEHICULOS: { titulo: string; icono: React.ElementType; items: Pestaña[] }[] = [
  { titulo: "Flota", icono: Truck, items: ["flota", "resumen"] },
  { titulo: "Operaciones", icono: ClipboardList, items: ["tareo", "traslados"] },
  { titulo: "Mantenimiento", icono: Settings, items: ["mantenimiento"] },
];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function cambiarMes(mes: string, delta: number) {
  const [anio = 2026, numero = 1] = mes.split("-").map(Number);
  const fecha = new Date(anio, numero - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

function diasDelMes(mes: string) {
  const [anio = 2026, numero = 1] = mes.split("-").map(Number);
  const primerDia = (new Date(anio, numero - 1, 1).getDay() + 6) % 7;
  return [...Array<string | null>(primerDia).fill(null), ...Array.from({ length: new Date(anio, numero, 0).getDate() }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];
}

const VACIO_VEHICULO = {
  placa: "", marca: "", modelo: "", anio: "", tipo: "Camioneta", propiedad: "Propio",
  km_actual: "0", soat_vencimiento: "", revision_tecnica_vencimiento: "",
  tarifa_dia: "0", tarifa_km: "0", estado: "Operativo", observacion: "",
};

function PaginaVehiculos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const esDinero = rol === "administrador" || rol === "gerente";
  const [pestaña, setPestaña] = useState<Pestaña>("flota");
  const grupoActivo = GRUPOS_VEHICULOS.find((g) => g.items.includes(pestaña)) ?? GRUPOS_VEHICULOS[0];

  const { data: vehiculos = [] } = useVehiculos();
  const { data: tareo = [] } = useTareoVehiculos();
  const { data: traslados = [] } = useTraslados();
  const { data: mantenimientos = [] } = useMantenimientos();
  const { data: plan = [] } = usePlanMantenimiento();
  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    enabled: esDinero,
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; nombre: string; numero_cuenta: string; monedas: string; activo: boolean }[];
    },
  });
  const { data: cajas = [] } = useCajasChicas();
  const cajasAbiertas = cajas.filter((c) => c.estado === "Abierta");
  const nombreOrigen = (r: { origen_pago?: string; banco_id: string | null; caja_chica_id: string | null }) => {
    if (r.caja_chica_id) {
      const c = cajas.find((x) => x.id === r.caja_chica_id);
      return `Caja chica${c ? ` · ${c.motivo}` : ""}`;
    }
    const b = bancos.find((x) => x.id === r.banco_id);
    return b ? `${b.nombre} · ${b.numero_cuenta}` : "—";
  };
  const validarOrigen = (f: PagoForm, monto: number) => {
    if (monto <= 0) return "";
    if (f.origen_pago === "Banco" && !f.banco_id) return "Elige la cuenta bancaria de la que sale el dinero";
    if (f.origen_pago === "Caja chica" && !f.caja_chica_id) return "Elige la caja chica que paga";
    return "";
  };
  const filaOrigen = (f: PagoForm, monto: number) =>
    monto > 0
      ? {
          origen_pago: f.origen_pago,
          banco_id: f.origen_pago === "Banco" ? f.banco_id || null : null,
          caja_chica_id: f.origen_pago === "Caja chica" ? f.caja_chica_id || null : null,
          numero_operacion: f.numero_operacion.trim(),
        }
      : {};
  const camposOrigen = <T extends PagoForm>(f: T, set: (f: T) => void) => (
    <>
      <Campo etiqueta="Pagado desde">
        <Select value={f.origen_pago} onChange={(e) => set({ ...f, origen_pago: e.target.value as PagoForm["origen_pago"] })}>
          <option value="Banco">Cuenta bancaria</option>
          <option value="Caja chica">Caja chica</option>
        </Select>
      </Campo>
      {f.origen_pago === "Banco" ? (
        <Campo etiqueta="Cuenta bancaria">
          <Select value={f.banco_id} onChange={(e) => set({ ...f, banco_id: e.target.value })}>
            <option value="">— elegir —</option>
            {bancos.filter((b) => b.activo).map((b) => <option key={b.id} value={b.id}>{b.nombre} · {b.monedas} · {b.numero_cuenta}</option>)}
          </Select>
        </Campo>
      ) : (
        <Campo etiqueta="Caja chica (abierta)">
          <Select value={f.caja_chica_id} onChange={(e) => set({ ...f, caja_chica_id: e.target.value })}>
            <option value="">— elegir —</option>
            {cajasAbiertas.map((c) => <option key={c.id} value={c.id}>{c.motivo} · {fmtSoles(c.monto_entregado)}</option>)}
          </Select>
        </Campo>
      )}
      <Campo etiqueta={f.origen_pago === "Banco" ? "N° operación" : "N° comprobante"}>
        <Input value={f.numero_operacion} onChange={(e) => set({ ...f, numero_operacion: e.target.value })} />
      </Campo>
    </>
  );

  const { data: proyectos = [] } = useQuery({
    queryKey: ["proyectos", "vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("id, codigo, nombre").order("codigo");
      if (error) throw error;
      return (data ?? []) as Proyecto[];
    },
  });
  const { data: trabajadores = [] } = useQuery({
    queryKey: ["trabajadores", "vehiculos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajadores").select("id, nombre").order("nombre");
      if (error) throw error;
      return (data ?? []) as Trabajador[];
    },
  });

  const mapaVehiculo = useMemo(() => new Map(vehiculos.map((v) => [v.id, v])), [vehiculos]);
  const mapaProyecto = useMemo(() => new Map(proyectos.map((p) => [p.id, p])), [proyectos]);
  const nombreTrabajador = useMemo(
    () => new Map(trabajadores.map((t) => [t.id, t.nombre])),
    [trabajadores],
  );

  function refrescar() {
    for (const k of ["vehiculos", "tareo_vehiculos", "traslados_vehiculo", "mantenimientos_vehiculo", "plan_mantenimiento"]) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  }

  // ---------- Flota ----------
  const [formVeh, setFormVeh] = useState(VACIO_VEHICULO);
  const [editVeh, setEditVeh] = useState<string | null>(null);
  const [modalVehiculo, setModalVehiculo] = useState(false);
  const [cerrarVehiculoAlGuardar, setCerrarVehiculoAlGuardar] = useState(false);

  async function guardarVehiculo() {
    if (!formVeh.placa.trim()) {
      toast.error("La placa es obligatoria");
      return;
    }
    const placaNueva = formVeh.placa.trim().toUpperCase();
    if (vehiculos.some((v) => v.placa.toUpperCase() === placaNueva && v.id !== editVeh)) {
      toast.error(`La placa ${placaNueva} ya está registrada`);
      return;
    }
    const fila = {
      placa: formVeh.placa.trim().toUpperCase(),
      marca: formVeh.marca.trim(),
      modelo: formVeh.modelo.trim(),
      anio: formVeh.anio ? Number(formVeh.anio) : null,
      tipo: formVeh.tipo,
      propiedad: formVeh.propiedad,
      km_actual: Number(formVeh.km_actual) || 0,
      soat_vencimiento: formVeh.soat_vencimiento || null,
      revision_tecnica_vencimiento: formVeh.revision_tecnica_vencimiento || null,
      tarifa_dia: Number(formVeh.tarifa_dia) || 0,
      tarifa_km: Number(formVeh.tarifa_km) || 0,
      estado: formVeh.estado,
      observacion: formVeh.observacion.trim(),
    };
    const { error } = editVeh
      ? await supabase.from("vehiculos" as never).update(fila as never).eq("id", editVeh)
      : await supabase.from("vehiculos" as never).insert(fila as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editVeh ? "Vehículo actualizado" : "Vehículo registrado");
    setFormVeh(VACIO_VEHICULO);
    setEditVeh(null);
    if (cerrarVehiculoAlGuardar) setModalVehiculo(false);
    refrescar();
  }

  function editarVehiculo(v: Vehiculo) {
    setEditVeh(v.id);
    setFormVeh({
      placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio ? String(v.anio) : "",
      tipo: v.tipo, propiedad: v.propiedad, km_actual: String(v.km_actual),
      soat_vencimiento: v.soat_vencimiento ?? "", revision_tecnica_vencimiento: v.revision_tecnica_vencimiento ?? "",
      tarifa_dia: String(v.tarifa_dia), tarifa_km: String(v.tarifa_km), estado: v.estado, observacion: v.observacion,
    });
    setModalVehiculo(true);
  }

  async function borrarVehiculo(v: Vehiculo) {
    if (!window.confirm(`¿Eliminar el vehículo ${v.placa}? Se borrarán también sus tareos, traslados y mantenimientos.`)) return;
    const { error } = await supabase.from("vehiculos" as never).delete().eq("id", v.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vehículo eliminado");
    refrescar();
  }

  // ---------- Tareo ----------
  const mesActual = new Date().toISOString().slice(0, 7);
  const VACIO_TAREO = { vehiculo_id: "", proyecto_id: "" };
  const [formTareo, setFormTareo] = useState(VACIO_TAREO);
  const [mesTareo, setMesTareo] = useState(mesActual);
  const [diasTareo, setDiasTareo] = useState<Set<string>>(new Set());
  const [mesResumenTareo, setMesResumenTareo] = useState(mesActual);
  const [editandoTareo, setEditandoTareo] = useState<{ vehiculoId: string; proyectoId: string } | null>(null);
  const celdasTareo = diasDelMes(mesTareo);
  const tareoMensual = useMemo(() => tareo.filter((t) => t.fecha.slice(0, 7) === mesResumenTareo), [tareo, mesResumenTareo]);
  const consolidadoTareo = useMemo(() => {
    const grupos = new Map<string, { vehiculoId: string; proyectoId: string; dias: number; costo: number }>();
    for (const registro of tareoMensual) {
      const clave = `${registro.vehiculo_id}:${registro.proyecto_id}`;
      const actual = grupos.get(clave) ?? { vehiculoId: registro.vehiculo_id, proyectoId: registro.proyecto_id, dias: 0, costo: 0 };
      actual.dias += Number(registro.dias || 0);
      actual.costo += Number(registro.costo_soles || 0);
      grupos.set(clave, actual);
    }
    return [...grupos.values()];
  }, [tareoMensual]);

  function marcarDiaTareo(fecha: string) {
    setDiasTareo((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(fecha)) siguientes.delete(fecha); else siguientes.add(fecha);
      return siguientes;
    });
  }

  async function guardarTareo() {
    if (!formTareo.vehiculo_id || !formTareo.proyecto_id || diasTareo.size === 0) {
      toast.error("Elige vehículo, proyecto y al menos un día");
      return;
    }
    const v = mapaVehiculo.get(formTareo.vehiculo_id);
    const fechas = [...diasTareo].sort();
    const ocupadas = tareo.filter((t) => t.vehiculo_id === formTareo.vehiculo_id && fechas.includes(t.fecha));
    if (!editandoTareo && ocupadas.length > 0) {
      toast.error(`El vehículo ya tiene uso registrado el ${ocupadas[0]?.fecha ?? "día seleccionado"}`);
      return;
    }
    if (editandoTareo) {
      const { error: errorBorrado } = await supabase.from("tareo_vehiculos" as never).delete().eq("vehiculo_id", editandoTareo.vehiculoId).eq("proyecto_id", editandoTareo.proyectoId).gte("fecha", `${mesTareo}-01`).lte("fecha", `${mesTareo}-31`);
      if (errorBorrado) {
        toast.error(errorBorrado.message);
        return;
      }
    }
    const filas = fechas.map((fecha) => ({ fecha, vehiculo_id: formTareo.vehiculo_id, proyecto_id: formTareo.proyecto_id, conductor_id: null, dias: 1, km: 0, costo_soles: costoTareo(1, v), observacion: "" }));
    const { error } = await supabase.from("tareo_vehiculos" as never).insert(filas as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editandoTareo ? "Días de uso actualizados" : "Días de uso registrados");
    setDiasTareo(new Set());
    setEditandoTareo(null);
    refrescar();
  }

  function editarDiasTareo(vehiculoId: string, proyectoId: string) {
    const fechas = tareo.filter((t) => t.vehiculo_id === vehiculoId && t.proyecto_id === proyectoId && t.fecha.slice(0, 7) === mesResumenTareo).map((t) => t.fecha);
    setFormTareo({ vehiculo_id: vehiculoId, proyecto_id: proyectoId });
    setMesTareo(mesResumenTareo);
    setDiasTareo(new Set(fechas));
    setEditandoTareo({ vehiculoId, proyectoId });
  }

  // ---------- Traslados ----------
  const VACIO_TRASLADO = {
    fecha: new Date().toISOString().slice(0, 10), vehiculo_id: "", conductor_id: "", proyecto_id: "",
    origen: "", destino: "", km_inicial: "0", km_final: "0", carga: "",
    combustible_galones: "0", combustible_monto: "0", observacion: "", generar_tareo: true, ...PAGO_VACIO,
  };
  const [formTras, setFormTras] = useState(VACIO_TRASLADO);

  async function guardarTraslado() {
    if (!formTras.vehiculo_id) {
      toast.error("Elige el vehículo");
      return;
    }
    const kmFinal = Number(formTras.km_final) || 0;
    const montoComb = esDinero ? Number(formTras.combustible_monto) || 0 : 0;
    const errOrigen = validarOrigen(formTras, montoComb);
    if (errOrigen) {
      toast.error(errOrigen);
      return;
    }
    const fila = {
      ...filaOrigen(formTras, montoComb),
      fecha: formTras.fecha,
      vehiculo_id: formTras.vehiculo_id,
      conductor_id: formTras.conductor_id || null,
      proyecto_id: formTras.proyecto_id || null,
      origen: formTras.origen.trim(),
      destino: formTras.destino.trim(),
      km_inicial: Number(formTras.km_inicial) || 0,
      km_final: kmFinal,
      carga: formTras.carga.trim(),
      combustible_galones: Number(formTras.combustible_galones) || 0,
      combustible_monto: Number(formTras.combustible_monto) || 0,
      observacion: formTras.observacion.trim(),
    };
    const { error } = await supabase.from("traslados_vehiculo" as never).insert(fila as never);
    if (error) {
      toast.error(error.message);
      return;
    }

    const v = mapaVehiculo.get(formTras.vehiculo_id);
    if (v && kmFinal > v.km_actual) {
      await supabase.from("vehiculos" as never).update({ km_actual: kmFinal } as never).eq("id", v.id);
    }
    if (formTras.generar_tareo && formTras.proyecto_id) {
      await supabase.from("tareo_vehiculos" as never).insert({
        fecha: formTras.fecha,
        vehiculo_id: formTras.vehiculo_id,
        proyecto_id: formTras.proyecto_id,
        conductor_id: null,
        dias: 1,
        km: 0,
        costo_soles: costoTareo(1, v),
        observacion: "",
      } as never);
    }
    toast.success("Traslado registrado");
    setFormTras({ ...VACIO_TRASLADO, vehiculo_id: formTras.vehiculo_id, origen_pago: formTras.origen_pago, banco_id: formTras.banco_id, caja_chica_id: formTras.caja_chica_id });
    refrescar();
  }

  async function borrarTraslado(id: string) {
    if (!window.confirm("¿Eliminar este traslado?")) return;
    const { error } = await supabase.from("traslados_vehiculo" as never).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refrescar();
  }

  // ---------- Mantenimiento ----------
  const VACIO_MANT = { vehiculo_id: "", fecha: new Date().toISOString().slice(0, 10), tipo: "Preventivo", costo: "0", km: "0", detalle: "", ...PAGO_VACIO };
  const [formMant, setFormMant] = useState(VACIO_MANT);
  const VACIO_PLAN = { vehiculo_id: "", descripcion: "", cada_km: "", cada_meses: "" };
  const [formPlan, setFormPlan] = useState(VACIO_PLAN);

  async function guardarMantenimiento() {
    if (!formMant.vehiculo_id) {
      toast.error("Elige el vehículo");
      return;
    }
    const monto = Number(formMant.costo) || 0;
    const errOrigen = validarOrigen(formMant, monto);
    if (errOrigen) {
      toast.error(errOrigen);
      return;
    }
    const { error } = await supabase.from("mantenimientos_vehiculo" as never).insert({
      ...filaOrigen(formMant, monto),
      vehiculo_id: formMant.vehiculo_id,
      fecha: formMant.fecha,
      tipo: formMant.tipo,
      costo: Number(formMant.costo) || 0,
      km: Number(formMant.km) || 0,
      detalle: formMant.detalle.trim(),
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mantenimiento registrado");
    setFormMant(VACIO_MANT);
    refrescar();
  }

  async function borrarMantenimiento(id: string) {
    if (!window.confirm("¿Eliminar este mantenimiento?")) return;
    const { error } = await supabase.from("mantenimientos_vehiculo" as never).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refrescar();
  }

  async function guardarPlan() {
    if (!formPlan.vehiculo_id || !formPlan.descripcion.trim()) {
      toast.error("Elige vehículo y describe la tarea");
      return;
    }
    const v = mapaVehiculo.get(formPlan.vehiculo_id);
    const cadaKm = formPlan.cada_km ? Number(formPlan.cada_km) : null;
    const cadaMeses = formPlan.cada_meses ? Number(formPlan.cada_meses) : null;
    let proximaFecha: string | null = null;
    if (cadaMeses) {
      const d = new Date();
      d.setMonth(d.getMonth() + cadaMeses);
      proximaFecha = d.toISOString().slice(0, 10);
    }
    const { error } = await supabase.from("plan_mantenimiento" as never).insert({
      vehiculo_id: formPlan.vehiculo_id,
      descripcion: formPlan.descripcion.trim(),
      cada_km: cadaKm,
      cada_meses: cadaMeses,
      ultimo_km: v?.km_actual ?? 0,
      ultima_fecha: new Date().toISOString().slice(0, 10),
      proximo_km: cadaKm != null ? (v?.km_actual ?? 0) + cadaKm : null,
      proxima_fecha: proximaFecha,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tarea de plan registrada");
    setFormPlan(VACIO_PLAN);
    refrescar();
  }

  async function borrarPlan(id: string) {
    if (!window.confirm("¿Eliminar esta tarea del plan?")) return;
    const { error } = await supabase.from("plan_mantenimiento" as never).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refrescar();
  }

  // ---------- Resumen ----------
  const resumen = useMemo(() => {
    const porProyecto = new Map<string, number>();
    for (const t of tareo) porProyecto.set(t.proyecto_id, (porProyecto.get(t.proyecto_id) ?? 0) + Number(t.costo_soles || 0));
    const kmPorVehiculo = new Map<string, number>();
    for (const tr of traslados) {
      kmPorVehiculo.set(tr.vehiculo_id, (kmPorVehiculo.get(tr.vehiculo_id) ?? 0) + Math.max(0, Number(tr.km_final) - Number(tr.km_inicial)));
    }
    const mantenimientoTotal = mantenimientos.reduce((a, m) => a + Number(m.costo || 0), 0);
    const combustibleTotal = traslados.reduce((a, t) => a + Number(t.combustible_monto || 0), 0);
    const ingresoInterno = tareo.reduce((a, t) => {
      const v = mapaVehiculo.get(t.vehiculo_id);
      return v?.propiedad === "Propio" ? a + Number(t.costo_soles || 0) : a;
    }, 0);
    const alquilerTerceros = tareo.reduce((a, t) => {
      const v = mapaVehiculo.get(t.vehiculo_id);
      return v?.propiedad === "Alquilado" ? a + Number(t.costo_soles || 0) : a;
    }, 0);
    return { porProyecto, kmPorVehiculo, mantenimientoTotal, combustibleTotal, ingresoInterno, alquilerTerceros };
  }, [tareo, traslados, mantenimientos, mapaVehiculo]);

  const alertas = useMemo(() => {
    const lista: { vehiculo: string; texto: string; urgente: boolean }[] = [];
    for (const v of vehiculos) {
      for (const [etiqueta, fecha] of [["SOAT", v.soat_vencimiento], ["Rev. técnica", v.revision_tecnica_vencimiento]] as const) {
        const d = diasPara(fecha);
        if (d != null && d <= 30) lista.push({ vehiculo: v.placa, texto: `${etiqueta} ${d < 0 ? "vencido" : `vence en ${d} días`}`, urgente: d < 0 });
      }
    }
    for (const p of plan.filter((x) => x.activo)) {
      const v = mapaVehiculo.get(p.vehiculo_id);
      if (!v) continue;
      if (p.proximo_km != null && v.km_actual >= p.proximo_km - 500) {
        lista.push({ vehiculo: v.placa, texto: `${p.descripcion}: próximo a los ${p.proximo_km} km`, urgente: v.km_actual >= p.proximo_km });
      }
      const d = diasPara(p.proxima_fecha);
      if (d != null && d <= 15) lista.push({ vehiculo: v.placa, texto: `${p.descripcion}: ${d < 0 ? "vencido" : `en ${d} días`}`, urgente: d < 0 });
    }
    return lista;
  }, [vehiculos, plan, mapaVehiculo]);

  const th = "px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground";
  const td = "px-3 py-2 text-sm";

  const placaNorm = formVeh.placa.trim().toUpperCase();
  const placaDuplicada = placaNorm !== "" && vehiculos.some((v) => v.placa.toUpperCase() === placaNorm && v.id !== editVeh);

  function venceTexto(fecha: string) {
    const d = diasPara(fecha || null);
    if (d == null) return <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Sin fecha registrada</span>;
    if (d < 0) return <span className="mt-1 block font-mono text-[10px] font-semibold text-bad">Vencido hace {Math.abs(d)} día(s)</span>;
    if (d <= 30) return <span className="mt-1 block font-mono text-[10px] font-semibold text-bad">Vence en {d} día(s)</span>;
    return <span className="mt-1 block font-mono text-[10px] text-good">Vigente · {d} días</span>;
  }

  function sumarAnio(fecha: string) {
    const d = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  return (
    <div>
      <Encabezado
        titulo="Vehículos"
        subtitulo="Logística · Flota, tareo, traslados y mantenimiento"
        acciones={
          alertas.length > 0 ? (
            <Etiqueta tono="bad">{alertas.length} alerta{alertas.length > 1 ? "s" : ""} de vencimiento</Etiqueta>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {GRUPOS_VEHICULOS.map((g) => { const Icono = g.icono; return (
          <Boton key={g.titulo} variante={g === grupoActivo ? "primario" : "linea"} onClick={() => { const primero = g.items[0]; if (primero) setPestaña(primero); }}><Icono size={13} />{g.titulo}</Boton>
        ); })}
      </div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {PESTAÑAS.filter((p) => grupoActivo?.items.includes(p.id)).map((p) => (
          <button
            key={p.id}
            onClick={() => setPestaña(p.id)}
            className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${
              pestaña === p.id ? "border-cta bg-primary/10 font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestaña === "flota" && (
        <div className="space-y-4">
          {esDinero && <VentanaFlotante abierta={modalVehiculo} onCerrar={() => { setModalVehiculo(false); setEditVeh(null); setFormVeh(VACIO_VEHICULO); }} titulo={editVeh ? "Editar vehículo" : "Registrar vehículo"} subtitulo={editVeh ? "Actualiza los datos de la unidad." : "Registra varias unidades sin cerrar la ventana."} ancho="max-w-6xl">
              <div className="border-b border-line px-5 py-2">
                {
                placaNorm ? (
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Etiqueta tono="neutro">{placaNorm}</Etiqueta>
                    {[formVeh.marca, formVeh.modelo].filter(Boolean).join(" ") || "—"}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-muted-foreground">Completa la placa primero</span>
                )}
              </div>
              <form className="space-y-5 p-5" onSubmit={(e) => { e.preventDefault(); guardarVehiculo(); }}>
                <div>
                  <p className="label-mono mb-2 text-primary">Identificación</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                    <Campo etiqueta="Placa"><Input autoFocus value={formVeh.placa} onChange={(e) => setFormVeh({ ...formVeh, placa: e.target.value.toUpperCase() })} placeholder="ABC-123" autoComplete="off" /></Campo>
                    <Campo etiqueta="Marca"><Input value={formVeh.marca} onChange={(e) => setFormVeh({ ...formVeh, marca: e.target.value })} placeholder="Toyota" /></Campo>
                    <Campo etiqueta="Modelo"><Input value={formVeh.modelo} onChange={(e) => setFormVeh({ ...formVeh, modelo: e.target.value })} placeholder="Hilux 4x4" /></Campo>
                    <Campo etiqueta="Año"><Input type="number" min="1980" max="2030" value={formVeh.anio} onChange={(e) => setFormVeh({ ...formVeh, anio: e.target.value })} placeholder="2022" /></Campo>
                    <Campo etiqueta="Tipo">
                      <Select value={formVeh.tipo} onChange={(e) => setFormVeh({ ...formVeh, tipo: e.target.value })}>
                        {TIPOS_VEHICULO.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </Campo>
                    <Campo etiqueta="Propiedad">
                      <Select value={formVeh.propiedad} onChange={(e) => setFormVeh({ ...formVeh, propiedad: e.target.value })}>
                        <option>Propio</option>
                        <option>Alquilado</option>
                      </Select>
                    </Campo>
                  </div>
                  {placaDuplicada && (
                    <p className="mt-2 font-mono text-[11px] font-semibold text-bad">La placa {placaNorm} ya está registrada en la flota.</p>
                  )}
                </div>

                <div>
                  <p className="label-mono mb-2 text-primary">Situación y documentos</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Campo etiqueta="Km actual"><Input type="number" min="0" value={formVeh.km_actual} onChange={(e) => setFormVeh({ ...formVeh, km_actual: e.target.value })} placeholder="0" /></Campo>
                    <Campo etiqueta="Estado">
                      <Select value={formVeh.estado} onChange={(e) => setFormVeh({ ...formVeh, estado: e.target.value })}>
                        {ESTADOS_VEHICULO.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </Campo>
                    <Campo etiqueta="Vence SOAT">
                      <Input type="date" value={formVeh.soat_vencimiento} onChange={(e) => setFormVeh({ ...formVeh, soat_vencimiento: e.target.value })} />
                      {venceTexto(formVeh.soat_vencimiento)}
                      <button type="button" className="mt-1 font-mono text-[10px] text-primary hover:underline" onClick={() => setFormVeh({ ...formVeh, soat_vencimiento: sumarAnio(formVeh.soat_vencimiento) })}>+1 año</button>
                    </Campo>
                    <Campo etiqueta="Vence rev. técnica">
                      <Input type="date" value={formVeh.revision_tecnica_vencimiento} onChange={(e) => setFormVeh({ ...formVeh, revision_tecnica_vencimiento: e.target.value })} />
                      {venceTexto(formVeh.revision_tecnica_vencimiento)}
                      <button type="button" className="mt-1 font-mono text-[10px] text-primary hover:underline" onClick={() => setFormVeh({ ...formVeh, revision_tecnica_vencimiento: sumarAnio(formVeh.revision_tecnica_vencimiento) })}>+1 año</button>
                    </Campo>
                  </div>
                </div>

                <div>
                  <p className="label-mono mb-2 text-primary">Tarifas internas</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Campo etiqueta="Tarifa por día (S/)">
                      <Input type="number" step="0.01" min="0" value={formVeh.tarifa_dia} onChange={(e) => setFormVeh({ ...formVeh, tarifa_dia: e.target.value })} placeholder="150.00" />
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Tareo = días de uso × tarifa diaria</span>
                    </Campo>
                    <Campo etiqueta="Tarifa por km (S/)">
                      <Input type="number" step="0.01" min="0" value={formVeh.tarifa_km} onChange={(e) => setFormVeh({ ...formVeh, tarifa_km: e.target.value })} placeholder="2.50" />
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Referencial para traslados</span>
                    </Campo>
                  </div>
                </div>

                <Campo etiqueta="Observación"><Input value={formVeh.observacion} onChange={(e) => setFormVeh({ ...formVeh, observacion: e.target.value })} placeholder="Accesorios, asignación habitual…" /></Campo>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                  <Boton type="button" variante="linea" onClick={() => { setModalVehiculo(false); setEditVeh(null); setFormVeh(VACIO_VEHICULO); }}>Cancelar</Boton>
                  {!editVeh && <Boton type="submit" variante="linea" disabled={!placaNorm || placaDuplicada} onClick={() => setCerrarVehiculoAlGuardar(false)}><Plus className="size-3.5" />Registrar otro</Boton>}
                  <Boton type="submit" disabled={!placaNorm || placaDuplicada} onClick={() => setCerrarVehiculoAlGuardar(true)}><Check className="size-3.5" />{editVeh ? "Guardar cambios" : "Registrar y cerrar"}</Boton>
                  {!placaNorm && <span className="font-mono text-[11px] text-muted-foreground">La placa es obligatoria</span>}
                  {placaDuplicada && <span className="font-mono text-[11px] font-semibold text-bad">Corrige la placa duplicada</span>}
                </div>
              </form>
            </VentanaFlotante>}

          <Panel titulo={`Flota (${vehiculos.length})`} extra={esDinero ? <Boton variante="accion" onClick={() => { setEditVeh(null); setFormVeh(VACIO_VEHICULO); setModalVehiculo(true); }}><Plus size={13} /> Registrar vehículo</Boton> : undefined}>
            {vehiculos.length === 0 ? <Vacio texto="Aún no hay vehículos registrados." /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Placa</th><th className={th}>Vehículo</th><th className={th}>Propiedad</th>
                    <th className={th}>Km</th><th className={th}>SOAT</th><th className={th}>Rev. técnica</th>
                    {esDinero && <th className={th}>Tarifa día</th>}
                    <th className={th}>Estado</th>{esDinero && <th className={th}></th>}
                  </tr></thead>
                  <tbody>
                    {vehiculos.map((v) => {
                      const dSoat = diasPara(v.soat_vencimiento);
                      const dRev = diasPara(v.revision_tecnica_vencimiento);
                      return (
                        <tr key={v.id} className="border-b border-line/60">
                          <td className={`${td} font-mono font-semibold`}>{v.placa}</td>
                          <td className={td}>{[v.marca, v.modelo, v.anio].filter(Boolean).join(" ") || v.tipo}</td>
                          <td className={td}><Etiqueta tono={v.propiedad === "Propio" ? "good" : "neutro"}>{v.propiedad}</Etiqueta></td>
                          <td className={`${td} font-mono`}>{v.km_actual.toLocaleString("es-PE")}</td>
                          <td className={td}>{dSoat == null ? "—" : <span className={dSoat <= 30 ? "font-semibold text-bad" : ""}>{v.soat_vencimiento}</span>}</td>
                          <td className={td}>{dRev == null ? "—" : <span className={dRev <= 30 ? "font-semibold text-bad" : ""}>{v.revision_tecnica_vencimiento}</span>}</td>
                          {esDinero && <td className={`${td} font-mono`}>{fmtSoles(v.tarifa_dia)}</td>}
                          <td className={td}><Etiqueta tono={v.estado === "Operativo" ? "good" : v.estado === "En taller" ? "neutro" : "bad"}>{v.estado}</Etiqueta></td>
                          {esDinero && (
                            <td className={`${td} text-right`}>
                              <button onClick={() => editarVehiculo(v)} className="mr-2 text-primary" aria-label="Editar"><Pencil className="size-3.5" /></button>
                              <button onClick={() => borrarVehiculo(v)} className="text-bad" aria-label="Eliminar"><Trash2 className="size-3.5" /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {pestaña === "tareo" && (
        <div className="space-y-4">
          <Panel titulo={editandoTareo ? "Corregir días de uso" : "Registrar días de uso vehicular"}>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Vehículo">
                <Select value={formTareo.vehiculo_id} disabled={Boolean(editandoTareo)} onChange={(e) => setFormTareo({ ...formTareo, vehiculo_id: e.target.value })}>
                  <option value="">— elegir —</option>
                  {vehiculos.filter((v) => v.estado === "Operativo").map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Proyecto">
                <Select value={formTareo.proyecto_id} disabled={Boolean(editandoTareo)} onChange={(e) => setFormTareo({ ...formTareo, proyecto_id: e.target.value })}>
                  <option value="">— elegir —</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                </Select>
              </Campo>
              </div>
              <div className="rounded-md border border-line bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="label-mono">Calendario de uso</p>
                  <div className="flex items-center gap-2">
                    <Boton type="button" variante="linea" className="px-2" disabled={Boolean(editandoTareo)} onClick={() => setMesTareo(cambiarMes(mesTareo, -1))}>‹</Boton>
                    <Input type="month" className="w-40" disabled={Boolean(editandoTareo)} value={mesTareo} onChange={(e) => e.target.value && setMesTareo(e.target.value)} />
                    <Boton type="button" variante="linea" className="px-2" disabled={Boolean(editandoTareo)} onClick={() => setMesTareo(cambiarMes(mesTareo, 1))}>›</Boton>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {DIAS_SEMANA.map((dia, i) => <div key={i} className="label-mono py-1 text-center">{dia}</div>)}
                  {celdasTareo.map((fecha, i) => fecha ? (
                    <button key={fecha} type="button" aria-pressed={diasTareo.has(fecha)} onClick={() => marcarDiaTareo(fecha)} className={`flex h-9 items-center justify-center rounded-md border font-mono text-xs transition-colors ${diasTareo.has(fecha) ? "border-primary bg-primary text-primary-foreground" : "border-line bg-card hover:border-primary"}`}>
                      {Number(fecha.slice(8))}
                    </button>
                  ) : <div key={`vacio-${i}`} />)}
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">Haz clic en cada día que el vehículo fue utilizado.</p>
              </div>
              {esDinero && <div className="flex justify-end font-mono text-xs text-muted-foreground">{diasTareo.size} día(s) · {fmtSoles(costoTareo(diasTareo.size, mapaVehiculo.get(formTareo.vehiculo_id)))}</div>}
            </div>
            <div className="flex gap-2 border-t border-line px-5 py-3">
              <Boton onClick={guardarTareo}>{editandoTareo ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}{editandoTareo ? "Guardar corrección" : `Registrar tareo (${diasTareo.size} día(s))`}</Boton>
              {(editandoTareo || diasTareo.size > 0) && <Boton variante="linea" onClick={() => { setEditandoTareo(null); setDiasTareo(new Set()); setFormTareo(VACIO_TAREO); }}><X className="size-3.5" />Limpiar</Boton>}
            </div>
          </Panel>

          <Panel titulo="Consolidado mensual" extra={<Input type="month" className="w-40" value={mesResumenTareo} onChange={(e) => e.target.value && setMesResumenTareo(e.target.value)} />}>
            {consolidadoTareo.length === 0 ? <Vacio texto="Sin días de uso registrados en este mes." /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Vehículo</th><th className={th}>Proyecto</th><th className={`${th} text-right`}>Días de uso</th>
                    {esDinero && <th className={`${th} text-right`}>Costo</th>}<th className={th}></th>
                  </tr></thead>
                  <tbody>
                    {consolidadoTareo.map((registro) => (
                      <tr key={`${registro.vehiculoId}:${registro.proyectoId}`} className="border-b border-line/60">
                        <td className={`${td} font-mono font-semibold`}>{mapaVehiculo.get(registro.vehiculoId)?.placa ?? "—"}</td>
                        <td className={td}>{mapaProyecto.get(registro.proyectoId)?.codigo ?? "—"} · {mapaProyecto.get(registro.proyectoId)?.nombre ?? ""}</td>
                        <td className={`${td} text-right font-mono font-semibold`}>{registro.dias}</td>
                        {esDinero && <td className={`${td} text-right font-mono`}>{fmtSoles(registro.costo)}</td>}
                        <td className={`${td} text-right`}><button type="button" onClick={() => editarDiasTareo(registro.vehiculoId, registro.proyectoId)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary" title="Ver y corregir días" aria-label="Ver y corregir días"><Eye className="size-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {pestaña === "traslados" && (
        <div className="space-y-4">
          <Panel titulo="Registrar traslado a obra">
            <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
              <Campo etiqueta="Fecha"><Input type="date" value={formTras.fecha} onChange={(e) => setFormTras({ ...formTras, fecha: e.target.value })} /></Campo>
              <Campo etiqueta="Vehículo">
                <Select value={formTras.vehiculo_id} onChange={(e) => setFormTras({ ...formTras, vehiculo_id: e.target.value })}>
                  <option value="">— elegir —</option>
                  {vehiculos.filter((v) => v.estado === "Operativo").map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Conductor">
                <Select value={formTras.conductor_id} onChange={(e) => setFormTras({ ...formTras, conductor_id: e.target.value })}>
                  <option value="">— opcional —</option>
                  {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Proyecto (obra destino)">
                <Select value={formTras.proyecto_id} onChange={(e) => setFormTras({ ...formTras, proyecto_id: e.target.value })}>
                  <option value="">— opcional —</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Origen"><Input value={formTras.origen} onChange={(e) => setFormTras({ ...formTras, origen: e.target.value })} /></Campo>
              <Campo etiqueta="Destino"><Input value={formTras.destino} onChange={(e) => setFormTras({ ...formTras, destino: e.target.value })} /></Campo>
              <Campo etiqueta="Km inicial"><Input type="number" value={formTras.km_inicial} onChange={(e) => setFormTras({ ...formTras, km_inicial: e.target.value })} /></Campo>
              <Campo etiqueta="Km final"><Input type="number" value={formTras.km_final} onChange={(e) => setFormTras({ ...formTras, km_final: e.target.value })} /></Campo>
              <Campo etiqueta="Carga o personal"><Input value={formTras.carga} onChange={(e) => setFormTras({ ...formTras, carga: e.target.value })} /></Campo>
              <Campo etiqueta="Combustible (gal)"><Input type="number" step="0.01" value={formTras.combustible_galones} onChange={(e) => setFormTras({ ...formTras, combustible_galones: e.target.value })} /></Campo>
              {esDinero && <Campo etiqueta="Combustible (S/)"><Input type="number" step="0.01" value={formTras.combustible_monto} onChange={(e) => setFormTras({ ...formTras, combustible_monto: e.target.value })} /></Campo>}
              {esDinero && Number(formTras.combustible_monto) > 0 && camposOrigen(formTras, setFormTras)}
              <Campo etiqueta="Observación"><Input value={formTras.observacion} onChange={(e) => setFormTras({ ...formTras, observacion: e.target.value })} /></Campo>
              <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-4">
                <input type="checkbox" checked={formTras.generar_tareo} onChange={(e) => setFormTras({ ...formTras, generar_tareo: e.target.checked })} />
                Generar automáticamente el tareo del día para el proyecto destino
              </label>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Boton onClick={guardarTraslado}><Truck className="size-3.5" />Registrar traslado</Boton>
            </div>
          </Panel>

          <Panel titulo={`Traslados (${traslados.length})`}>
            {traslados.length === 0 ? <Vacio texto="Sin traslados registrados." /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Fecha</th><th className={th}>Vehículo</th><th className={th}>Ruta</th>
                    <th className={th}>Conductor</th><th className={th}>Km</th><th className={th}>Combustible</th>
                    <th className={th}>Carga</th>{esDinero && <th className={th}></th>}
                  </tr></thead>
                  <tbody>
                    {traslados.map((t) => (
                      <tr key={t.id} className="border-b border-line/60">
                        <td className={`${td} font-mono`}>{t.fecha}</td>
                        <td className={td}>{mapaVehiculo.get(t.vehiculo_id)?.placa ?? "—"}</td>
                        <td className={td}>{t.origen} → {t.destino}</td>
                        <td className={td}>{t.conductor_id ? nombreTrabajador.get(t.conductor_id) ?? "—" : "—"}</td>
                        <td className={`${td} font-mono`}>{Math.max(0, Number(t.km_final) - Number(t.km_inicial))}</td>
                        <td className={`${td} font-mono`}>{t.combustible_galones} gal{esDinero && t.combustible_monto ? ` · ${fmtSoles(t.combustible_monto)}` : ""}
                          {esDinero && Number(t.combustible_monto) > 0 && <div className="text-[10px] text-muted-foreground">{nombreOrigen(t)}{t.numero_operacion ? ` · Op. ${t.numero_operacion}` : ""}</div>}</td>
                        <td className={`${td} text-muted-foreground`}>{t.carga}</td>
                        {esDinero && <td className={`${td} text-right`}><button onClick={() => borrarTraslado(t.id)} className="text-bad" aria-label="Eliminar"><Trash2 className="size-3.5" /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {pestaña === "mantenimiento" && (
        <div className="space-y-4">
          {esDinero && (
            <>
              <Panel titulo="Registrar mantenimiento">
                <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                  <Campo etiqueta="Vehículo">
                    <Select value={formMant.vehiculo_id} onChange={(e) => setFormMant({ ...formMant, vehiculo_id: e.target.value })}>
                      <option value="">— elegir —</option>
                      {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
                    </Select>
                  </Campo>
                  <Campo etiqueta="Fecha"><Input type="date" value={formMant.fecha} onChange={(e) => setFormMant({ ...formMant, fecha: e.target.value })} /></Campo>
                  <Campo etiqueta="Tipo">
                    <Select value={formMant.tipo} onChange={(e) => setFormMant({ ...formMant, tipo: e.target.value })}>
                      <option>Preventivo</option><option>Correctivo</option>
                    </Select>
                  </Campo>
                  <Campo etiqueta="Costo (S/)"><Input type="number" step="0.01" value={formMant.costo} onChange={(e) => setFormMant({ ...formMant, costo: e.target.value })} /></Campo>
                  <Campo etiqueta="Km al momento"><Input type="number" value={formMant.km} onChange={(e) => setFormMant({ ...formMant, km: e.target.value })} /></Campo>
                  {camposOrigen(formMant, setFormMant)}
                  <div className="col-span-2 md:col-span-4">
                    <Campo etiqueta="Detalle"><Input value={formMant.detalle} onChange={(e) => setFormMant({ ...formMant, detalle: e.target.value })} placeholder="Cambio de aceite, llantas, frenos…" /></Campo>
                  </div>
                </div>
                <div className="border-t border-line px-5 py-3">
                  <Boton onClick={guardarMantenimiento}><Plus className="size-3.5" />Registrar</Boton>
                </div>
              </Panel>

              <Panel titulo="Plan de mantenimiento preventivo">
                <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                  <Campo etiqueta="Vehículo">
                    <Select value={formPlan.vehiculo_id} onChange={(e) => setFormPlan({ ...formPlan, vehiculo_id: e.target.value })}>
                      <option value="">— elegir —</option>
                      {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa}</option>)}
                    </Select>
                  </Campo>
                  <Campo etiqueta="Tarea"><Input value={formPlan.descripcion} onChange={(e) => setFormPlan({ ...formPlan, descripcion: e.target.value })} placeholder="Cambio de aceite" /></Campo>
                  <Campo etiqueta="Cada (km)"><Input type="number" value={formPlan.cada_km} onChange={(e) => setFormPlan({ ...formPlan, cada_km: e.target.value })} placeholder="5000" /></Campo>
                  <Campo etiqueta="Cada (meses)"><Input type="number" value={formPlan.cada_meses} onChange={(e) => setFormPlan({ ...formPlan, cada_meses: e.target.value })} placeholder="6" /></Campo>
                </div>
                <div className="border-t border-line px-5 py-3">
                  <Boton onClick={guardarPlan}><Plus className="size-3.5" />Agregar al plan</Boton>
                </div>
                {plan.length > 0 && (
                  <div className="overflow-x-auto border-t border-line">
                    <table className="w-full">
                      <thead><tr className="border-b border-line">
                        <th className={th}>Vehículo</th><th className={th}>Tarea</th><th className={th}>Frecuencia</th>
                        <th className={th}>Próximo km</th><th className={th}>Próxima fecha</th><th className={th}></th>
                      </tr></thead>
                      <tbody>
                        {plan.filter((p) => p.activo).map((p) => (
                          <tr key={p.id} className="border-b border-line/60">
                            <td className={td}>{mapaVehiculo.get(p.vehiculo_id)?.placa ?? "—"}</td>
                            <td className={td}>{p.descripcion}</td>
                            <td className={`${td} font-mono`}>{[p.cada_km ? `${p.cada_km} km` : null, p.cada_meses ? `${p.cada_meses} meses` : null].filter(Boolean).join(" / ") || "—"}</td>
                            <td className={`${td} font-mono`}>{p.proximo_km ?? "—"}</td>
                            <td className={`${td} font-mono`}>{p.proxima_fecha ?? "—"}</td>
                            <td className={`${td} text-right`}><button onClick={() => borrarPlan(p.id)} className="text-bad" aria-label="Eliminar"><Trash2 className="size-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}

          <Panel titulo={`Historial de mantenimientos (${mantenimientos.length})`}>
            {mantenimientos.length === 0 ? <Vacio texto="Sin mantenimientos registrados." /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Fecha</th><th className={th}>Vehículo</th><th className={th}>Tipo</th>
                    <th className={th}>Km</th>{esDinero && <th className={th}>Costo</th>}
                    <th className={th}>Detalle</th>{esDinero && <th className={th}></th>}
                  </tr></thead>
                  <tbody>
                    {mantenimientos.map((m) => (
                      <tr key={m.id} className="border-b border-line/60">
                        <td className={`${td} font-mono`}>{m.fecha}</td>
                        <td className={td}>{mapaVehiculo.get(m.vehiculo_id)?.placa ?? "—"}</td>
                        <td className={td}><Etiqueta tono={m.tipo === "Preventivo" ? "good" : "bad"}>{m.tipo}</Etiqueta></td>
                        <td className={`${td} font-mono`}>{m.km}</td>
                        {esDinero && <td className={`${td} font-mono`}>{fmtSoles(m.costo)}</td>}
                        {esDinero && <td className={`${td} text-xs text-muted-foreground`}>{Number(m.costo) > 0 ? nombreOrigen(m) : "—"}{m.numero_operacion ? ` · Op. ${m.numero_operacion}` : ""}</td>}
                        <td className={`${td} text-muted-foreground`}>{m.detalle}</td>
                        {esDinero && <td className={`${td} text-right`}><button onClick={() => borrarMantenimiento(m.id)} className="text-bad" aria-label="Eliminar"><Trash2 className="size-3.5" /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {pestaña === "resumen" && (
        <div className="space-y-4">
          {alertas.length > 0 && (
            <Panel titulo="Alertas de vencimiento">
              <ul className="divide-y divide-line/60 px-5 py-2">
                {alertas.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <Etiqueta tono={a.urgente ? "bad" : "neutro"}>{a.vehiculo}</Etiqueta>
                    <span className={a.urgente ? "font-semibold text-bad" : ""}>{a.texto}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {esDinero ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Movilidad asignada a obras", fmtSoles(tareo.reduce((a, t) => a + Number(t.costo_soles || 0), 0))],
                  ["Ingreso interno flota propia", fmtSoles(resumen.ingresoInterno)],
                  ["Alquiler de terceros", fmtSoles(resumen.alquilerTerceros)],
                  ["Mantenimiento + combustible", fmtSoles(resumen.mantenimientoTotal + resumen.combustibleTotal)],
                ].map(([etiqueta, valor]) => (
                  <div key={etiqueta} className="panel p-4">
                    <p className="label-mono">{etiqueta}</p>
                    <p className="mt-2 font-mono text-lg font-bold">{valor}</p>
                  </div>
                ))}
              </div>
              <Panel titulo="Rentabilidad de flota propia">
                <p className="px-5 py-4 text-sm">
                  Ingreso interno (tareo a obras): <strong className="font-mono">{fmtSoles(resumen.ingresoInterno)}</strong>
                  {" · "}Gasto (mantenimiento + combustible): <strong className="font-mono">{fmtSoles(resumen.mantenimientoTotal + resumen.combustibleTotal)}</strong>
                  {" · "}Resultado: <strong className={`font-mono ${resumen.ingresoInterno - resumen.mantenimientoTotal - resumen.combustibleTotal >= 0 ? "text-good" : "text-bad"}`}>
                    {fmtSoles(resumen.ingresoInterno - resumen.mantenimientoTotal - resumen.combustibleTotal)}
                  </strong>
                </p>
              </Panel>
              <Panel titulo="Movilidad por proyecto">
                {resumen.porProyecto.size === 0 ? <Vacio texto="Sin tareo vehicular aún." /> : (
                  <table className="w-full">
                    <thead><tr className="border-b border-line"><th className={th}>Proyecto</th><th className={th}>Costo de movilidad</th></tr></thead>
                    <tbody>
                      {[...resumen.porProyecto.entries()].map(([pid, costo]) => (
                        <tr key={pid} className="border-b border-line/60">
                          <td className={td}>{mapaProyecto.get(pid)?.codigo ?? "—"} · {mapaProyecto.get(pid)?.nombre ?? ""}</td>
                          <td className={`${td} font-mono`}>{fmtSoles(costo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            </>
          ) : (
            <Panel titulo="Kilometraje por vehículo">
              {vehiculos.length === 0 ? <Vacio texto="Sin vehículos." /> : (
                <table className="w-full">
                  <thead><tr className="border-b border-line"><th className={th}>Vehículo</th><th className={th}>Km recorridos</th><th className={th}>Km actual</th></tr></thead>
                  <tbody>
                    {vehiculos.map((v) => (
                      <tr key={v.id} className="border-b border-line/60">
                        <td className={td}>{v.placa} · {v.marca} {v.modelo}</td>
                        <td className={`${td} font-mono`}>{(resumen.kmPorVehiculo.get(v.id) ?? 0).toLocaleString("es-PE")}</td>
                        <td className={`${td} font-mono`}>{v.km_actual.toLocaleString("es-PE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
