import { createFileRoute } from "@tanstack/react-router";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Stethoscope, Trash2, Upload, Users, X, UserRound, Briefcase, Wallet, Landmark, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { consultarDocumentoSunat } from "@/lib/decolecta.functions";
import { EmoPanel } from "@/components/personal/EmoPanel";
import { estadoEmo, ESTADO_EMO_INFO, ultimoEmoPorTrabajador, useEmos } from "@/lib/emo";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio, VentanaFlotante } from "@/components/ui-kit";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { soles } from "@/lib/format";
import { clasificacionDeCargo, type Trabajador, useCargos, useTrabajadores } from "@/lib/datos";
import { exportarExcel } from "@/lib/exportar";
import { FechaPeru } from "./gastos-directos";
import { useRef, type ReactNode } from "react";

const BANCOS = ["BCP", "BBVA", "Interbank", "Scotiabank", "Banco de la Nación", "BanBif", "Banco Pichincha", "Caja Arequipa", "Caja Huancayo", "Caja Piura", "Otro"];

function CampoF({ etiqueta, req, children, className = "" }: { etiqueta: string; req?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-[11px] font-semibold text-ink">{etiqueta}{req && <span className="ml-0.5 text-bad">*</span>}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

/** Acento de cada grupo del formulario: un color distinto por bloque para diferenciarlos de un vistazo. */
const TONO_SECCION = {
  personal: { barra: "border-l-chip-1", fondo: "bg-chip-1/5", acento: "text-chip-1", chip: "bg-chip-1" },
  laboral: { barra: "border-l-chip-codificacion", fondo: "bg-chip-codificacion/5", acento: "text-chip-codificacion", chip: "bg-chip-codificacion" },
  sueldo: { barra: "border-l-chip-mat", fondo: "bg-chip-mat/5", acento: "text-chip-mat", chip: "bg-chip-mat" },
  pensiones: { barra: "border-l-chip-margenes", fondo: "bg-chip-margenes/5", acento: "text-chip-margenes", chip: "bg-chip-margenes" },
} as const;

function Seccion({ titulo, paso, icono: Icono, tono, children }: { titulo: string; paso?: number; icono?: typeof Users; tono: keyof typeof TONO_SECCION; children: ReactNode }) {
  const t = TONO_SECCION[tono];
  return (
    <div className={`min-w-0 rounded-md border border-line border-l-[3px] p-2.5 ${t.barra} ${t.fondo}`}>
      <h3 className="mb-2 flex items-center gap-1.5 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink">
        {paso && <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-chip-foreground ${t.chip}`}>{paso}</span>}
        {Icono && <Icono size={13} className={t.acento} />}
        {titulo}
      </h3>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function aplicarCambio(f: FormPersonal, campo: keyof FormPersonal, valor: string | boolean): FormPersonal {
  const n = { ...f, [campo]: valor } as FormPersonal;
  if (campo === "jornal_diario") {
    const v = Number(valor);
    n.sueldo_mensual = valor === "" || !isFinite(v) ? "" : (v * 30).toFixed(2);
  } else if (campo === "sueldo_mensual") {
    const v = Number(valor);
    n.jornal_diario = valor === "" || !isFinite(v) ? "" : (v / 30).toFixed(2);
  } else if (campo === "sistema_pensiones" && !String(valor).startsWith("AFP")) {
    n.cuspp = "";
  }
  return n;
}

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
  const [pestana, setPestana] = useState<"personal" | "emo">("personal");
  const [formAbierto, setFormAbierto] = useState(false);
  const cerrarTrasGuardar = useRef(false);
  const guardandoRef = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [registrado, setRegistrado] = useState("");
  const dniRef = useRef<HTMLInputElement>(null);
  const { data: emos = [] } = useEmos(puedeVerDinero(rol));
  const ultimos = ultimoEmoPorTrabajador(emos);
  const alertasEmo = trabajadores.filter((t) => { const s = estadoEmo(ultimos.get(t.id)?.fecha_vencimiento); return s === "vencido" || s === "por_vencer"; }).length;
  const hayVencidos = trabajadores.some((t) => estadoEmo(ultimos.get(t.id)?.fecha_vencimiento) === "vencido");
  const dniDuplicado = /^\d{8}$/.test(form.dni) && trabajadores.some((t) => t.dni === form.dni);
  const faltante = dniDuplicado ? "Ya existe un trabajador con ese DNI." : validar(form);
  const setFormC = (campo: keyof FormPersonal, valor: string | boolean) => setForm((f) => aplicarCambio(f, campo, valor));
  const fnReniec = useServerFn(consultarDocumentoSunat);
  const [consultando, setConsultando] = useState<"" | "reniec">("");
  const [msgReniec, setMsgReniec] = useState("");
  async function consultarReniec() {
    setConsultando("reniec"); setMsgReniec("");
    try {
      const r = await fnReniec({ data: { numero: form.dni } });
      if (r.encontrado) { setFormC("nombre", r.razonSocial); setMsgReniec("Nombre obtenido de RENIEC"); }
      else setMsgReniec(r.mensaje || "No se encontró el DNI.");
    } catch { setMsgReniec("No se pudo consultar RENIEC."); }
    setConsultando("");
  }

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
    if (guardandoRef.current || consultando) return;
    setError("");
    setRegistrado("");
    const mensaje = dniDuplicado ? "Ya existe un trabajador con ese DNI." : validar(form);
    if (mensaje) { cerrarTrasGuardar.current = false; setError(mensaje); return; }
    const cerrar = cerrarTrasGuardar.current;
    let guardado = false;
    cerrarTrasGuardar.current = false;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const { error: err } = await supabase.from("trabajadores").insert(datosGuardar(form));
      if (err) { setError(err.message); return; }
      setRegistrado(`${form.nombre.trim()} registrado correctamente.`);
      guardado = true;
      setForm(FORM_INICIAL);
      setMsgReniec("");
      if (cerrar) setFormAbierto(false);
      await qc.invalidateQueries({ queryKey: ["trabajadores"] });
    } catch {
      setError("No se pudo guardar el trabajador. Revisa la conexión e inténtalo nuevamente.");
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
      if (guardado && !cerrar) requestAnimationFrame(() => dniRef.current?.focus());
    }
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

  type Setter = (campo: keyof FormPersonal, valor: string | boolean) => void;

  const seccionLaboral = (f: FormPersonal, set: Setter, conCargo: boolean) => {
    const planilla = f.tipo_contratacion === "Planilla";
    return (
      <>
        {conCargo && (
          <CampoF etiqueta="Cargo" req>
            <Select value={f.cargo} onChange={(e) => set("cargo", e.target.value)} required className="py-1.5">
              <option value="">Selecciona un cargo…</option>
              {cargosActivos.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}{c.clasificacion === "Indirecto" ? " · Staff" : ""}</option>)}
            </Select>
          </CampoF>
        )}
        <CampoF etiqueta="Tipo de contratación">
          <Select value={f.tipo_contratacion} onChange={(e) => set("tipo_contratacion", e.target.value)} className="py-1.5">
            <option value="Planilla">Planilla (5ta categoría)</option>
            <option value="Honorarios">Recibo por Honorarios (4ta)</option>
          </Select>
        </CampoF>
        <CampoF etiqueta="Régimen laboral">
          <Select value={f.regimen_laboral} onChange={(e) => set("regimen_laboral", e.target.value)} disabled={!planilla} className="py-1.5">
            {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </CampoF>
        <CampoF etiqueta="Fecha de ingreso">
          <FechaPeru valor={f.fecha_ingreso} onChange={(v) => set("fecha_ingreso", v)} />
        </CampoF>
      </>
    );
  };

  const seccionSalario = (f: FormPersonal, set: Setter, conCuenta: boolean) => {
    const planilla = f.tipo_contratacion === "Planilla";
    return (
      <>
        <CampoF etiqueta="Jornal diario (S/)" req>
          <Input type="number" step="0.01" min="0" value={f.jornal_diario} onChange={(e) => set("jornal_diario", e.target.value)} required className="py-1.5 text-right" />
        </CampoF>
        <CampoF etiqueta={planilla ? "Sueldo mensual (S/)" : "Honorario mensual (S/)"}>
          <Input type="number" step="0.01" min="0" value={f.sueldo_mensual} onChange={(e) => set("sueldo_mensual", e.target.value)} className="py-1.5 text-right" />
        </CampoF>
        <p className="col-span-full -mt-1 text-[11px] text-muted-foreground">Se calculan entre sí: sueldo = jornal × 30.</p>
        {conCuenta && (
          <>
            <CampoF etiqueta="Banco" req>
              <Select value={f.banco} onChange={(e) => set("banco", e.target.value)} required className="py-1.5">
                <option value="">Selecciona un banco…</option>
                {f.banco && !BANCOS.includes(f.banco) && <option value={f.banco}>{f.banco}</option>}
                {BANCOS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </CampoF>
            <CampoF etiqueta="N° Cuenta" req>
              <Input value={f.numero_cuenta} onChange={(e) => set("numero_cuenta", e.target.value)} required maxLength={30} className="py-1.5" />
            </CampoF>
            <div className="col-span-full">
              <CampoF etiqueta="CCI (20 dígitos)" req>
                <Input inputMode="numeric" pattern="[0-9]{20}" maxLength={20} value={f.cci} onChange={(e) => set("cci", e.target.value.replace(/\D/g, ""))} required className="py-1.5" />
              </CampoF>
            </div>
          </>
        )}
        <label className="col-span-full flex items-center gap-2 text-sm text-ink">
          {planilla ? (
            <><input type="checkbox" checked={f.asignacion_familiar} onChange={(e) => set("asignacion_familiar", e.target.checked)} /> Asignación familiar</>
          ) : (
            <><input type="checkbox" checked={f.suspension_cuarta} onChange={(e) => set("suspension_cuarta", e.target.checked)} /> Suspensión de retención 4ta</>
          )}
        </label>
      </>
    );
  };

  const seccionPrevision = (f: FormPersonal, set: Setter) => {
    const planilla = f.tipo_contratacion === "Planilla";
    const esAfp = planilla && f.sistema_pensiones.startsWith("AFP");
    return (
      <>
        <CampoF etiqueta="Sistema de pensiones / AFP">
          <Select value={planilla ? f.sistema_pensiones : "Ninguno"} onChange={(e) => set("sistema_pensiones", e.target.value)} disabled={!planilla} className="py-1.5">
            {PENSIONES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </CampoF>
        <CampoF etiqueta="CUSPP" req={esAfp}>
          <Input
            value={esAfp ? f.cuspp : ""}
            onChange={(e) => set("cuspp", e.target.value.toUpperCase())}
            disabled={!esAfp}
            placeholder={!planilla ? "No aplica para honorarios" : f.sistema_pensiones === "ONP" ? "No aplica para ONP" : esAfp ? "Código AFP" : "No aplica"}
            maxLength={12}
            className="py-1.5"
          />
        </CampoF>
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
          ? "No se puede eliminar porque esta persona tiene tareos o exámenes médicos (EMO) registrados."
          : err.message,
      );
    }
    await qc.invalidateQueries({ queryKey: ["trabajadores"] });
  }

  const actualizarCampo = (campo: keyof FormPersonal, valor: string | boolean) => {
    if (!editando) return;
    setEditando({ ...editando, datos: aplicarCambio(editando.datos, campo, valor) });
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

      <div className="mb-4 flex flex-wrap gap-1">
        <Boton variante={pestana === "personal" ? "primario" : "linea"} onClick={() => setPestana("personal")}><Users size={13} /> Personal</Boton>
        <Boton variante={pestana === "emo" ? "primario" : "linea"} onClick={() => setPestana("emo")}>
          <Stethoscope size={13} /> EMO (Exámenes médicos)
          {alertasEmo > 0 && <span className={`ml-1 rounded-full px-1.5 text-[10px] font-bold text-primary-foreground ${hayVencidos ? "bg-bad" : "bg-warn"}`}>{alertasEmo}</span>}
        </Boton>
      </div>

      {pestana === "emo" ? <EmoPanel trabajadores={trabajadores} /> : <>
      <VentanaFlotante abierta={formAbierto} onCerrar={() => { setFormAbierto(false); setForm(FORM_INICIAL); setError(""); }} titulo="Nuevo trabajador" subtitulo="Los datos se agrupan en cuatro bloques: personales, laborales, sueldo y pago, y régimen de pensiones." ancho="max-w-4xl" ocultarBarra>
        <form onSubmit={guardar}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing || !(e.target instanceof HTMLInputElement) || e.target.type === "checkbox") return;
            e.preventDefault();
            cerrarTrasGuardar.current = false;
            e.currentTarget.requestSubmit();
          }}
          className="[&_input:not([type=checkbox])]:h-9 [&_input:not([type=checkbox])]:text-sm [&_select]:h-9 [&_select]:text-sm [&_label>span]:text-[11px] [&_label_button]:h-9 [&_label_button]:text-xs">
          <fieldset disabled={guardando} className="min-w-0 border-0 p-3 sm:px-4">
          <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
            <Seccion titulo="Datos personales" paso={1} icono={UserRound} tono="personal">
              <CampoF etiqueta="DNI" req className="col-span-full">
                <div className="flex items-center gap-2">
                  <Input ref={dniRef} autoFocus aria-label="DNI" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={form.dni} onChange={(e) => setFormC("dni", e.target.value.replace(/\D/g, ""))} required className={`min-w-0 flex-1 tabular-nums ${dniDuplicado ? "border-bad" : ""}`} placeholder="8 dígitos" />
                  <Boton type="button" variante="linea" className="h-9 shrink-0 px-2.5 text-xs" title="Consultar RENIEC" onClick={consultarReniec} disabled={consultando !== "" || !/^\d{8}$/.test(form.dni) || dniDuplicado}>
                    <Search size={16} />{consultando === "reniec" ? "…" : "RENIEC"}
                  </Boton>
                </div>
                <span className={`mt-0.5 block text-[11px] ${dniDuplicado ? "text-bad" : "text-muted-foreground"}`}>{dniDuplicado ? "DNI ya registrado" : msgReniec || `${form.dni.length}/8`}</span>
              </CampoF>
              <CampoF etiqueta="N° Celular" req>
                <Input inputMode="tel" pattern="[0-9]{9}" maxLength={9} value={form.numero_celular} onChange={(e) => setFormC("numero_celular", e.target.value.replace(/\D/g, ""))} required className="py-1.5" placeholder="9 dígitos" />
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{form.numero_celular.length}/9</span>
              </CampoF>
              <div className="col-span-full">
                <CampoF etiqueta="Apellidos y Nombre(s)" req>
                  <Input value={form.nombre} onChange={(e) => setFormC("nombre", e.target.value)} required maxLength={100} className="py-1.5" placeholder="Ej. QUISPE MAMANI, Juan" />
                </CampoF>
              </div>
            </Seccion>
            <Seccion titulo="Datos laborales" paso={2} icono={Briefcase} tono="laboral">{seccionLaboral(form, setFormC, true)}</Seccion>
            <Seccion titulo="Sueldo y pago" paso={3} icono={Wallet} tono="sueldo">{seccionSalario(form, setFormC, true)}</Seccion>
            <Seccion titulo="Régimen de pensiones" paso={4} icono={Landmark} tono="pensiones">
              {seccionPrevision(form, setFormC)}
            </Seccion>
          </div>
          </fieldset>
           <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-card px-4 py-2.5">
            <p role="status" aria-live="polite" className={`w-full text-xs md:mr-auto md:w-auto md:flex-1 ${error ? "text-bad" : registrado ? "text-good" : "text-muted-foreground"}`}>{error || registrado || (faltante ? `Falta: ${faltante}` : "Todo listo para registrar.")}</p>
            <Boton type="button" variante="linea" className="min-h-9 px-3 text-xs" onClick={() => { setForm(FORM_INICIAL); setError(""); setFormAbierto(false); }}>Cancelar</Boton>
            <Boton type="submit" variante="linea" disabled={!!faltante || guardando || consultando !== ""} className="min-h-9 min-w-32 px-3 text-xs" onClick={() => { cerrarTrasGuardar.current = false; }}>{guardando ? "Guardando…" : "Registrar otro"}</Boton>
            <Boton type="submit" variante="accion" disabled={!!faltante || guardando || consultando !== ""} className="min-h-9 min-w-32 px-3 text-xs" onClick={() => { cerrarTrasGuardar.current = true; }}>Registrar y cerrar</Boton>
          </div>
        </form>
      </VentanaFlotante>

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
             <Boton variante="accion" onClick={() => { setRegistrado(""); setMsgReniec(""); setError(""); cerrarTrasGuardar.current = false; setFormAbierto(true); }}><Plus size={13} /> Nuevo trabajador</Boton>
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
            <table className="min-w-[1540px] w-full table-fixed font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase text-ink bg-muted/50">
                  <th className="w-[9%] px-4 py-2 font-medium">DNI</th>
                  <th className="w-[15%] px-3 py-2 font-medium">Apellidos y Nombre(s)</th>
                  <th className="w-[16%] px-3 py-2 font-medium">Cargo</th>
                  <th className="w-[11%] px-3 py-2 text-right font-medium whitespace-nowrap">Jornal diario</th>
                  <th className="w-[13%] px-3 py-2 font-medium">N° Cuenta</th>
                  <th className="w-[15%] px-3 py-2 font-medium">CCI</th>
                  <th className="w-[10%] px-3 py-2 font-medium">Banco</th>
                  <th className="w-[8%] px-3 py-2 font-medium">N° Celular</th>
                  <th className="w-[12%] px-3 py-2 font-medium">Contrato</th>
                  <th className="w-[8%] px-3 py-2 font-medium">EMO</th>
                  <th className="w-[7%] px-4 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trabajadoresFiltrados.map((t) => {
                  const esEdicion = editando?.id === t.id;
                  const d = editando?.datos;
                  return (
                    <Fragment key={t.id}>
                    <tr className="border-b border-line/60 align-top last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3.5">{esEdicion && d ? <Input inputMode="numeric" maxLength={8} value={d.dni} onChange={(e) => actualizarCampo("dni", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : <Resaltar texto={t.dni} termino={busqueda}/>}</td>
                      <td className="px-3 py-3.5 font-semibold text-ink">{esEdicion && d ? <Input value={d.nombre} onChange={(e) => actualizarCampo("nombre", e.target.value)} className="py-1 text-xs" maxLength={100} required /> : <Resaltar texto={t.nombre} termino={busqueda}/>}</td>
                      <td className="px-3 py-3.5 text-ink">{esEdicion && d ? <Select value={d.cargo} onChange={(e) => actualizarCampo("cargo", e.target.value)} className="py-1 text-xs"><option value="">Selecciona…</option>{cargosActivos.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</Select> : <span className="block"><Resaltar texto={t.cargo} termino={busqueda}/><span className="mt-1 inline-block rounded-full border border-line bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{clasifDe(t.cargo) === "Indirecto" ? "Staff · Gasto general" : "Mano de obra directa"}</span></span>}</td>
                      <td className="px-3 py-3.5 text-right">{esEdicion && d ? <Input type="number" step="0.01" min="0" value={d.jornal_diario} onChange={(e) => actualizarCampo("jornal_diario", e.target.value)} className="py-1 text-right text-xs" required /> : <span className="whitespace-nowrap tabular-nums">{soles(Number(t.jornal_diario))}</span>}</td>
                      <td className="px-3 py-3.5 break-all">{esEdicion && d ? <Input value={d.numero_cuenta} onChange={(e) => actualizarCampo("numero_cuenta", e.target.value)} className="py-1 text-xs" maxLength={30} required /> : t.numero_cuenta}</td>
                      <td className="px-3 py-3.5 break-all">{esEdicion && d ? <Input inputMode="numeric" maxLength={20} value={d.cci} onChange={(e) => actualizarCampo("cci", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : t.cci}</td>
                      <td className="px-3 py-3.5">{esEdicion && d ? <Input value={d.banco} onChange={(e) => actualizarCampo("banco", e.target.value)} className="py-1 text-xs" maxLength={80} required /> : t.banco}</td>
                      <td className="px-3 py-3.5">{esEdicion && d ? <Input inputMode="tel" maxLength={9} value={d.numero_celular} onChange={(e) => actualizarCampo("numero_celular", e.target.value.replace(/\D/g, ""))} className="py-1 text-xs" required /> : t.numero_celular}</td>
                      <td className="px-3 py-3.5">
                        <span className="block font-semibold text-ink">{t.tipo_contratacion === "Honorarios" ? "RxH" : "Planilla"}</span>
                        <span className="block text-[10px] text-muted-foreground">{t.tipo_contratacion === "Honorarios" ? (t.suspension_cuarta ? "Suspensión 4ta" : "Retención 8%") : `${t.regimen_laboral} · ${t.sistema_pensiones}`}</span>
                      </td>
                      <td className="px-3 py-3.5">{(() => { const s = estadoEmo(ultimos.get(t.id)?.fecha_vencimiento); return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px]"><span className={`h-2 w-2 rounded-full ${ESTADO_EMO_INFO[s].punto}`} />{ESTADO_EMO_INFO[s].texto}</span>; })()}</td>
                      <td className="px-4 py-3.5">
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
                        <td colSpan={11} className="px-4 py-2">
                          <div className="grid gap-3 sm:grid-cols-3"><div className="grid grid-cols-2 gap-3 content-start">{seccionLaboral(d, actualizarCampo, false)}</div><div className="grid grid-cols-2 gap-3 content-start">{seccionSalario(d, actualizarCampo, false)}</div><div className="grid grid-cols-2 gap-3 content-start">{seccionPrevision(d, actualizarCampo)}</div></div>
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
      </>}
    </>
  );
}