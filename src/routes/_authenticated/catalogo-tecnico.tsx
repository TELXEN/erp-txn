import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRecordado } from "@/lib/recordado";
import { MarcasPanel } from "@/components/MarcasPanel";
import { Encabezado, useEnCinta } from "@/components/AppShell";
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
  const enCinta = useEnCinta();
  const { pestana: enUrl } = Route.useSearch();
  const [recordada, setRecordada] = useRecordado<Pestana>("erp-catalogo-tecnico-pestana", "unidades");
  const navigate = useNavigate();
  const pestana = enUrl ?? recordada;
  const setPestana = (p: Pestana) => {
    setRecordada(p);
    void navigate({ to: "/catalogo-tecnico", search: { pestana: p }, replace: true });
  };
  return (
    <>
      <Encabezado titulo="Catálogo Técnico" subtitulo="Clasificadores de ingeniería usados por APU, cotizaciones e insumos" />
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
        {PESTANAS.map(([p, texto]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            className={`rounded-md border-b-2 px-3 py-1.5 text-xs transition-colors ${
              pestana === p
                ? "border-cta bg-primary/10 font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
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
