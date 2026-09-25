import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { clasificacionDeCargo, type Trabajador, useCargos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/_authenticated/personal")({
  head: () => ({
    meta: [
      { title: "Personal — ERP TELXEN" },
      { name: "description", content: "Planilla global de personal, cargos y datos bancarios." },
      { property: "og:title", content: "Personal — ERP TELXEN" },
      { property: "og:description", content: "Planilla de personal y jornal diario en Soles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Personal,
});

const REGIMENES = ["General", "MYPE Pequeña", "MYPE Micro", "Construcción Civil", "Agrario"];
const PENSIONES = ["ONP", "AFP Integra", "AFP Prima", "AFP Profuturo", "AFP Habitat", "Ninguno"];

type FormPersonal = {
  dni: string;
  nombre: string;
  cargo: string;
  jornal_diario: string;
  numero_cuenta: string;
  cci: string;
  banco: string;
  numero_celular: string;
  tipo_contratacion: string;
  regimen_laboral: string;
  sistema_pensiones: string;
  cuspp: string;
  fecha_ingreso: string;
  sueldo_mensual: string;
  asignacion_familiar: boolean;
  suspension_cuarta: boolean;
};

const FORM_INICIAL: FormPersonal = {
  dni: "",
  nombre: "",
  cargo: "",
  jornal_diario: "",
  numero_cuenta: "",
  cci: "",
  banco: "",
  numero_celular: "",
  tipo_contratacion: "Planilla",
  regimen_laboral: "General",
  sistema_pensiones: "ONP",
  cuspp: "",
  fecha_ingreso: "",
  sueldo_mensual: "",
  asignacion_familiar: false,
  suspension_cuarta: false,
};

function validar(form: FormPersonal) {
  if (!/^\d{8}$/.test(form.dni)) return "El DNI debe tener 8 dígitos.";
  if (!form.nombre.trim()) return "Ingresa el nombre.";
  if (!form.cargo) return "Selecciona un cargo válido.";
  if (!form.jornal_diario || Number(form.jornal_diario) < 0) return "Ingresa un jornal diario válido.";
  if (!form.numero_cuenta.trim()) return "Ingresa el número de cuenta.";
  if (!/^\d{20}$/.test(form.cci)) return "El CCI debe tener 20 dígitos.";
  if (!form.banco.trim()) return "Ingresa el banco.";
  if (!/^\d{9}$/.test(form.numero_celular)) return "El número de celular debe tener 9 dígitos.";
  if (Number(form.sueldo_mensual || 0) < 0) return "El sueldo mensual no puede ser negativo.";
  if (form.tipo_contratacion === "Planilla" && form.sistema_pensiones.startsWith("AFP") && !form.cuspp.trim())
    return "Ingresa el CUSPP de la AFP.";
  return "";
}

function Personal() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const { data: trabajadores = [] } = useTrabajadores();
  const { data: cargos = [] } = useCargos();
  const cargosActivos = cargos.filter((c) => c.activo);
  const clasifDe = (nombre: string) => clasificacionDeCargo(nombre, cargos);
  const [form, setForm] = useState<FormPersonal>(FORM_INICIAL);
  const [busqueda, setBusqueda] = useState("");
  const trabajadoresFiltrados = trabajadores.filter((t) =>
    coincide(busqueda, t.nombre, t.dni, t.cargo),
  );
  const [editando, setEditando] = useState<{ id: string; datos: FormPersonal } | null>(null);
  const [error, setError] = useState("");

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const datosGuardar = (datos: FormPersonal) => {
    const planilla = datos.tipo_contratacion === "Planilla";
    return {
      dni: datos.dni.trim(),
      nombre: datos.nombre.trim(),
      cargo: datos.cargo,
      jornal_diario: Number(datos.jornal_diario),
      numero_cuenta: datos.numero_cuenta.trim(),
      cci: datos.cci.trim(),
      banco: datos.banco.trim(),
      numero_celular: datos.numero_celular.trim(),
      tipo_contratacion: datos.tipo_contratacion,
      regimen_laboral: datos.regimen_laboral,
      sistema_pensiones: planilla ? datos.sistema_pensiones : "Ninguno",
      cuspp: planilla && datos.sistema_pensiones.startsWith("AFP") ? datos.cuspp.trim() : "",
      fecha_ingreso: datos.fecha_ingreso || null,
      sueldo_mensual: Number(datos.sueldo_mensual || 0),
      asignacion_familiar: planilla && datos.asignacion_familiar,
      suspension_cuarta: !planilla && datos.suspension_cuarta,
    };
  };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const mensaje = validar(form);
    if (mensaje) return setError(mensaje);
    const { error: err } = await supabase.from("trabajadores").insert(datosGuardar(form));
    if (err) return setError(err.message);
    setForm(FORM_INICIAL);
    await qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  function iniciarEdicion(trabajador: Trabajador) {
    setError("");
    setEditando({
      id: trabajador.id,
      datos: {
        dni: trabajador.dni === "PENDIENTE" ? "" : trabajador.dni,
        nombre: trabajador.nombre,
        cargo: cargosActivos.some((c) => c.nombre === trabajador.cargo) ? trabajador.cargo : "",
        jornal_diario: String(trabajador.jornal_diario),
        numero_cuenta: trabajador.numero_cuenta === "PENDIENTE" ? "" : trabajador.numero_cuenta,
        cci: trabajador.cci === "PENDIENTE" ? "" : trabajador.cci,
        banco: trabajador.banco === "PENDIENTE" ? "" : trabajador.banco,
        numero_celular: trabajador.numero_celular === "PENDIENTE" ? "" : trabajador.numero_celular,
        tipo_contratacion: trabajador.tipo_contratacion ?? "Planilla",
        regimen_laboral: trabajador.regimen_laboral ?? "General",
        sistema_pensiones: trabajador.sistema_pensiones ?? "ONP",
        cuspp: trabajador.cuspp ?? "",
        fecha_ingreso: trabajador.fecha_ingreso ?? "",
        sueldo_mensual: String(trabajador.sueldo_mensual ?? 0),
        asignacion_familiar: !!trabajador.asignacion_familiar,
        suspension_cuarta: !!trabajador.suspension_cuarta,
      },
    });
  }

  const camposContrato = (
    f: FormPersonal,
    set: (campo: keyof FormPersonal, valor: string | boolean) => void,
  ) => {
    const planilla = f.tipo_contratacion === "Planilla";
    return (
      <>
        <Campo etiqueta="Tipo de contratación">
          <Select value={f.tipo_contratacion} onChange={(e) => set("tipo_contratacion", e.target.value)} className="py-1.5">
            <option value="Planilla">Planilla (5ta categoría)</option>
            <option value="Honorarios">Recibo por Honorarios (4ta)</option>
          </Select>
        </Campo>
        <Campo etiqueta="Régimen laboral">
          <Select value={f.regimen_laboral} onChange={(e) => set("regimen_laboral", e.target.value)} disabled={!planilla} className="py-1.5">
            {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="Sistema de pensiones">
          <Select value={planilla ? f.sistema_pensiones : "Ninguno"} onChange={(e) => set("sistema_pensiones", e.target.value)} disabled={!planilla} className="py-1.5">
            {PENSIONES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Campo>
        <Campo etiqueta="CUSPP">
          <Input value={f.cuspp} onChange={(e) => set("cuspp", e.target.value.toUpperCase())} disabled={!planilla || !f.sistema_pensiones.startsWith("AFP")} maxLength={12} className="py-1.5" />
        </Campo>
        <Campo etiqueta="Fecha de ingreso">
          <Input type="date" value={f.fecha_ingreso} onChange={(e) => set("fecha_ingreso", e.target.value)} className="py-1.5" />
        </Campo>
        <Campo etiqueta={planilla ? "Sueldo mensual (S/)" : "Honorario mensual (S/)"}>
          <Input type="number" step="0.01" min="0" value={f.sueldo_mensual} onChange={(e) => set("sueldo_mensual", e.target.value)} className="py-1.5" />
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 font-mono text-xs">
          {planilla ? (
            <><input type="checkbox" checked={f.asignacion_familiar} onChange={(e) => set("asignacion_familiar", e.target.checked)} /> Asignación familiar</>
          ) : (
            <><input type="checkbox" checked={f.suspension_cuarta} onChange={(e) => set("suspension_cuarta", e.target.checked)} /> Suspensión de retención 4ta</>
          )}
        </label>
      </>
    );
  };

  async function actualizar(e?: React.MouseEvent) {
    e?.preventDefault();
    if (!editando) return;
    setError("");
    const mensaje = validar(editando.datos);
    if (mensaje) return setError(mensaje);
    const { error: err } = await supabase
      .from("trabajadores")
      .update(datosGuardar(editando.datos))
      .eq("id", editando.id);
    if (err) return setError(err.message);
    setEditando(null);
    await qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar a esta persona de la planilla? Esta acción no se puede deshacer.")) return;
    setError("");
    const { error: err } = await supabase.from("trabajadores").delete().eq("id", id);
    if (err) {
      return setError(
        err.code === "23503"
          ? "No se puede eliminar porque esta persona tiene tareos registrados."
          : err.message,
      );
    }
    await qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  const actualizarCampo = (campo: keyof FormPersonal, valor: string | boolean) => {
    if (!editando) return;
    setEditando({ ...editando, datos: { ...editando.datos, [campo]: valor } });
  };

  return (
    <>
      <Encabezado
        titulo="Gestión de Personal"
        subtitulo="Planilla global de la empresa"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("personal", [
                {
                  nombre: "Personal",
                  filas: trabajadores.map((t) => ({
                    DNI: t.dni,
                    "Apellidos y Nombre(s)": t.nombre,
                    Cargo: t.cargo,
                    Clasificación: clasifDe(t.cargo) === "Indirecto" ? "Staff (Gasto general)" : "Mano de obra directa",
                    "Jornal Diario (S/)": Number(t.jornal_diario),
                    "N° Cuenta": t.numero_cuenta,
                    CCI: t.cci,
                    Banco: t.banco,
                    "N° Celular": t.numero_celular,
                    "Tipo contratación": t.tipo_contratacion === "Honorarios" ? "Recibo por Honorarios" : "Planilla",
                    "Régimen laboral": t.regimen_laboral,
                    "Sistema pensiones": t.sistema_pensiones,
                    CUSPP: t.cuspp,
                    "Fecha ingreso": t.fecha_ingreso ?? "",
                    "Sueldo/Honorario mensual (S/)": Number(t.sueldo_mensual ?? 0),
                    "Asignación familiar": t.asignacion_familiar ? "Sí" : "No",
                    "Suspensión 4ta": t.suspension_cuarta ? "Sí" : "No",
                  })),
                },
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <Panel titulo="Nuevo trabajador" className="mb-4">
        <form onSubmit={guardar} className="grid gap-1.5 p-3 grid-cols-1 sm:grid-cols-[3fr_5fr_4fr_4fr]">
          <Campo etiqueta="DNI">
            <Input inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, "") })} required className="py-1.5" />
          </Campo>
          <Campo etiqueta="Apellidos y Nombre(s)">
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100} className="py-1.5" />
          </Campo>
          <Campo etiqueta="Cargo">
            <Select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value as FormPersonal["cargo"] })} required className="py-1.5">
              <option value="">Selecciona un cargo…</option>
              {cargosActivos.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}{c.clasificacion === "Indirecto" ? " · Staff" : ""}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Jornal diario (S/)">
            <Input type="number" step="0.01" min="0" value={form.jornal_diario} onChange={(e) => setForm({ ...form, jornal_diario: e.target.value })} required className="py-1.5" />
          </Campo>
          <Campo etiqueta="N° Cuenta">
            <Input value={form.numero_cuenta} onChange={(e) => setForm({ ...form, numero_cuenta: e.target.value })} required maxLength={30} className="py-1.5" />
          </Campo>
          <Campo etiqueta="CCI">
            <Input inputMode="numeric" pattern="[0-9]{20}" maxLength={20} value={form.cci} onChange={(e) => setForm({ ...form, cci: e.target.value.replace(/\D/g, "") })} required className="py-1.5" />
          </Campo>
          <Campo etiqueta="Banco">
            <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} required maxLength={80} className="py-1.5" />
          </Campo>
          <Campo etiqueta="N° Celular">
            <Input inputMode="tel" pattern="[0-9]{9}" maxLength={9} value={form.numero_celular} onChange={(e) => setForm({ ...form, numero_celular: e.target.value.replace(/\D/g, "") })} required className="py-1.5" />
          </Campo>
          {camposContrato(form, (c, v) => setForm((f) => ({ ...f, [c]: v })))}
          <div className="flex justify-end col-span-full">
            <Boton type="submit" className="min-w-36">Registrar</Boton>
          </div>
          {error && <p className="font-mono text-xs text-bad col-span-full">{error}</p>}
        </form>
      </Panel>

      <Panel titulo="Planilla"
        extra={
          <div className="flex items-center gap-2">
            <Buscador
              valor={busqueda}
              onChange={setBusqueda}
              total={trabajadoresFiltrados.length}
              placeholder="Buscar por nombre, DNI o cargo..."
            />
            <span className="font-mono text-[11px] text-muted-foreground">{trabajadores.length} trabajadores</span>
          </div>
        }>
        {error && <p className="border-b border-line px-5 py-2 font-mono text-xs text-bad">{error}</p>}
        {trabajadoresFiltrados.length === 0 ? (
          <Vacio
            texto={
              busqueda
                ? `Sin coincidencias para «${busqueda}»`
                : "Aún no hay personal registrado."
            }
          />
        ) : trabajadores.length === 0 ? (
          <Vacio texto="Aún no hay personal registrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1440px] w-full table-fixed font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-muted-foreground">
                  <th className="w-[9%] px-4 py-2 font-medium">DNI</th>
                  <th className="w-[15%] px-3 py-2 font-medium">Apellidos y Nombre(s)</th>
                  <th className="w-[16%] px-3 py-2 font-medium">Cargo</th>
                  <th className="w-[11%] px-3 py-2 text-right font-medium whitespace-nowrap">Jornal diario</th>
                  <th className="w-[13%] px-3 py-2 font-medium">N° Cuenta</th>
                  <th className="w-[15%] px-3 py-2 font-medium">CCI</th>
                  <th className="w-[10%] px-3 py-2 font-medium">Banco</th>
                  <th className="w-[8%] px-3 py-2 font-medium">N° Celular</th>
                  <th className="w-[12%] px-3 py-2 font-medium">Contrato</th>
                  <th className="w-[7%] px-4 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trabajadoresFiltrados.map((t) => {
                  const esEdicion = editando?.id === t.id;
                  const d = editando?.datos;
                  return (
                    <Fragment key={t.id}>
                    <tr className="border-b border-line/60 align-top last:border-0">
                      <td className="px-4 py-2">{esEdicion && d ? <Input inputMode="numeric" maxLength={8} value={d.dni} onChange={(e) => actualizarCampo("dni", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : <Resaltar texto={t.dni} termino={busqueda}/>}</td>
                      <td className="px-3 py-2 font-semibold text-ink">{esEdicion && d ? <Input value={d.nombre} onChange={(e) => actualizarCampo("nombre", e.target.value)} className="py-1 text-xs" maxLength={100} required /> : <Resaltar texto={t.nombre} termino={busqueda}/>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{esEdicion && d ? <Select value={d.cargo} onChange={(e) => actualizarCampo("cargo", e.target.value)} className="py-1 text-xs"><option value="">Selecciona…</option>{cargosActivos.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</Select> : <span className="block"><Resaltar texto={t.cargo} termino={busqueda}/><span className={`mt-0.5 block text-[10px] ${clasifDe(t.cargo) === "Indirecto" ? "text-primary" : "text-muted-foreground"}`}>{clasifDe(t.cargo) === "Indirecto" ? "Staff · Gasto general" : "Mano de obra directa"}</span></span>}</td>
                      <td className="px-3 py-2 text-right">{esEdicion && d ? <Input type="number" step="0.01" min="0" value={d.jornal_diario} onChange={(e) => actualizarCampo("jornal_diario", e.target.value)} className="py-1 text-right text-xs" required /> : soles(Number(t.jornal_diario))}</td>
                      <td className="px-3 py-2 break-all">{esEdicion && d ? <Input value={d.numero_cuenta} onChange={(e) => actualizarCampo("numero_cuenta", e.target.value)} className="py-1 text-xs" maxLength={30} required /> : t.numero_cuenta}</td>
                      <td className="px-3 py-2 break-all">{esEdicion && d ? <Input inputMode="numeric" maxLength={20} value={d.cci} onChange={(e) => actualizarCampo("cci", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : t.cci}</td>
                      <td className="px-3 py-2">{esEdicion && d ? <Input value={d.banco} onChange={(e) => actualizarCampo("banco", e.target.value)} className="py-1 text-xs" maxLength={80} required /> : t.banco}</td>
                      <td className="px-3 py-2">{esEdicion && d ? <Input inputMode="tel" maxLength={9} value={d.numero_celular} onChange={(e) => actualizarCampo("numero_celular", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : t.numero_celular}</td>
                      <td className="px-3 py-2">
                        <span className="block font-semibold text-ink">{t.tipo_contratacion === "Honorarios" ? "RxH" : "Planilla"}</span>
                        <span className="block text-[10px] text-muted-foreground">{t.tipo_contratacion === "Honorarios" ? (t.suspension_cuarta ? "Suspensión 4ta" : "Retención 8%") : `${t.regimen_laboral} · ${t.sistema_pensiones}`}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {esEdicion ? (
                            <>
                              <button type="button" onClick={actualizar} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground" title="Guardar"><Check size={14} /></button>
                              <button type="button" onClick={() => setEditando(null)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted" title="Cancelar"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => iniciarEdicion(t)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary" title="Editar"><Pencil size={14} /></button>
                              <button type="button" onClick={() => eliminar(t.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad" title="Eliminar"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {esEdicion && d && (
                      <tr className="border-b border-line/60 bg-muted/30">
                        <td colSpan={10} className="px-4 py-2">
                          <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">{camposContrato(d, actualizarCampo)}</div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}