import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { TercerosPanel } from "@/components/TercerosPanel";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores — ERP TELXEN" },
      { name: "description", content: "Registro de proveedores del ERP TELXEN." },
      { property: "og:title", content: "Proveedores — ERP TELXEN" },
      { property: "og:description", content: "Catálogo de proveedores para compras y logística." },
    ],
  }),
  component: Proveedores,
});

function Proveedores() {
  const { rol } = useAuth();
  if (!puedeVerDinero(rol)) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Proveedores" subtitulo="Logística · cartera de proveedores" />
      <TercerosPanel modo="proveedor" />
    </>
  );
}
