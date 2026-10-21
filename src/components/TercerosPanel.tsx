import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Etiqueta, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Check, Plus, Upload, X } from "lucide-react";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { exportarExcel } from "@/lib/exportar";

export type Tercero = {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  es_cliente: boolean;
  es_proveedor: boolean;
  direccion: string;
  telefono: string;
  email: string;
  contacto: string;
  celular_contacto: string;
  activo: boolean;
  es_agente_retencion: boolean;
};

type FormTercero = {
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  es_cliente: boolean;
  es_proveedor: boolean;
  direccion: string;
  telefono: string;
  email: string;
  contacto: string;
  celular_contacto: string;
  es_agente_retencion: boolean;
};

const TIPOS_DOC = ["RUC", "DNI", "CE", "OTRO"];

function validarDoc(tipo: string, numero: string) {
  if (tipo === "RUC" && !/^\d{11}$/.test(numero)) return "El RUC debe tener 11 dígitos.";
  if (tipo === "DNI" && !/^\d{8}$/.test(numero)) return "El DNI debe tener 8 dígitos.";
  if (!numero.trim()) return "Ingresa el número de documento.";
  return "";
}

export function TercerosPanel({ modo }: { modo: "cliente" | "proveedor" }) {
  const qc = useQueryClient();
  const esCliente = modo === "cliente";
  const nombreSingular = esCliente ? "cliente" : "proveedor";
  const nombrePlural = esCliente ? "Clientes" : "Proveedores";

  const formVacio: FormTercero = {
    tipo_documento: "RUC",
    numero_documento: "",
    razon_social: "",
    es_cliente: esCliente,
    es_proveedor: !esCliente,
    direccion: "",
    telefono: "",
    email: "",
    contacto: "",
    celular_contacto: "",
    es_agente_retencion: false,
  };

  const [error, setError] = useState("");
  const [form, setForm] = useState<FormTercero>(formVacio);
  const [editando, setEditando] = useState<Tercero | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ok, setOk] = useState("");
  const [sel, setSel] = useState("");

  const { data: terceros = [] } = useQuery({
    queryKey: ["terceros"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("terceros").select("*").order("razon_social");
      if (err) throw err;
      return (data ?? []) as Tercero[];
    },
  });

  const lista = terceros.filter((t) => (esCliente ? t.es_cliente : t.es_proveedor)).filter((t) =>
    coincide(busqueda, t.numero_documento, t.razon_social, t.contacto, t.email),
  );

  function abrirNuevo() {
    setForm(formVacio);
    setEditando(null);
    setOk("");
    setError("");
    setModalAbierto(true);
  }

  function abrirEdicion(t: Tercero) {
    setForm({
      tipo_documento: t.tipo_documento,
      numero_documento: t.numero_documento,
      razon_social: t.razon_social,
      es_cliente: t.es_cliente,
      es_proveedor: t.es_proveedor,
      direccion: t.direccion,
      telefono: t.telefono,
      email: t.email,
      contacto: t.contacto,
      celular_contacto: t.celular_contacto,
      es_agente_retencion: t.es_agente_retencion,
    });
    setEditando(t);
    setOk("");
    setError("");
    setModalAbierto(true);
  }

  async function guardarTercero(): Promise<string | null> {
    const msg = validarDoc(form.tipo_documento, form.numero_documento);
    if (msg) return msg;
    if (!form.es_cliente && !form.es_proveedor) return "Marca si es Cliente, Proveedor o ambos.";
    const campos = {
      ...form,
      numero_documento: form.numero_documento.trim(),
      razon_social: form.razon_social.trim(),
    };
    const { error: err } = editando
      ? await supabase.from("terceros").update(campos).eq("id", editando.id)
      : await supabase.from("terceros").insert({ ...campos, condicion_pago: "Contado" });
    if (err)
      return err.code === "23505"
        ? "Ya existe un registro con ese número de documento."
        : err.message;
    setOk(
      `${esCliente ? "Cliente" : "Proveedor"} ${editando ? "actualizado" : "registrado"} · ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`,
    );
    if (!editando) setForm(formVacio);
    qc.invalidateQueries({ queryKey: ["terceros"] });
    return null;
  }

  async function eliminarTercero(id: string) {
    if (!window.confirm("¿Eliminar este registro del catálogo? Esta acción no se puede deshacer.")) return;
    const { error: err } = await supabase.from("terceros").delete().eq("id", id);
    if (err) return setError(err.message);
    qc.invalidateQueries({ queryKey: ["terceros"] });
  }

  return (
    <>
      {error && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}

      <div className="flex items-start gap-3">
      <Panel className="min-w-0 flex-1"
        titulo={nombrePlural}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Buscador valor={busqueda} onChange={setBusqueda} total={lista.length} placeholder={`Buscar ${nombreSingular}...`} />
            <Boton
              variante="linea"
              onClick={() =>
                exportarExcel(esCliente ? "clientes" : "proveedores", [
                  {
                    nombre: nombrePlural,
                    filas: lista.map((t) => ({
                      "Tipo Documento": t.tipo_documento,
                      "N° Documento": t.numero_documento,
                      "Razón Social": t.razon_social,
                      Dirección: t.direccion,
                      Teléfono: t.telefono,
                      Contacto: t.contacto,
                      "Celular Contacto": t.celular_contacto,
                      Correo: t.email,
                    })),
                  },
                ])
              }
            >
              <Upload size={13} /> Exportar a Excel
            </Boton>
            <Boton
              variante="accion"
              onClick={abrirNuevo}
            >
              <Plus size={14} /> Registrar {nombreSingular}
            </Boton>
          </div>
        }
      >
        {lista.length === 0 ? (
          <Vacio texto={busqueda ? `Sin coincidencias para «${busqueda}»` : `Aún no hay ${nombrePlural.toLowerCase()} registrados.`} />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="w-[12%] px-5 py-2 font-medium">Documento</th>
                <th className="w-[22%] px-3 py-2 font-medium">Razón social</th>
                <th className="w-[14%] px-3 py-2 font-medium">Dirección</th>
                <th className="w-[10%] px-3 py-2 font-medium">Teléfono</th>
                <th className="w-[15%] px-3 py-2 font-medium">Contacto</th>
                <th className="w-[15%] px-3 py-2 font-medium">Correo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id} onClick={() => setSel(t.id)} onDoubleClick={() => abrirEdicion(t)} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === t.id ? "bg-primary/10" : ""}`}>
                  <td className="px-5 py-2.5">
                    <span className="text-muted-foreground">{t.tipo_documento}</span>{" "}
                    <Resaltar texto={t.numero_documento} termino={busqueda} />
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink">
                    <Resaltar texto={t.razon_social} termino={busqueda} />
                    {esCliente && t.es_proveedor && (
                      <span className="ml-1"><Etiqueta tono="neutro">También proveedor</Etiqueta></span>
                    )}
                    {!esCliente && t.es_cliente && (
                      <span className="ml-1"><Etiqueta tono="neutro">También cliente</Etiqueta></span>
                    )}
                  </td>
                  <td className="truncate px-3 py-2.5 text-muted-foreground">{t.direccion || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{t.telefono || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {t.contacto ? (
                      <>
                        <span className="block truncate text-ink"><Resaltar texto={t.contacto} termino={busqueda} /></span>
                        <span className="block truncate text-[10px]">{t.celular_contacto || "—"}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="truncate px-3 py-2.5 text-muted-foreground">
                    <Resaltar texto={t.email || "—"} termino={busqueda} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto={nombreSingular.toLowerCase()} haySeleccion={!!lista.find((t) => t.id === sel)}
        onAgregar={abrirNuevo}
        onEditar={() => { const t = lista.find((x) => x.id === sel); if (t) abrirEdicion(t); }}
        onEliminar={() => { if (sel) { void eliminarTercero(sel); setSel(""); } }} />
      </div>

      {modalAbierto && (
        <ModalTercero
          nombreSingular={nombreSingular}
          esCliente={esCliente}
          editando={!!editando}
          form={form}
          setForm={setForm}
          ok={ok}
          onGuardar={guardarTercero}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

function ModalTercero({
  nombreSingular,
  esCliente,
  editando,
  form,
  setForm,
  ok,
  onGuardar,
  onCerrar,
}: {
  nombreSingular: string;
  esCliente: boolean;
  editando: boolean;
  form: FormTercero;
  setForm: (f: FormTercero) => void;
  ok: string;
  onGuardar: () => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onCerrar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const msg = await onGuardar();
    setGuardando(false);
    setError(msg ?? "");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={onCerrar}
    >
      <div
        className="panel my-8 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-ink">
              {editando ? "Editar" : "Registrar"} {nombreSingular}
            </h2>
            <p className="text-xs text-muted-foreground">
              {editando
                ? "Los cambios se aplican al catálogo y quedan disponibles para cotizaciones, proyectos y compras."
                : "Se guardará en el catálogo y quedará disponible para cotizaciones, proyectos y compras."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted-foreground hover:bg-muted"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={guardar} className="grid gap-3 p-5 sm:grid-cols-2">
          <Campo etiqueta="Tipo documento">
            <Select
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
              value={form.numero_documento}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
              required
              maxLength={20}
              autoFocus
            />
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Razón social / Nombre">
              <Input
                value={form.razon_social} data-formato="titulo"
                onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                required
                maxLength={160}
              />
            </Campo>
          </div>
          <div className="sm:col-span-2">
            <Campo etiqueta="Dirección">
              <Input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                maxLength={160}
              />
            </Campo>
          </div>
          <Campo etiqueta="Teléfono">
            <Input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              maxLength={30}
            />
          </Campo>
          <Campo etiqueta="Correo electrónico">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={120}
            />
          </Campo>
          <Campo etiqueta="Persona de contacto">
            <Input
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              maxLength={120}
            />
          </Campo>
          <Campo etiqueta="Celular / Teléfono del contacto">
            <Input
              value={form.celular_contacto}
              onChange={(e) => setForm({ ...form, celular_contacto: e.target.value })}
              maxLength={30}
            />
          </Campo>
          {esCliente && (
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-muted/40 px-3 py-2 text-xs text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.es_agente_retencion}
                  onChange={(e) => setForm({ ...form, es_agente_retencion: e.target.checked })}
                />
                <span>
                  <b>Agente de retención del IGV (SUNAT)</b>
                  <span className="block text-[11px] text-muted-foreground">
                    Si el cliente es agente de retención, en ventas de materiales mayores a S/ 700 te retendrá el 3 % del total.
                  </span>
                </span>
              </label>
            </div>
          )}

          {editando && (
            <div className="flex flex-wrap gap-4 rounded-md border border-line bg-muted/40 px-3 py-2 text-xs text-ink sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.es_cliente}
                  onChange={(e) => setForm({ ...form, es_cliente: e.target.checked })}
                />
                Cliente
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.es_proveedor}
                  onChange={(e) => setForm({ ...form, es_proveedor: e.target.checked })}
                />
                Proveedor
              </label>
            </div>
          )}

          {error && <p className="font-mono text-xs text-bad sm:col-span-2">{error}</p>}
          {ok && !error && <p className="font-mono text-xs text-ok sm:col-span-2">{ok}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-3 sm:col-span-2">
            <Boton type="button" variante="linea" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="accion" disabled={guardando}>
              <Check size={14} /> {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar"}
            </Boton>
          </div>
        </form>
      </div>
    </div>
  );
}
