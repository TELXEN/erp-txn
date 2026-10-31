import { createFileRoute } from "@tanstack/react-router";
import { useRecordado } from "@/lib/recordado";
import { MarcasPanel } from "@/components/MarcasPanel";
import { Encabezado } from "@/components/AppShell";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { GruposCotizacion } from "@/components/GruposCotizacion";
import { HojaSubfamilias } from "@/components/HojaSubfamilias";

const TITULO = "Catálogo Técnico — ERP TELXEN";
const DESC = "Especialidades, títulos de partidas WBS, subfamilias, marcas y unidades de medida del ERP.";

export const Route = createFileRoute("/_authenticated/catalogo-tecnico")({
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

type Pestana = "especialidades" | "grupos" | "subfamilias" | "unidades" | "marcas";

const PESTANAS: [Pestana, string][] = [
  ["unidades", "Unidades de medida"],
  ["especialidades", "Especialidades"],
  ["subfamilias", "Subfamilia de materiales"],
  ["marcas", "Marcas"],
  ["grupos", "Títulos WBS"],
];

function CatalogoTecnico() {
  const [pestana, setPestana] = useRecordado<Pestana>("erp-catalogo-tecnico-pestana", "unidades");
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
      ) : pestana === "subfamilias" ? (
        <HojaSubfamilias />
      ) : (
        <UnidadesMedida />
      )}
    </>
  );
}
