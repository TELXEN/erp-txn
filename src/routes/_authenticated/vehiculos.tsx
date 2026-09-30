import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { soles as fmtSoles } from "@/lib/format";
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
    ],
  }),
  component: PaginaVehiculos,
});

type Proyecto = { id: string; codigo: string; nombre: string };
type Trabajador = { id: string; nombre: string };

type Pestaña = "flota" | "tareo" | "traslados" | "mantenimiento" | "resumen";

const PESTAÑAS: { id: Pestaña; texto: string }[] = [
  { id: "flota", texto: "Flota" },
  { id: "tareo", texto: "Tareo vehicular" },
  { id: "traslados", texto: "Traslados" },
  { id: "mantenimiento", texto: "Mantenimiento" },
  { id: "resumen", texto: "Resumen" },
];

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

  const { data: vehiculos = [] } = useVehiculos();
  const { data: tareo = [] } = useTareoVehiculos();
  const { data: traslados = [] } = useTraslados();
  const { data: mantenimientos = [] } = useMantenimientos();
  const { data: plan = [] } = usePlanMantenimiento();

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

  async function guardarVehiculo() {
    if (!formVeh.placa.trim()) {
      toast.error("La placa es obligatoria");
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
  const VACIO_TAREO = { fecha: new Date().toISOString().slice(0, 10), vehiculo_id: "", proyecto_id: "", conductor_id: "", dias: "1", km: "0", observacion: "" };
  const [formTareo, setFormTareo] = useState(VACIO_TAREO);

  async function guardarTareo() {
    if (!formTareo.vehiculo_id || !formTareo.proyecto_id) {
      toast.error("Elige vehículo y proyecto");
      return;
    }
    const v = mapaVehiculo.get(formTareo.vehiculo_id);
    const fila = {
      fecha: formTareo.fecha,
      vehiculo_id: formTareo.vehiculo_id,
      proyecto_id: formTareo.proyecto_id,
      conductor_id: formTareo.conductor_id || null,
      dias: Number(formTareo.dias) || 0,
      km: Number(formTareo.km) || 0,
      costo_soles: costoTareo(Number(formTareo.dias) || 0, Number(formTareo.km) || 0, v),
      observacion: formTareo.observacion.trim(),
    };
    const { error } = await supabase.from("tareo_vehiculos" as never).insert(fila as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tareo registrado");
    setFormTareo({ ...VACIO_TAREO, vehiculo_id: formTareo.vehiculo_id });
    refrescar();
  }

  async function borrarTareo(id: string) {
    if (!window.confirm("¿Eliminar este registro de tareo?")) return;
    const { error } = await supabase.from("tareo_vehiculos" as never).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refrescar();
  }

  // ---------- Traslados ----------
  const VACIO_TRASLADO = {
    fecha: new Date().toISOString().slice(0, 10), vehiculo_id: "", conductor_id: "", proyecto_id: "",
    origen: "", destino: "", km_inicial: "0", km_final: "0", carga: "",
    combustible_galones: "0", combustible_monto: "0", observacion: "", generar_tareo: true,
  };
  const [formTras, setFormTras] = useState(VACIO_TRASLADO);

  async function guardarTraslado() {
    if (!formTras.vehiculo_id) {
      toast.error("Elige el vehículo");
      return;
    }
    const kmFinal = Number(formTras.km_final) || 0;
    const fila = {
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
      const kmRecorridos = Math.max(0, kmFinal - (Number(formTras.km_inicial) || 0));
      await supabase.from("tareo_vehiculos" as never).insert({
        fecha: formTras.fecha,
        vehiculo_id: formTras.vehiculo_id,
        proyecto_id: formTras.proyecto_id,
        conductor_id: formTras.conductor_id || null,
        dias: 1,
        km: kmRecorridos,
        costo_soles: costoTareo(1, kmRecorridos, v),
        observacion: `Traslado: ${formTras.origen} → ${formTras.destino}`.trim(),
      } as never);
    }
    toast.success("Traslado registrado");
    setFormTras({ ...VACIO_TRASLADO, vehiculo_id: formTras.vehiculo_id });
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
  const VACIO_MANT = { vehiculo_id: "", fecha: new Date().toISOString().slice(0, 10), tipo: "Preventivo", costo: "0", km: "0", detalle: "" };
  const [formMant, setFormMant] = useState(VACIO_MANT);
  const VACIO_PLAN = { vehiculo_id: "", descripcion: "", cada_km: "", cada_meses: "" };
  const [formPlan, setFormPlan] = useState(VACIO_PLAN);

  async function guardarMantenimiento() {
    if (!formMant.vehiculo_id) {
      toast.error("Elige el vehículo");
      return;
    }
    const { error } = await supabase.from("mantenimientos_vehiculo" as never).insert({
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

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {PESTAÑAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestaña(p.id)}
            className={`rounded-t-md px-4 py-2 font-mono text-xs transition-colors ${
              pestaña === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestaña === "flota" && (
        <div className="space-y-4">
          {esDinero && (
            <Panel titulo={editVeh ? "Editar vehículo" : "Registrar vehículo"}>
              <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                <Campo etiqueta="Placa"><Input value={formVeh.placa} onChange={(e) => setFormVeh({ ...formVeh, placa: e.target.value })} placeholder="ABC-123" /></Campo>
                <Campo etiqueta="Marca"><Input value={formVeh.marca} onChange={(e) => setFormVeh({ ...formVeh, marca: e.target.value })} /></Campo>
                <Campo etiqueta="Modelo"><Input value={formVeh.modelo} onChange={(e) => setFormVeh({ ...formVeh, modelo: e.target.value })} /></Campo>
                <Campo etiqueta="Año"><Input type="number" value={formVeh.anio} onChange={(e) => setFormVeh({ ...formVeh, anio: e.target.value })} /></Campo>
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
                <Campo etiqueta="Km actual"><Input type="number" value={formVeh.km_actual} onChange={(e) => setFormVeh({ ...formVeh, km_actual: e.target.value })} /></Campo>
                <Campo etiqueta="Estado">
                  <Select value={formVeh.estado} onChange={(e) => setFormVeh({ ...formVeh, estado: e.target.value })}>
                    {ESTADOS_VEHICULO.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Campo>
                <Campo etiqueta="Vence SOAT"><Input type="date" value={formVeh.soat_vencimiento} onChange={(e) => setFormVeh({ ...formVeh, soat_vencimiento: e.target.value })} /></Campo>
                <Campo etiqueta="Vence rev. técnica"><Input type="date" value={formVeh.revision_tecnica_vencimiento} onChange={(e) => setFormVeh({ ...formVeh, revision_tecnica_vencimiento: e.target.value })} /></Campo>
                <Campo etiqueta="Tarifa interna por día (S/)"><Input type="number" step="0.01" value={formVeh.tarifa_dia} onChange={(e) => setFormVeh({ ...formVeh, tarifa_dia: e.target.value })} /></Campo>
                <Campo etiqueta="Tarifa por km (S/)"><Input type="number" step="0.01" value={formVeh.tarifa_km} onChange={(e) => setFormVeh({ ...formVeh, tarifa_km: e.target.value })} /></Campo>
                <div className="col-span-2 md:col-span-4">
                  <Campo etiqueta="Observación"><Input value={formVeh.observacion} onChange={(e) => setFormVeh({ ...formVeh, observacion: e.target.value })} /></Campo>
                </div>
              </div>
              <div className="flex gap-2 border-t border-line px-5 py-3">
                <Boton onClick={guardarVehiculo}><Plus className="size-3.5" />{editVeh ? "Guardar cambios" : "Registrar"}</Boton>
                {editVeh && <Boton variante="linea" onClick={() => { setEditVeh(null); setFormVeh(VACIO_VEHICULO); }}>Cancelar</Boton>}
              </div>
            </Panel>
          )}

          <Panel titulo={`Flota (${vehiculos.length})`}>
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
          <Panel titulo="Registrar tareo vehicular">
            <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
              <Campo etiqueta="Fecha"><Input type="date" value={formTareo.fecha} onChange={(e) => setFormTareo({ ...formTareo, fecha: e.target.value })} /></Campo>
              <Campo etiqueta="Vehículo">
                <Select value={formTareo.vehiculo_id} onChange={(e) => setFormTareo({ ...formTareo, vehiculo_id: e.target.value })}>
                  <option value="">— elegir —</option>
                  {vehiculos.filter((v) => v.estado === "Operativo").map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Proyecto">
                <Select value={formTareo.proyecto_id} onChange={(e) => setFormTareo({ ...formTareo, proyecto_id: e.target.value })}>
                  <option value="">— elegir —</option>
                  {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Conductor">
                <Select value={formTareo.conductor_id} onChange={(e) => setFormTareo({ ...formTareo, conductor_id: e.target.value })}>
                  <option value="">— opcional —</option>
                  {trabajadores.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </Select>
              </Campo>
              <Campo etiqueta="Días (1 o 0.5)"><Input type="number" step="0.5" min="0" value={formTareo.dias} onChange={(e) => setFormTareo({ ...formTareo, dias: e.target.value })} /></Campo>
              <Campo etiqueta="Km recorridos"><Input type="number" min="0" value={formTareo.km} onChange={(e) => setFormTareo({ ...formTareo, km: e.target.value })} /></Campo>
              {esDinero && (
                <Campo etiqueta="Costo calculado">
                  <Input readOnly value={fmtSoles(costoTareo(Number(formTareo.dias) || 0, Number(formTareo.km) || 0, mapaVehiculo.get(formTareo.vehiculo_id)))} className="font-mono" />
                </Campo>
              )}
              <Campo etiqueta="Observación"><Input value={formTareo.observacion} onChange={(e) => setFormTareo({ ...formTareo, observacion: e.target.value })} /></Campo>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Boton onClick={guardarTareo}><Plus className="size-3.5" />Registrar tareo</Boton>
            </div>
          </Panel>

          <Panel titulo={`Tareo registrado (${tareo.length})`}>
            {tareo.length === 0 ? <Vacio texto="Sin tareo vehicular registrado." /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-line">
                    <th className={th}>Fecha</th><th className={th}>Vehículo</th><th className={th}>Proyecto</th>
                    <th className={th}>Conductor</th><th className={th}>Días</th><th className={th}>Km</th>
                    {esDinero && <th className={th}>Costo</th>}
                    <th className={th}>Observación</th>{esDinero && <th className={th}></th>}
                  </tr></thead>
                  <tbody>
                    {tareo.map((t) => (
                      <tr key={t.id} className="border-b border-line/60">
                        <td className={`${td} font-mono`}>{t.fecha}</td>
                        <td className={td}>{mapaVehiculo.get(t.vehiculo_id)?.placa ?? "—"}</td>
                        <td className={td}>{mapaProyecto.get(t.proyecto_id)?.codigo ?? "—"}</td>
                        <td className={td}>{t.conductor_id ? nombreTrabajador.get(t.conductor_id) ?? "—" : "—"}</td>
                        <td className={`${td} font-mono`}>{t.dias}</td>
                        <td className={`${td} font-mono`}>{t.km}</td>
                        {esDinero && <td className={`${td} font-mono`}>{fmtSoles(t.costo_soles)}</td>}
                        <td className={`${td} text-muted-foreground`}>{t.observacion}</td>
                        {esDinero && <td className={`${td} text-right`}><button onClick={() => borrarTareo(t.id)} className="text-bad" aria-label="Eliminar"><Trash2 className="size-3.5" /></button></td>}
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
                        <td className={`${td} font-mono`}>{t.combustible_galones} gal{esDinero && t.combustible_monto ? ` · ${fmtSoles(t.combustible_monto)}` : ""}</td>
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
                  <div className="col-span-2 md:col-span-3">
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
