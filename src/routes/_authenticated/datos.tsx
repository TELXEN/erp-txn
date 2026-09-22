import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Etiqueta, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { puedeVerDinero, useAuth } from "@/lib/auth";
import { exportarExcel } from "@/lib/exportar";
import { InsigniaPrioridad, InsigniaSituacion } from "@/components/estado-ui";
import { PRIORIDADES, SITUACIONES, tonoPrioridad, tonoSituacion } from "@/lib/configuracion";

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
  condicion_pago: string;
  activo: boolean;
};

type Banco = { id: string; nombre: string; monedas: string; activo: boolean };
type Catalogo = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  tipo?: string;
};
type Pestana = "terceros" | "bancos" | "costos" | "ingresos" | "centros" | "configuracion";

const TIPOS_DOC = ["RUC", "DNI", "CE", "OTRO"];
const CONDICIONES = ["Contado", "Credito 15 dias", "Credito 30 dias", "Credito 60 dias"];
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
  condicion_pago: "Contado",
};

function Datos() {
  const { rol } = useAuth();
  const qc = useQueryClient();
  const [pestana, setPestana] = useState<Pestana>("terceros");
  const [filtro, setFiltro] = useState<"todos" | "clientes" | "proveedores">("todos");
  const [error, setError] = useState("");
  const [form, setForm] = useState(formVacio);
  const [editando, setEditando] = useState<Tercero | null>(null);
  const [formBanco, setFormBanco] = useState({ nombre: "", monedas: "PEN" });
  const [editandoBanco, setEditandoBanco] = useState<Banco | null>(null);

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

  async function guardarBanco(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: err } = await supabase
      .from("bancos")
      .insert({ nombre: formBanco.nombre.trim(), monedas: formBanco.monedas });
    if (err)
      return setError(err.code === "23505" ? "Ese banco ya está registrado." : err.message);
    setFormBanco({ nombre: "", monedas: "PEN" });
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  async function actualizarBanco() {
    if (!editandoBanco) return;
    setError("");
    const { error: err } = await supabase
      .from("bancos")
      .update({ nombre: editandoBanco.nombre.trim(), monedas: editandoBanco.monedas })
      .eq("id", editandoBanco.id);
    if (err)
      return setError(err.code === "23505" ? "Ese banco ya está registrado." : err.message);
    setEditandoBanco(null);
    qc.invalidateQueries({ queryKey: ["bancos"] });
  }

  async function eliminarBanco(id: string) {
    if (!window.confirm("¿Eliminar este banco del catálogo? Esta acción no se puede deshacer.")) return;
    const { error: err } = await supabase.from("bancos").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["bancos"] });
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
                    "Condición de Pago": t.condicion_pago,
                  })),
                },
                {
                  nombre: "Bancos",
                  filas: bancos.map((b) => ({ Banco: b.nombre, Monedas: b.monedas })),
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
            Exportar a Excel
          </Boton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["terceros", "bancos", "costos", "ingresos", "centros", "configuracion", "empresa"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPestana(p);
              setError("");
            }}
            className={`rounded-md px-3 py-2 font-mono text-xs transition-colors ${
              pestana === p
                ? "bg-primary text-primary-foreground"
                : "border border-line text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {{
              terceros: "Clientes y Proveedores",
              bancos: "Bancos",
              costos: "Costos",
              ingresos: "Ingresos",
              centros: "Centro de costos",
              configuracion: "Configuración proyectos",
            }[p]}
          </button>
        ))}
      </div>


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
              <Campo etiqueta="Condición de pago">
                <Select
                  className="py-1.5"
                  value={form.condicion_pago}
                  onChange={(e) => setForm({ ...form, condicion_pago: e.target.value })}
                >
                  {CONDICIONES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
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
                    <th className="w-[12%] px-3 py-2 font-medium">Condición</th>
                    <th className="w-[10%] px-5 py-2"></th>
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
                        <td className="px-3 py-2">
                          <Select
                            className="py-1 text-xs"
                            value={editando.condicion_pago}
                            onChange={(e) => setEditando({ ...editando, condicion_pago: e.target.value })}
                          >
                            {CONDICIONES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
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
                        <td className="px-3 py-2.5 text-muted-foreground">{t.condicion_pago}</td>
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
        <>
          <Panel titulo="Nuevo banco" className="mb-4">
            <form onSubmit={guardarBanco} className="grid gap-2 p-3 sm:grid-cols-4">
              <Campo etiqueta="Nombre del banco">
                <Input
                  className="py-1.5"
                  value={formBanco.nombre}
                  onChange={(e) => setFormBanco({ ...formBanco, nombre: e.target.value })}
                  required
                  maxLength={120}
                />
              </Campo>
              <Campo etiqueta="Monedas admitidas">
                <Select
                  className="py-1.5"
                  value={formBanco.monedas}
                  onChange={(e) => setFormBanco({ ...formBanco, monedas: e.target.value })}
                >
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {ETIQUETA_MONEDA[m]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <div className="flex items-end">
                <Boton type="submit">Registrar banco</Boton>
              </div>
            </form>
          </Panel>

          <Panel
            titulo="Bancos registrados"
            extra={<span className="font-mono text-[11px] text-muted-foreground">{bancos.length} registros</span>}
          >
            {bancos.length === 0 ? (
              <Vacio texto="Aún no hay bancos registrados." />
            ) : (
              <table className="w-full table-fixed font-mono text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="w-6/12 px-5 py-2 font-medium">Banco</th>
                    <th className="w-4/12 px-3 py-2 font-medium">Monedas</th>
                    <th className="w-2/12 px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {bancos.map((b) =>
                    editandoBanco?.id === b.id ? (
                      <tr key={b.id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-2">
                          <Input
                            className="py-1 text-xs"
                            value={editandoBanco.nombre}
                            onChange={(e) => setEditandoBanco({ ...editandoBanco, nombre: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            className="py-1 text-xs"
                            value={editandoBanco.monedas}
                            onChange={(e) => setEditandoBanco({ ...editandoBanco, monedas: e.target.value })}
                          >
                            {MONEDAS.map((m) => (
                              <option key={m} value={m}>
                                {ETIQUETA_MONEDA[m]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-5 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={actualizarBanco}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                              title="Guardar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoBanco(null)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-muted"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={b.id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-2.5 font-semibold text-ink">{b.nombre}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{ETIQUETA_MONEDA[b.monedas]}</td>
                        <td className="px-5 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditandoBanco(b)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:border-primary hover:text-primary"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarBanco(b.id)}
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
      ) : pestana === "configuracion" ? (
        <ConfiguracionProyectos />
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

function ConfiguracionProyectos() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel titulo="Status de proyecto">
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
    </div>
  );
}
