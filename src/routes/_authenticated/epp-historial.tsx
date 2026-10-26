import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { HistorialEpp } from "@/components/epp/epp";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/epp-historial")({
  head: () => ({
    meta: [
      { title: "Historial de EPP por Empleado — ERP TELXEN" },
      { name: "description", content: "Ficha de control legal de dotación de EPP por trabajador." },
      { property: "og:title", content: "Historial de EPP por Empleado — ERP TELXEN" },
      { property: "og:description", content: "Ficha de control legal de dotación de EPP por trabajador." },
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
    <Encabezado titulo="Historial de EPP por Empleado" subtitulo="Recursos Humanos · Gestión de EPP" />
    <HistorialEpp />
  </>;
}
