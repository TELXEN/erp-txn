import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { Insumos } from "@/components/Insumos";

const TITULO = "Maestro de Insumos — ERP TELXEN";
const DESC = "Ficha única de materiales, mano de obra, equipos, subcontratos y EPP usada por APU, Logística e Inventario.";

export const Route = createFileRoute("/_authenticated/maestro-insumos")({
  validateSearch: (s: Record<string, unknown>): { seccion?: string } => (typeof s["seccion"] === "string" ? { seccion: s["seccion"] } : {}),
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
  const { seccion } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <>
      <Encabezado titulo="Maestro de Insumos" subtitulo="Una sola ficha por artículo para todo el ERP" />
      <Insumos
        seccionUrl={seccion}
        onSeccion={(s) => void navigate({ to: "/maestro-insumos", search: { seccion: s }, replace: true })}
      />
    </>
  );
}
