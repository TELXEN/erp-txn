import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Insumos } from "@/components/Insumos";
import { UnidadesMedida } from "@/components/UnidadesMedida";

export const Route = createFileRoute("/_authenticated/datos-apu")({
  head: () => ({
    meta: [
      { title: "Análisis de Precios Unitarios (APU) — ERP TELXEN" },
      {
        name: "description",
        content: "Maestro de insumos y unidades de medida para el análisis de precios unitarios.",
      },
      { property: "og:title", content: "Análisis de Precios Unitarios (APU) — ERP TELXEN" },
      {
        property: "og:description",
        content: "Maestro de insumos y unidades de medida para el análisis de precios unitarios.",
      },
    ],
  }),
  component: DatosApu,
});

type Pestana = "insumos" | "unidades";

const PESTANAS: [Pestana, string][] = [
  ["insumos", "Maestro de insumos"],
  ["unidades", "Unidades de medida"],
];

function DatosApu() {
  const [pestana, setPestana] = useState<Pestana>("insumos");

  return (
    <>
      <Encabezado
        titulo="Análisis de Precios Unitarios (APU)"
        subtitulo="Insumos y unidades de medida"
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

      {pestana === "insumos" ? <Insumos /> : <UnidadesMedida />}
    </>
  );
}
