import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { UsuariosPanel } from "@/components/UsuariosPanel";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y Roles — ERP TELXEN" },
      { name: "description", content: "Asignación de roles: ingeniero de campo, administrador de oficina y gerente." },
      { property: "og:title", content: "Usuarios y Roles — ERP TELXEN" },
      { property: "og:description", content: "Asignación de roles del sistema." },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  return (
    <>
      <Encabezado titulo="Usuarios y Roles" subtitulo="Control de accesos" />
      <UsuariosPanel />
    </>
  );
}
