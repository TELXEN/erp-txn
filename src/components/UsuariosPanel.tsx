import { useState } from "react";
import { BarraIconosHoja } from "@/components/BarraIconosHoja";
import { Check, Eye, EyeOff, Info, UserPlus, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";
import { crearUsuario, actualizarUsuario, eliminarUsuario } from "@/lib/usuarios.functions";

type Fila = { id: string; nombre: string; email: string; rol: Rol | null };

export function UsuariosPanel() {
  const { rol, session } = useAuth();
  const qc = useQueryClient();

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async (): Promise<Fila[]> => {
      const [{ data: perfiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nombre, email").order("nombre"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (perfiles ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        rol: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
  });

  const crear = useServerFn(crearUsuario);
  const actualizar = useServerFn(actualizarUsuario);
  const eliminarFn = useServerFn(eliminarUsuario);

  const vacio = { nombre: "", email: "", password: "", rol: "ingeniero" as Rol };
  const [form, setForm] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [verPassword, setVerPassword] = useState(false);
  const [mostrarInstructivo, setMostrarInstructivo] = useState(false);

  type Edicion = { id: string; nombre: string; email: string; rol: Rol };
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [sel, setSel] = useState("");

  if (rol !== "gerente") return <SinAcceso />;

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      await crear({ data: form });
      setForm(vacio);
      setMensaje({ tipo: "ok", texto: "Usuario creado correctamente." });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo crear el usuario." });
    } finally {
      setGuardando(false);
    }
  }

  function iniciarEdicion(u: Fila) {
    setEditando({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol ?? "ingeniero" });
  }

  function cancelarEdicion() {
    setEditando(null);
  }

  async function guardarEdicion(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault();
    if (!editando) return;
    setGuardandoEdicion(true);
    setMensaje(null);
    try {
      await actualizar({ data: editando });
      setEditando(null);
      setMensaje({ tipo: "ok", texto: "Usuario actualizado correctamente." });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo actualizar el usuario." });
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    setMensaje(null);
    try {
      await eliminarFn({ data: { id } });
      setMensaje({ tipo: "ok", texto: "Usuario eliminado correctamente." });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err instanceof Error ? err.message : "No se pudo eliminar el usuario." });
    }
  }

  const usuarioSel = usuarios.find((u) => u.id === sel);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Control de accesos: ingeniero de campo, administrador de oficina y gerente.
        </p>
        <Boton onClick={() => setAbierto((v) => !v)}>
          <UserPlus className="h-3.5 w-3.5" />
          {abierto ? "Cerrar" : "Añadir usuario"}
        </Boton>
      </div>

      {abierto && (
        <Panel
          titulo="Nuevo usuario"
          extra={
            <Boton type="submit" form="form-usuario" disabled={guardando}>
              {guardando ? "Creando…" : "Registrar"}
            </Boton>
          }
        >
          <form id="form-usuario" onSubmit={registrar} className="grid gap-4 px-5 py-4 md:grid-cols-4">
            <Campo etiqueta="Nombre">
              <Input
                required
                maxLength={100}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Correo">
              <Input
                required
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Contraseña">
              <div className="relative">
                <Input
                  required
                  type={verPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setMostrarInstructivo(true)}
                  onBlur={() => setMostrarInstructivo(false)}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-ink"
                  aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mostrarInstructivo && (
                <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-ink">
                  <span className="mb-1 flex items-center gap-1.5 font-semibold text-primary">
                    <Info className="h-3.5 w-3.5" />
                    Requisitos de una contraseña fuerte
                  </span>
                  <ul className="list-disc space-y-0.5 pl-4 font-mono text-[11px] text-muted-foreground">
                    <li>Mínimo 8 caracteres.</li>
                    <li>Al menos una letra mayúscula.</li>
                    <li>Al menos una letra minúscula.</li>
                    <li>Al menos un número.</li>
                    <li>Al menos un carácter especial (ej. !@#$%^&*).</li>
                  </ul>
                </div>
              )}
            </Campo>
            <Campo etiqueta="Rol asignado">
              <Select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => (
                  <option key={r} value={r}>
                    {ETIQUETA_ROL[r]}
                  </option>
                ))}
              </Select>
            </Campo>
            {mensaje && (
              <p
                className={`md:col-span-4 font-mono text-xs ${mensaje.tipo === "ok" ? "text-good" : "text-bad"}`}
              >
                {mensaje.texto}
              </p>
            )}
          </form>
        </Panel>
      )}

      <div className="flex items-start gap-3">
      <Panel titulo="Usuarios registrados" className="min-w-0 flex-1">
        {usuarios.length === 0 ? (
          <Vacio texto="No hay usuarios registrados." />
        ) : (
          <table className="w-full table-fixed font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium w-4/12">Nombre</th>
                <th className="px-3 py-2 font-medium w-3/12">Correo</th>
                <th className="px-3 py-2 font-medium w-3/12">Rol asignado</th>
                <th className="px-5 py-2 text-right font-medium w-2/12"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const esPropio = u.id === session?.user.id;
                const enEdicion = editando?.id === u.id;
                return (
                  <tr key={u.id} onClick={() => setSel(u.id)} onDoubleClick={() => !enEdicion && iniciarEdicion(u)} className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-muted/40 ${sel === u.id ? "bg-primary/10" : ""}`}>
                    {enEdicion ? (
                      <>
                        <td className="px-5 py-2">
                          <Input
                            value={editando.nombre}
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                            disabled={guardandoEdicion}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="email"
                            value={editando.email}
                            onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                            disabled={guardandoEdicion}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={editando.rol}
                            onChange={(e) => setEditando({ ...editando, rol: e.target.value as Rol })}
                            disabled={guardandoEdicion || esPropio}
                          >
                            {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => (
                              <option key={r} value={r}>
                                {ETIQUETA_ROL[r]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={guardarEdicion}
                              disabled={guardandoEdicion}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                              aria-label="Guardar"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelarEdicion}
                              disabled={guardandoEdicion}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-line hover:bg-muted disabled:opacity-50"
                              aria-label="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 font-semibold text-ink truncate" title={u.nombre || undefined}>
                          {u.nombre || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground truncate" title={u.email}>
                          {u.email}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.rol ? (
                            <span className="inline-flex rounded-md border border-line bg-card px-2 py-0.5 text-[11px]">
                              {ETIQUETA_ROL[u.rol]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sin rol</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5" />
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
      <BarraIconosHoja objeto="usuario" haySeleccion={!!usuarioSel}
        onAgregar={() => setAbierto(true)}
        onEditar={() => { if (usuarioSel) iniciarEdicion(usuarioSel); }}
        onEliminar={() => { if (usuarioSel && usuarioSel.id !== session?.user.id) { void eliminar(usuarioSel.id); setSel(""); } }} />
      </div>
    </div>
  );
}
