import { createFileRoute } from "@tanstack/react-router";
import { useRecordado } from "@/lib/recordado";
import { MarcasPanel } from "@/components/MarcasPanel";
import { Encabezado } from "@/components/AppShell";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { GruposCotizacion } from "@/components/GruposCotizacion";
import { HojaSubfamilias } from "@/components/HojaSubfamilias";
import { HojaCategorias } from "@/components/HojaCategorias";

const TITULO = "Catálogo Técnico — ERP TELXEN";
const DESC = "Especialidades, categorías y subcategorías de insumos, títulos de partidas WBS, marcas y unidades de medida del ERP.";

type Pestana = "especialidades" | "categorias" | "grupos" | "subfamilias" | "unidades" | "marcas";

const PESTANAS: [Pestana, string][] = [
  ["unidades", "Unidades de medida"],
  ["especialidades", "Especialidades"],
  ["categorias", "Categorías"],
  ["subfamilias", "Subcategorías"],
  ["marcas", "Marcas"],
  ["grupos", "Títulos WBS"],
];

export const Route = createFileRoute("/_authenticated/catalogo-tecnico")({
  validateSearch: (s: Record<string, unknown>): { pestana?: Pestana } =>
    typeof s["pestana"] === "string" && PESTANAS.some(([p]) => p === s["pestana"]) ? { pestana: s["pestana"] as Pestana } : {},
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
  component: CatalogoTecnico,
});

function CatalogoTecnico() {
  const { pestana: enUrl } = Route.useSearch();
  const [recordada] = useRecordado<Pestana>("erp-catalogo-tecnico-pestana", "unidades");
  const pestana = enUrl ?? recordada;
  return (
    <>
      <Encabezado titulo="Catálogo Técnico" subtitulo="Clasificadores de ingeniería usados por APU, cotizaciones e insumos" />
      {pestana === "especialidades" ? (
        <EspecialidadesPartida />
      ) : pestana === "grupos" ? (
        <GruposCotizacion />
      ) : pestana === "marcas" ? (
        <MarcasPanel />
      ) : pestana === "categorias" ? (
        <HojaCategorias />
      ) : pestana === "subfamilias" ? (
        <HojaSubfamilias />
      ) : (
        <UnidadesMedida />
      )}
    </>
  );
}
