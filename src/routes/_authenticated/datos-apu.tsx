import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Insumos } from "@/components/Insumos";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { CategoriasPartida } from "@/components/CategoriasPartida";
import { PartidasMaestras } from "@/components/PartidasMaestras";

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
    ],
  }),
  component: DatosApu,
});

type Pestana = "insumos" | "unidades" | "especialidades" | "categorias" | "maestras";

const PESTANAS: [Pestana, string][] = [
  ["insumos", "Maestro de insumos"],
  ["unidades", "Unidades de medida"],
  ["especialidades", "Especialidad de partidas"],
  ["categorias", "Categorías de partidas"],
  ["maestras", "Registro de partidas"],
];

function DatosApu() {
  const [pestana, setPestana] = useState<Pestana>("insumos");

  return (
    <>
      <Encabezado
        titulo="Análisis de Precios Unitarios (APU)"
        subtitulo="Insumos, unidades y catálogo técnico (WBS)"
      />

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

      {pestana === "insumos" ? (
        <Insumos />
      ) : pestana === "unidades" ? (
        <UnidadesMedida />
      ) : pestana === "especialidades" ? (
        <EspecialidadesPartida />
      ) : pestana === "categorias" ? (
        <CategoriasPartida />
      ) : (
        <PartidasMaestras />
      )}
    </>
  );
}
