import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Etiqueta, Input, Panel, Select, Vacio } from "@/components/ui-kit";
import { Buscador, coincide, Resaltar } from "@/components/Buscador";
import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
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
  };

  const [error, setError] = useState("");
  const [form, setForm] = useState<FormTercero>(formVacio);
  const [editando, setEditando] = useState<Tercero | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [ok, setOk] = useState("");

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

  async function guardarTercero(): Promise<string | null> {
    const msg = validarDoc(form.tipo_documento, form.numero_documento);
    if (msg) return msg;
    const { error: err } = await supabase.from("terceros").insert({
      ...form,
      numero_documento: form.numero_documento.trim(),
      razon_social: form.razon_social.trim(),
      condicion_pago: "Contado",
    });
    if (err)
      return err.code === "23505"
        ? "Ya existe un registro con ese número de documento."
        : err.message;
    setForm(formVacio);
    qc.invalidateQueries({ queryKey: ["terceros"] });
    return null;
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
      {error && <p className="mb-3 font-mono text-xs text-bad">{error}</p>}

      <Panel
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
              onClick={() => {
                setForm(formVacio);
                setOk("");
                setModalNuevo(true);
              }}
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
                <th className="w-[12%] px-5 py-2"></th>
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
                        value={editando.razon_social} data-formato="titulo"
                        onChange={(e) => setEditando({ ...editando, razon_social: e.target.value })}
                      />
                      <div className="mt-1 flex gap-3 text-[10px]">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={editando.es_cliente}
                            onChange={(e) => setEditando({ ...editando, es_cliente: e.target.checked })}
                          />
                          Cliente
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={editando.es_proveedor}
                            onChange={(e) => setEditando({ ...editando, es_proveedor: e.target.checked })}
                          />
                          Proveedor
                        </label>
                      </div>
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
                        placeholder="Persona de contacto"
                        value={editando.contacto}
                        onChange={(e) => setEditando({ ...editando, contacto: e.target.value })}
                      />
                      <Input
                        className="mt-1 py-1 text-xs"
                        placeholder="Celular / Teléfono"
                        value={editando.celular_contacto}
                        onChange={(e) => setEditando({ ...editando, celular_contacto: e.target.value })}
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
                      <span className="text-muted-foreground">{t.tipo_documento}</span> <Resaltar texto={t.numero_documento} termino={busqueda} />
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
                    <td className="truncate px-3 py-2.5 text-muted-foreground"><Resaltar texto={t.email || "—"} termino={busqueda} /></td>
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
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bad/40 text-bad hover:border-bad"
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

      {modalNuevo && (
        <ModalTercero
          nombreSingular={nombreSingular}
          form={form}
          setForm={setForm}
          ok={ok}
          onGuardar={async () => {
            const msg = await guardarTercero();
            if (msg) return msg;
            setOk(`${esCliente ? "Cliente" : "Proveedor"} registrado · ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`);
            return null;
          }}
          onCerrar={() => setModalNuevo(false)}
        />
      )}
    </>
  );
}

function ModalTercero({
  nombreSingular,
  form,
  setForm,
  ok,
  onGuardar,
  onCerrar,
}: {
  nombreSingular: string;
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
            <h2 className="text-sm font-bold text-ink">Registrar {nombreSingular}</h2>
            <p className="text-xs text-muted-foreground">
              Se guardará en el catálogo y quedará disponible para cotizaciones, proyectos y compras.
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

          {error && <p className="font-mono text-xs text-bad sm:col-span-2">{error}</p>}
          {ok && !error && <p className="font-mono text-xs text-ok sm:col-span-2">{ok}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-3 sm:col-span-2">
            <Boton type="button" variante="linea" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="accion" disabled={guardando}>
              <Check size={14} /> {guardando ? "Guardando…" : "Guardar"}
            </Boton>
          </div>
        </form>
      </div>
    </div>
  );
}
