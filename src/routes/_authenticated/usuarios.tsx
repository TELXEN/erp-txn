import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Boton, Campo, Input, Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";
import { crearUsuario } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y Roles — Control de Proyectos" },
      { name: "description", content: "Asignación de roles: ingeniero de campo, administrador de oficina y gerente." },
      { property: "og:title", content: "Usuarios y Roles — Control de Proyectos" },
      { property: "og:description", content: "Asignación de roles del sistema." },
    ],
  }),
  component: Usuarios,
});

type Fila = { id: string; nombre: string; email: string; rol: Rol | null };

function Usuarios() {
  const { rol } = useAuth();
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
  const vacio = { nombre: "", email: "", password: "", rol: "ingeniero" as Rol };
  const [form, setForm] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

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


  async function asignar(userId: string, nuevo: Rol) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: nuevo });
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  }

  return (
    <>
      <Encabezado
        titulo="Usuarios y Roles"
        subtitulo="Control de accesos"
        acciones={
          <Boton onClick={() => setAbierto((v) => !v)}>
            <UserPlus className="h-3.5 w-3.5" />
            {abierto ? "Cerrar" : "Añadir usuario"}
          </Boton>
        }
      />

      {abierto && (
        <Panel
          titulo="Nuevo usuario"
          className="mb-4"
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
              <Input
                required
                type="password"
                minLength={6}
                maxLength={72}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
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

      <Panel titulo="Usuarios registrados">
        {usuarios.length === 0 ? (
          <Vacio texto="No hay usuarios registrados." />
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Correo</th>
                <th className="px-5 py-2 text-right font-medium">Rol asignado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-2.5 font-semibold text-ink">{u.nombre || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Select
                      className="w-56"
                      value={u.rol ?? ""}
                      onChange={(e) => asignar(u.id, e.target.value as Rol)}
                    >
                      <option value="" disabled>
                        Sin rol
                      </option>
                      {(Object.keys(ETIQUETA_ROL) as Rol[]).map((r) => (
                        <option key={r} value={r}>
                          {ETIQUETA_ROL[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
