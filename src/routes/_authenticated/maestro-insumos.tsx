import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { Insumos } from "@/components/Insumos";

const TITULO = "Maestro de Insumos — ERP TELXEN";
const DESC = "Ficha única de materiales, mano de obra, equipos, subcontratos y EPP usada por APU, Logística e Inventario.";

export const Route = createFileRoute("/_authenticated/maestro-insumos")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaestroInsumos,
});

function MaestroInsumos() {
  return (
    <>
      <Encabezado titulo="Maestro de Insumos" subtitulo="Una sola ficha por artículo para todo el ERP" />
      <Insumos />
    </>
  );
}
