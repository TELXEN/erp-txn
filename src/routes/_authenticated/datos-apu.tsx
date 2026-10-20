import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderKanban, Layers } from "lucide-react";
import { Encabezado } from "@/components/AppShell";
import { Boton } from "@/components/ui-kit";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { GruposCotizacion } from "@/components/GruposCotizacion";
import { CodificacionModularInsumos } from "@/components/CodificacionModularInsumos";
import { BancoApu } from "@/components/BancoApu";

export const Route = createFileRoute("/_authenticated/datos-apu")({
  head: () => ({
    meta: [
      { title: "Análisis de Precios Unitarios (APU) — ERP TELXEN" },
      {
        name: "description",
        content:
          "Maestro de insumos, unidades de medida y catálogo técnico WBS (especialidades, categorías y partidas) para el análisis de precios unitarios.",
      },
      { property: "og:title", content: "Análisis de Precios Unitarios (APU) — ERP TELXEN" },
      {
        property: "og:description",
        content:
          "Maestro de insumos, unidades de medida y catálogo técnico WBS (especialidades, categorías y partidas) para el análisis de precios unitarios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatosApu,
});

type Pestana = "banco" | "unidades" | "especialidades" | "grupos" | "subfamilias";

const GRUPOS_APU: { titulo: string; icono: React.ElementType; items: [Pestana, string][] }[] = [
  { titulo: "Banco APU", icono: FolderKanban, items: [["banco", "\n"]] },
  {
    titulo: "Catálogo técnico",
    icono: Layers,
    items: [
      ["especialidades", "Especialidad de partidas"],
      ["subfamilias", "Subfamilias de insumos"],
      ["grupos", "Títulos de partidas"],
      ["unidades", "Unidades de medida"],
    ],
  },
];

function DatosApu() {
  const [pestana, setPestana] = useState<Pestana>("banco");
  const grupoActivo = GRUPOS_APU.find((g) => g.items.some(([p]) => p === pestana)) ?? GRUPOS_APU[0]!;

  return (
    <>
      <Encabezado
        titulo="Análisis de Precios Unitarios (APU)"
        subtitulo="Insumos, unidades y catálogo técnico (WBS)"
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {GRUPOS_APU.map((g) => {
          const Icono = g.icono;
          const activo = g.items.some(([p]) => p === pestana);
          return (
            <Boton
              key={g.titulo}
              variante={activo ? "primario" : "linea"}
              onClick={() => {
                const primero = g.items[0];
                if (primero) setPestana(primero[0]);
              }}
            >
              <Icono size={13} /> {g.titulo}
            </Boton>
          );
        })}
      </div>

      {grupoActivo.items.some(([, texto]) => texto.trim()) && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-3">
          {grupoActivo.items
            .filter(([, texto]) => texto.trim())
            .map(([p, texto]) => (
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
      )}

      {pestana === "banco" ? (
        <BancoApu />
      ) : pestana === "unidades" ? (
        <UnidadesMedida />
      ) : pestana === "subfamilias" ? (
        <CodificacionModularInsumos soloSubfamilias />
      ) : pestana === "especialidades" ? (
        <EspecialidadesPartida />
      ) : (
        <GruposCotizacion />
      )}
    </>
  );
}
