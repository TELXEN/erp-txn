import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { BancoEpp } from "@/components/epp/epp";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/epp-banco")({
  head: () => ({
    meta: [
      { title: "Banco de Datos de EPP — ERP TELXEN" },
      { name: "description", content: "Catálogo maestro de equipos de protección personal con tallas y criticidad." },
      { property: "og:title", content: "Banco de Datos de EPP — ERP TELXEN" },
      { property: "og:description", content: "Catálogo maestro de equipos de protección personal con tallas y criticidad." },
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
    <Encabezado titulo="Banco de Datos de EPP" subtitulo="Recursos Humanos · Gestión de EPP" />
    <BancoEpp />
  </>;
}
