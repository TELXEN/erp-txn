import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Encabezado } from "@/components/AppShell";
import { Panel, Select, SinAcceso, Vacio } from "@/components/ui-kit";
import { ETIQUETA_ROL, useAuth, type Rol } from "@/lib/auth";

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

  if (rol !== "gerente") return <SinAcceso />;

  async function asignar(userId: string, nuevo: Rol) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: nuevo });
    qc.invalidateQueries({ queryKey: ["usuarios"] });
  }

  return (
    <>
      <Encabezado titulo="Usuarios y Roles" subtitulo="Control de accesos" />
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
