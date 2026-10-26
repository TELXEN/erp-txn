import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { EntregasEpp } from "@/components/epp/epp";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/epp-entregas")({
  head: () => ({
    meta: [
      { title: "Asignación y Entrega de EPP — ERP TELXEN" },
      { name: "description", content: "Registro de entregas de EPP a cada trabajador." },
      { property: "og:title", content: "Asignación y Entrega de EPP — ERP TELXEN" },
      { property: "og:description", content: "Registro de entregas de EPP a cada trabajador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { rol } = useAuth();
  if (!puedeVerDinero(rol)) return <SinAcceso />;
  return <>
    <Encabezado titulo="Asignación y Entrega de EPP" subtitulo="Recursos Humanos · Gestión de EPP" />
    <EntregasEpp />
  </>;
}
