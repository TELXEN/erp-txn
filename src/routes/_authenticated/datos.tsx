import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Building2, Check, Coins, FolderKanban, HardHat, Pencil, Ruler, Trash2, Upload, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { exportarExcel } from "@/lib/exportar";
import {
  InsigniaCategoriaGasto,
  InsigniaPrioridad,
  InsigniaSituacion,
  InsigniaTipoPresupuesto,
} from "@/components/estado-ui";
import {
  type ClasificacionCargo,
  useCargos,
  useCategoriasGastoGeneral,
  useGastosGenerales,
  useTiposPresupuesto,
  useTrabajadores,
} from "@/lib/datos";
import { PRIORIDADES, SITUACIONES, tonoPrioridad, tonoSituacion } from "@/lib/configuracion";
import { DatosEmpresa } from "@/components/DatosEmpresa";
import { CodificacionProyectos } from "@/components/CodificacionProyectos";
import { CodificacionCotizaciones } from "@/components/CodificacionCotizaciones";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { PartidasMaestras } from "@/components/PartidasMaestras";
import { CuentasBancarias, type CuentaBancaria } from "@/components/CuentasBancarias";
import { CategoriasPartida } from "@/components/CategoriasPartida";

export const Route = createFileRoute("/_authenticated/datos")({
  head: () => ({
    meta: [
      { title: "Datos — ERP TELXEN" },
      {
        name: "description",
        content: "Catálogos maestros de terceros (clientes y proveedores) y bancos del ERP TELXEN.",
      },
      { property: "og:title", content: "Datos — ERP TELXEN" },
      { property: "og:description", content: "Registro central de clientes, proveedores y bancos." },
    ],
  }),
  component: Datos,
});

type Tercero = {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  es_cliente: boolean;
  es_proveedor: boolean;
  direccion: string;
  telefono: string;
  email: string;
  activo: boolean;
};

type Banco = CuentaBancaria;
type Catalogo = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  tipo?: string;
};
type Pestana =
  | "terceros"
  | "bancos"
  | "cargos"
  | "categoriasgg"
  | "costos"
  | "ingresos"
  | "centros"
  | "configuracion"
  | "codificacion"
  | "codificacioncot"
  | "especialidades"
  | "categorias"
  | "unidades"
  | "maestras"
  | "empresa";

const GRUPOS_CONFIG: { titulo: string; icono: React.ElementType; items: [Pestana, string][] }[] = [
  { titulo: "Empresa y Terceros", icono: Building2, items: [["empresa", "Datos de la empresa"], ["bancos", "Cuentas bancarias"], ["terceros", "Clientes y proveedores"]] },
  { titulo: "Catálogo técnico (WBS)", icono: Ruler, items: [["especialidades", "Especialidad de partidas"], ["categorias", "Categorías de partidas"], ["maestras", "Registro de partidas"], ["unidades", "Unidades de medida"]] },
  { titulo: "Proyectos y Cotizaciones", icono: FolderKanban, items: [["codificacion", "Codificación de proyectos"], ["codificacioncot", "Codificación de cotizaciones"], ["configuracion", "Parámetros de proyectos"]] },
  { titulo: "Costos y Finanzas", icono: Coins, items: [["categoriasgg", "Categorías de gastos generales"], ["centros", "Centros de costos"], ["costos", "Rubros de costos"], ["ingresos", "Rubros de ingresos"]] },
  { titulo: "Recursos Humanos", icono: HardHat, items: [["cargos", "Cargos del personal"]] },
];

const TIPOS_DOC = ["RUC", "DNI", "CE", "OTRO"];
const MONEDAS = ["PEN", "USD", "PEN/USD"];

const ETIQUETA_MONEDA: Record<string, string> = {
  PEN: "Soles (S/)",
  USD: "Dólares (US$)",
  "PEN/USD": "Soles y Dólares",
};

const formVacio = {
  tipo_documento: "RUC",
  numero_documento: "",
  razon_social: "",
  es_cliente: true,
  es_proveedor: false,
  direccion: "",
  telefono: "",
  email: "",
};

function Datos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const [pestana, setPestana] = useState<Pestana>("terceros");
  const [filtro, setFiltro] = useState<"todos" | "clientes" | "proveedores">("todos");
  const [error, setError] = useState("");
  const [form, setForm] = useState(formVacio);
  const [editando, setEditando] = useState<Tercero | null>(null);

  const { data: terceros = [] } = useQuery({
    queryKey: ["terceros"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("terceros").select("*").order("razon_social");
      if (err) throw err;
      return (data ?? []) as Tercero[];
    },
  });

  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("bancos").select("*").order("nombre");
      if (err) throw err;
      return (data ?? []) as Banco[];
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_financieras"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("categorias_financieras")
        .select("*")
        .order("codigo");
      if (err) throw err;
      return (data ?? []) as Catalogo[];
    },
  });

  const { data: centros = [] } = useQuery({
    queryKey: ["centros_costos"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("centros_costos").select("*").order("codigo");
      if (err) throw err;
      return (data ?? []) as Catalogo[];
    },
  });

  if (!puedeVerDinero(rol)) return <SinAcceso />;

  const lista = terceros.filter((t) =>
    filtro === "clientes" ? t.es_cliente : filtro === "proveedores" ? t.es_proveedor : true,
  );

  function validarDoc(tipo: string, numero: string) {
    if (tipo === "RUC" && !/^\d{11}$/.test(numero)) return "El RUC debe tener 11 dígitos.";
    if (tipo === "DNI" && !/^\d{8}$/.test(numero)) return "El DNI debe tener 8 dígitos.";
    if (!numero.trim()) return "Ingresa el número de documento.";
    return "";
  }

  async function guardarTercero(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const msg = validarDoc(form.tipo_documento, form.numero_documento);
    if (msg) return setError(msg);
    if (!form.es_cliente && !form.es_proveedor) return setError("Marca si es Cliente, Proveedor o ambos.");
    const { error: err } = await supabase.from("terceros").insert({
      ...form,
      numero_documento: form.numero_documento.trim(),
      razon_social: form.razon_social.trim(),
      condicion_pago: "Contado",
    });
    if (err)
      return setError(
        err.code === "23505" ? "Ya existe un registro con ese número de documento." : err.message,
      );
    setForm(formVacio);
    qc.invalidateQueries({ queryKey: ["terceros"] });
  }

  async function actualizarTercero() {
    if (!editando) return;
    setError("");
    const msg = validarDoc(editando.tipo_documento, editando.numero_documento);
    if (msg) return setError(msg);
    if (!editando.es_cliente && !editando.es_proveedor)
      return setError("Marca si es Cliente, Proveedor o ambos.");
    const { id, ...campos } = editando;
    const { error: err } = await supabase.from("terceros").update(campos).eq("id", id);
    if (err)
      return setError(
        err.code === "23505" ? "Ya existe un registro con ese número de documento." : err.message,
      );
    setEditando(null);
    qc.invalidateQueries({ queryKey: ["terceros"] });
  }

  async function eliminarTercero(id: string) {
    if (!window.confirm("¿Eliminar este registro del catálogo? Esta acción no se puede deshacer.")) return;
    const { error: err } = await supabase.from("terceros").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["terceros"] });
  }


  return (
    <>
      <Encabezado
        titulo="Datos"
        subtitulo="Catálogos maestros"
        acciones={
          <Boton
            variante="linea"
            onClick={() =>
              exportarExcel("datos-maestros", [
                {
                  nombre: "Terceros",
                  filas: terceros.map((t) => ({
                    "Tipo Documento": t.tipo_documento,
                    "N° Documento": t.numero_documento,
                    "Razón Social": t.razon_social,
                    Cliente: t.es_cliente ? "Sí" : "No",
                    Proveedor: t.es_proveedor ? "Sí" : "No",
                    Dirección: t.direccion,
                    Teléfono: t.telefono,
                    Correo: t.email,
                  })),
                },
                {
                  nombre: "Bancos",
                  filas: bancos.map((b) => ({
                    Banco: b.nombre,
                    Moneda: b.monedas,
                    Tipo: b.tipo_cuenta,
                    "N° Cuenta": b.numero_cuenta,
                    CCI: b.cci,
                    "Saldo Inicial": Number(b.saldo_inicial),
                    "Fecha Saldo": b.fecha_saldo_inicial,
                    Estado: b.activo ? "Activa" : "Inactiva",
                  })),
                },
                {
                  nombre: "Costos",
                  filas: categorias
                    .filter((c) => c.tipo === "Costo")
                    .map((c) => ({ Código: c.codigo, Nombre: c.nombre, Descripción: c.descripcion })),
                },
                {
                  nombre: "Ingresos",
                  filas: categorias
                    .filter((c) => c.tipo === "Ingreso")
                    .map((c) => ({ Código: c.codigo, Nombre: c.nombre, Descripción: c.descripcion })),
                },
                {
                  nombre: "Centros de costos",
                  filas: centros.map((c) => ({ Código: c.codigo, Nombre: c.nombre, Descripción: c.descripcion })),
                },
              ])
            }
          >
            <Upload size={13} /> Exportar a Excel
          </Boton>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <nav className="h-fit space-y-4 rounded-md border border-line bg-card p-3 lg:sticky lg:top-20">
          {GRUPOS_CONFIG.map((g) => {
            const Icono = g.icono;
            return (
              <div key={g.titulo}>
                <p className="mb-1 flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Icono size={12} /> {g.titulo}
                </p>
                <div className="space-y-0.5">
                  {g.items.map(([p, texto]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPestana(p);
                        setError("");
                      }}
                      className={`block w-full rounded-md border-l-2 px-3 py-1.5 text-left text-xs transition-colors ${
                        pestana === p
                          ? "border-cta bg-primary/10 font-semibold text-primary"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"
                      }`}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="min-w-0">

      {error && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}

      {pestana === "terceros" ? (
        <>
          <Panel titulo="Nuevo tercero" className="mb-4">
            <form onSubmit={guardarTercero} className="grid gap-2 p-3 sm:grid-cols-4">
              <Campo etiqueta="Tipo documento">
                <Select
                  className="py-1.5"
                  value={form.tipo_documento}
                  onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                >
                  {TIPOS_DOC.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo etiqueta="N° documento">
                <Input
                  className="py-1.5"
                  value={form.numero_documento}
                  onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
                  required
                  maxLength={20}
                />
              </Campo>
              <Campo etiqueta="Razón social / Nombre">
                <Input
                  className="py-1.5"
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  required
                  maxLength={160}
                />
              </Campo>
              <Campo etiqueta="Dirección">
                <Input
                  className="py-1.5"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  maxLength={160}
                />
              </Campo>
              <Campo etiqueta="Teléfono">
                <Input
                  className="py-1.5"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  maxLength={30}
                />
              </Campo>
              <Campo etiqueta="Correo electrónico">
                <Input
                  className="py-1.5"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={120}
                />
              </Campo>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-1.5 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={form.es_cliente}
                    onChange={(e) => setForm({ ...form, es_cliente: e.target.checked })}
                  />
                  Cliente
                </label>
                <label className="flex items-center gap-1.5 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={form.es_proveedor}
                    onChange={(e) => setForm({ ...form, es_proveedor: e.target.checked })}
                  />
                  Proveedor
                </label>
              </div>
              <div className="sm:col-span-4">
                <Boton type="submit">Registrar tercero</Boton>
              </div>
            </form>
          </Panel>

          <Panel
            titulo="Clientes y proveedores"
            extra={
              <div className="flex items-center gap-2">
                <div className="w-44">
                  <Select
                    className="py-1"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value as typeof filtro)}
                  >
                    <option value="todos">Todos</option>
                    <option value="clientes">Solo clientes</option>
                    <option value="proveedores">Solo proveedores</option>
                  </Select>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{lista.length} registros</span>
              </div>
            }
          >
            {lista.length === 0 ? (
              <Vacio texto="Aún no hay terceros registrados." />
            ) : (
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-[12%] px-5 py-2 font-medium">Documento</th>
                    <th className="w-[24%] px-3 py-2 font-medium">Razón social</th>
                    <th className="w-[12%] px-3 py-2 font-medium">Tipo</th>
                    <th className="w-[16%] px-3 py-2 font-medium">Dirección</th>
                    <th className="w-[10%] px-3 py-2 font-medium">Teléfono</th>
                    <th className="w-[14%] px-3 py-2 font-medium">Correo</th>
                    <th className="w-[22%] px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((t) =>
                    editando?.id === t.id ? (
                      <tr key={t.id} className="border-b border-line/60 last:border-0 align-top">
                        <td className="px-5 py-2">
                          <Select
                            className="py-1 text-xs"
                            value={editando.tipo_documento}
                            onChange={(e) => setEditando({ ...editando, tipo_documento: e.target.value })}
                          >
                            {TIPOS_DOC.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </Select>
                          <Input
                            className="mt-1 py-1 text-xs"
                            value={editando.numero_documento}
                            onChange={(e) => setEditando({ ...editando, numero_documento: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="py-1 text-xs"
                            value={editando.razon_social}
                            onChange={(e) => setEditando({ ...editando, razon_social: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editando.es_cliente}
                              onChange={(e) => setEditando({ ...editando, es_cliente: e.target.checked })}
                            />
                            Cliente
                          </label>
                          <label className="mt-1 flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editando.es_proveedor}
                              onChange={(e) => setEditando({ ...editando, es_proveedor: e.target.checked })}
                            />
                            Proveedor
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="py-1 text-xs"
                            value={editando.direccion}
                            onChange={(e) => setEditando({ ...editando, direccion: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="py-1 text-xs"
                            value={editando.telefono}
                            onChange={(e) => setEditando({ ...editando, telefono: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            className="py-1 text-xs"
                            value={editando.email}
                            onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                          />
                        </td>
                        <td className="px-5 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={actualizarTercero}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                              title="Guardar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditando(null)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={t.id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-2.5">
                          <span className="text-muted-foreground">{t.tipo_documento}</span> {t.numero_documento}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-ink">{t.razon_social}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {t.es_cliente && <Etiqueta tono="good">Cliente</Etiqueta>}
                            {t.es_proveedor && <Etiqueta tono="neutro">Proveedor</Etiqueta>}
                          </div>
                        </td>
                        <td className="truncate px-3 py-2.5 text-muted-foreground">{t.direccion || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{t.telefono || "—"}</td>
                        <td className="truncate px-3 py-2.5 text-muted-foreground">{t.email || "—"}</td>
                        <td className="px-5 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditando(t)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarTercero(t.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      ) : pestana === "bancos" ? (
        <CuentasBancarias />
      ) : pestana === "cargos" ? (
        <CargosPersonal />
      ) : pestana === "categoriasgg" ? (
        <CategoriasGastoGeneral />
      ) : pestana === "configuracion" ? (
        <ConfiguracionProyectos />
      ) : pestana === "codificacion" ? (
        <CodificacionProyectos />
      ) : pestana === "codificacioncot" ? (
        <CodificacionCotizaciones />
      ) : pestana === "especialidades" ? (
        <EspecialidadesPartida />
      ) : pestana === "categorias" ? (
        <CategoriasPartida />
      ) : pestana === "unidades" ? (
        <UnidadesMedida />
      ) : pestana === "maestras" ? (
        <PartidasMaestras />
      ) : pestana === "empresa" ? (
        <DatosEmpresa />
      ) : (
        <CatalogoMaestro
          clase={pestana === "centros" ? "centro" : pestana === "costos" ? "Costo" : "Ingreso"}
          registros={
            pestana === "centros"
              ? centros
              : categorias.filter((c) => c.tipo === (pestana === "costos" ? "Costo" : "Ingreso"))
          }
        />
      )}
        </div>
      </div>
    </>
  );
}

function CatalogoMaestro({
  clase,
  registros,
}: {
  clase: "Costo" | "Ingreso" | "centro";
  registros: Catalogo[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ codigo: "", nombre: "", descripcion: "" });
  const [editando, setEditando] = useState<Catalogo | null>(null);
  const [error, setError] = useState("");
  const esCentro = clase === "centro";
  const singular = esCentro ? "centro de costos" : clase.toLowerCase();
  const titulo = esCentro ? "Centros de costos" : `${clase}s`;
  const queryKey = esCentro ? "centros_costos" : "categorias_financieras";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const campos = {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
    };
    const resultado = esCentro
      ? await supabase.from("centros_costos").insert(campos)
      : await supabase.from("categorias_financieras").insert({ ...campos, tipo: clase });
    if (resultado.error) {
      setError(resultado.error.code === "23505" ? `Ya existe un ${singular} con ese código.` : resultado.error.message);
      return;
    }
    setForm({ codigo: "", nombre: "", descripcion: "" });
    qc.invalidateQueries({ queryKey: [queryKey] });
  }

  async function actualizar() {
    if (!editando) return;
    setError("");
    const campos = {
      codigo: editando.codigo.trim().toUpperCase(),
      nombre: editando.nombre.trim(),
      descripcion: editando.descripcion.trim(),
    };
    const resultado = esCentro
      ? await supabase.from("centros_costos").update(campos).eq("id", editando.id)
      : await supabase.from("categorias_financieras").update(campos).eq("id", editando.id);
    if (resultado.error) {
      setError(resultado.error.code === "23505" ? `Ya existe un ${singular} con ese código.` : resultado.error.message);
      return;
    }
    setEditando(null);
    qc.invalidateQueries({ queryKey: [queryKey] });
  }

  async function eliminar(id: string) {
    if (!window.confirm(`¿Eliminar este ${singular}? Esta acción no se puede deshacer.`)) return;
    const resultado = esCentro
      ? await supabase.from("centros_costos").delete().eq("id", id)
      : await supabase.from("categorias_financieras").delete().eq("id", id);
    if (resultado.error) return setError(resultado.error.message);
    qc.invalidateQueries({ queryKey: [queryKey] });
  }

  return (
    <>
      <Panel titulo={`Nuevo ${singular}`} className="mb-4">
        <form onSubmit={guardar} className="grid gap-2 p-3 sm:grid-cols-[1fr_2fr_3fr_auto]">
          <Campo etiqueta="Código">
            <Input
              className="py-1.5 uppercase"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              required
              maxLength={30}
            />
          </Campo>
          <Campo etiqueta="Nombre">
            <Input
              className="py-1.5"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              maxLength={120}
            />
          </Campo>
          <Campo etiqueta="Descripción">
            <Input
              className="py-1.5"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              maxLength={240}
            />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit">Registrar</Boton>
          </div>
        </form>
      </Panel>

      {error && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}

      <Panel
        titulo={`${titulo} registrados`}
        extra={<span className="font-mono text-[11px] text-muted-foreground">{registros.length} registros</span>}
      >
        {registros.length === 0 ? (
          <Vacio texto={`Aún no hay ${titulo.toLowerCase()} registrados.`} />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-2/12 px-5 py-2 font-medium">Código</th>
                <th className="w-3/12 px-3 py-2 font-medium">Nombre</th>
                <th className="w-5/12 px-3 py-2 font-medium">Descripción</th>
                <th className="w-2/12 px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) =>
                editando?.id === registro.id ? (
                  <tr key={registro.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2">
                      <Input className="py-1 uppercase" value={editando.codigo} onChange={(e) => setEditando({ ...editando, codigo: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input className="py-1" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input className="py-1" value={editando.descripcion} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={actualizar} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground" title="Guardar"><Check size={14} /></button>
                        <button type="button" onClick={() => setEditando(null)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted" title="Cancelar"><X size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={registro.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-ink">{registro.codigo}</td>
                    <td className="px-3 py-2.5">{registro.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{registro.descripcion || "—"}</td>
                    <td className="px-5 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setEditando(registro)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary" title="Editar"><Pencil size={14} /></button>
                        <button type="button" onClick={() => eliminar(registro.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad" title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

function CargosPersonal() {
  const qc = useQueryClient();
  const { data: cargos = [] } = useCargos();
  const { data: trabajadores = [] } = useTrabajadores();
  const [nuevo, setNuevo] = useState<{ nombre: string; clasificacion: ClasificacionCargo }>({
    nombre: "",
    clasificacion: "Directo",
  });
  const [editando, setEditando] = useState<{ id: string; nombre: string; clasificacion: ClasificacionCargo; original: string } | null>(null);
  const [error, setError] = useState("");

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["cargos"] });
    await qc.invalidateQueries({ queryKey: ["trabajadores"] });
  };

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nombre = nuevo.nombre.trim().toUpperCase();
    if (!nombre) return;
    const { error: err } = await supabase
      .from("cargos")
      .insert({ nombre, clasificacion: nuevo.clasificacion, orden: cargos.length + 1 });
    if (err) return setError(err.code === "23505" ? "Ese cargo ya existe." : err.message);
    setNuevo({ nombre: "", clasificacion: "Directo" });
    await refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const nombre = editando.nombre.trim().toUpperCase();
    if (!nombre) return setError("Ingresa el nombre del cargo.");
    const { error: err } = await supabase
      .from("cargos")
      .update({ nombre, clasificacion: editando.clasificacion })
      .eq("id", editando.id);
    if (err) return setError(err.code === "23505" ? "Ese cargo ya existe." : err.message);
    if (nombre !== editando.original) {
      const { error: err2 } = await supabase
        .from("trabajadores")
        .update({ cargo: nombre })
        .eq("cargo", editando.original);
      if (err2) return setError(err2.message);
    }
    setEditando(null);
    await refrescar();
  }

  async function eliminar(id: string, nombre: string) {
    const enUso = trabajadores.filter((t) => t.cargo === nombre).length;
    if (enUso > 0) return setError(`No se puede eliminar: ${enUso} persona(s) tienen el cargo ${nombre}.`);
    if (!window.confirm(`¿Eliminar el cargo ${nombre}?`)) return;
    setError("");
    const { error: err } = await supabase.from("cargos").delete().eq("id", id);
    if (err) return setError(err.message);
    await refrescar();
  }

  return (
    <Panel titulo="Cargos del personal">
      <div className="p-5">
        <p className="mb-3 text-xs text-muted-foreground">
          Cada cargo define si el pago de esa persona se costea como <strong>mano de obra directa</strong> (va al costo de
          la obra) o como <strong>personal técnico / staff</strong> (se acumula en gastos generales). El tareo separa los
          montos automáticamente según esta clasificación.
        </p>

        <form onSubmit={agregar} className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <Input
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            placeholder="Ej. INGENIERO DE CALIDAD"
            maxLength={60}
          />
          <Select
            value={nuevo.clasificacion}
            onChange={(e) => setNuevo({ ...nuevo, clasificacion: e.target.value as ClasificacionCargo })}
          >
            <option value="Directo">Mano de obra directa</option>
            <option value="Indirecto">Staff técnico (gasto general)</option>
          </Select>
          <Boton type="submit">Agregar</Boton>
        </form>
        {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}

        <div className="space-y-2">
          {cargos.map((c) => {
            const esEdicion = editando?.id === c.id;
            const personas = trabajadores.filter((t) => t.cargo === c.nombre).length;
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2">
                {esEdicion && editando ? (
                  <>
                    <Input
                      className="min-w-40 flex-1 py-1 text-xs"
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      maxLength={60}
                    />
                    <Select
                      className="w-56 py-1 text-xs"
                      value={editando.clasificacion}
                      onChange={(e) => setEditando({ ...editando, clasificacion: e.target.value as ClasificacionCargo })}
                    >
                      <option value="Directo">Mano de obra directa</option>
                      <option value="Indirecto">Staff técnico (gasto general)</option>
                    </Select>
                    <button type="button" onClick={guardar} title="Guardar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"><Check size={14} /></button>
                    <button type="button" onClick={() => setEditando(null)} title="Cancelar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-mono text-xs font-semibold text-ink">{c.nombre}</span>
                    <Etiqueta tono={c.clasificacion === "Indirecto" ? "neutro" : "good"}>
                      {c.clasificacion === "Indirecto" ? "Staff · Gasto general" : "Mano de obra directa"}
                    </Etiqueta>
                    <span className="font-mono text-[10px] text-muted-foreground">{personas} persona(s)</span>
                    <button type="button" onClick={() => setEditando({ id: c.id, nombre: c.nombre, clasificacion: c.clasificacion, original: c.nombre })} title="Editar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"><Pencil size={14} /></button>
                    <button type="button" onClick={() => eliminar(c.id, c.nombre)} title="Eliminar" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function CategoriasGastoGeneral() {
  const qc = useQueryClient();
  const { data: categorias = [] } = useCategoriasGastoGeneral();
  const { data: gastos = [] } = useGastosGenerales();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
    descripcion: string;
    original: string;
  } | null>(null);
  const [error, setError] = useState("");

  const refrescar = async () => {
    await qc.invalidateQueries({ queryKey: ["categorias_gasto_general"] });
    await qc.invalidateQueries({ queryKey: ["gastos_generales"] });
  };

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const limpio = nombre.trim();
    if (!limpio) return;
    const { error: err } = await supabase
      .from("categorias_gasto_general")
      .insert({ nombre: limpio, descripcion: descripcion.trim(), orden: categorias.length + 1 });
    if (err) return setError(err.code === "23505" ? "Esa categoría ya existe." : err.message);
    setNombre("");
    setDescripcion("");
    await refrescar();
  }

  async function guardar() {
    if (!editando) return;
    setError("");
    const limpio = editando.nombre.trim();
    if (!limpio) return setError("Ingresa el nombre de la categoría.");
    const { error: err } = await supabase
      .from("categorias_gasto_general")
      .update({ nombre: limpio, descripcion: editando.descripcion.trim() })
      .eq("id", editando.id);
    if (err) return setError(err.code === "23505" ? "Esa categoría ya existe." : err.message);
    if (limpio !== editando.original) {
      const { error: err2 } = await supabase
        .from("gastos_generales")
        .update({ categoria: limpio })
        .eq("categoria", editando.original);
      if (err2) return setError(err2.message);
    }
    setEditando(null);
    await refrescar();
  }

  async function alternarActivo(id: string, activo: boolean) {
    setError("");
    const { error: err } = await supabase.from("categorias_gasto_general").update({ activo: !activo }).eq("id", id);
    if (err) return setError(err.message);
    await refrescar();
  }

  async function eliminar(id: string, nombreCat: string) {
    const enUso = gastos.filter((g) => (g.categoria ?? "") === nombreCat).length;
    if (enUso > 0) return setError(`No se puede eliminar: ${enUso} gasto(s) usan la categoría ${nombreCat}.`);
    if (!window.confirm(`¿Eliminar la categoría ${nombreCat}?`)) return;
    setError("");
    const { error: err } = await supabase.from("categorias_gasto_general").delete().eq("id", id);
    if (err) return setError(err.message);
    await refrescar();
  }

  return (
    <Panel titulo="Categorías de gastos generales">
      <div className="p-5">
        <p className="mb-3 text-xs text-muted-foreground">
          Clasifica los costos indirectos de obra y oficina: alquileres, servicios, seguridad, viáticos, seguros y
          asesorías. Cada gasto general se registra con una de estas categorías y se puede filtrar por ellas.
        </p>

        <form onSubmit={agregar} className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Mantenimiento de vehículos"
            maxLength={60}
          />
          <Input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué gastos incluye esta categoría (guía para quien registra)"
            maxLength={200}
          />
          <Boton type="submit">Agregar</Boton>
        </form>
        {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}

        <div className="space-y-2">
          {categorias.map((c) => {
            const esEdicion = editando?.id === c.id;
            const usos = gastos.filter((g) => (g.categoria ?? "") === c.nombre).length;
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line px-3 py-2">
                {esEdicion && editando ? (
                  <>
                    <Input
                      className="min-w-40 flex-1 py-1 text-xs"
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      maxLength={60}
                    />
                    <Input
                      className="min-w-56 flex-[2] py-1 text-xs"
                      value={editando.descripcion}
                      onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                      placeholder="Descripción de la categoría"
                      maxLength={200}
                    />
                    <button
                      type="button"
                      onClick={guardar}
                      title="Guardar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      title="Cancelar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 basis-full sm:basis-auto">
                      <InsigniaCategoriaGasto valor={c.nombre} />
                      {c.descripcion && (
                        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                          {c.descripcion}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{usos} gasto(s)</span>
                    <button
                      type="button"
                      onClick={() => alternarActivo(c.id, c.activo)}
                      className="font-mono text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                    >
                      {c.activo ? "Activa" : "Inactiva"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditando({
                          id: c.id,
                          nombre: c.nombre,
                          descripcion: c.descripcion ?? "",
                          original: c.nombre,
                        })
                      }
                      title="Editar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(c.id, c.nombre)}
                      title="Eliminar"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function TiposPresupuesto() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const { data: tipos = [] } = useTiposPresupuesto();

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const limpio = nombre.trim();
    if (!limpio) return;
    const { error: err } = await supabase
      .from("tipos_presupuesto")
      .insert({ nombre: limpio, es_contractual: false, orden: tipos.length + 1 });
    if (err) return setError(err.message);
    setNombre("");
    qc.invalidateQueries({ queryKey: ["tipos_presupuesto"] });
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este tipo de presupuesto?")) return;
    const { error: err } = await supabase.from("tipos_presupuesto").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["tipos_presupuesto"] });
  }

  return (
    <Panel titulo="Tipos de presupuesto (adicionales)">
      <div className="p-5">
        <p className="mb-3 text-xs text-muted-foreground">
          Clasificación de cada partida: contrato original, adicionales, mayores metrados y deductivos.
        </p>
        <form onSubmit={agregar} className="mb-3 flex gap-2">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Adicional 04 / Adenda Muro de Contención"
            maxLength={60}
          />
          <Boton type="submit">Agregar</Boton>
        </form>
        {error && <p className="mb-2 font-mono text-xs text-bad">{error}</p>}
        <div className="space-y-2">
          {tipos.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <InsigniaTipoPresupuesto valor={t.nombre} />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.es_contractual ? "Contrato original" : "Adicional"}
                </span>
                <button
                  type="button"
                  onClick={() => eliminar(t.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-bad hover:text-bad"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ConfiguracionProyectos() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel titulo="Estado del proyecto">
        <div className="space-y-2 p-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Escala de estados usada en los tableros Kanban de proyectos y partidas.
          </p>
          {SITUACIONES.map((s) => (
            <div key={s} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <InsigniaSituacion valor={s} />
              <span className="font-mono text-[10px] text-muted-foreground">{tonoSituacion(s).fondo}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel titulo="Prioridad">
        <div className="space-y-2 p-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Nivel de urgencia asignado a cada proyecto y partida.
          </p>
          {PRIORIDADES.map((p) => (
            <div key={p} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <InsigniaPrioridad valor={p} />
              <span className="font-mono text-[10px] text-muted-foreground">{tonoPrioridad(p).fondo}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="lg:col-span-2">
        <TiposPresupuesto />
      </div>
    </div>
  );
}
