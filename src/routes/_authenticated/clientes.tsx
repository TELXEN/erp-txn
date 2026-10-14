import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { TercerosPanel } from "@/components/TercerosPanel";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — ERP TELXEN" },
      { name: "description", content: "Registro de clientes del ERP TELXEN." },
      { property: "og:title", content: "Clientes — ERP TELXEN" },
      { property: "og:description", content: "Catálogo de clientes con contactos y documentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { rol } = useAuth();
  if (!puedeVerDinero(rol)) return <SinAcceso />;
  return (
    <>
      <Encabezado titulo="Clientes" subtitulo="Comercial · cartera de clientes" />
      <TercerosPanel modo="cliente" />
    </>
  );
}
