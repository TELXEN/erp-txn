import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { SinAcceso } from "@/components/ui-kit";
import { TransportistasPanel } from "@/components/TransportistasPanel";
import { puedeVerDinero, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/transportistas")({
  head: () => ({
    meta: [
      { title: "Transportistas — ERP TELXEN" },
      { name: "description", content: "Catálogo de transportistas, vehículos y conductores para guías de remisión." },
      { property: "og:title", content: "Transportistas — ERP TELXEN" },
      { property: "og:description", content: "Empresas de transporte público con registro MTC, autorizaciones y conductores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Transportistas,
});

function Transportistas() {
  const { rol } = useAuth();
  if (!puedeVerDinero(rol)) return <SinAcceso />;
  return <>
    <Encabezado titulo="Transportistas" subtitulo="Logística · transporte público para guías de remisión" />
    <TransportistasPanel />
  </>;
}
