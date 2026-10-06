import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Encabezado } from "@/components/AppShell";
import { Insumos } from "@/components/Insumos";
import { UnidadesMedida } from "@/components/UnidadesMedida";
import { EspecialidadesPartida } from "@/components/EspecialidadesPartida";
import { CategoriasPartida } from "@/components/CategoriasPartida";
import { PartidasMaestras } from "@/components/PartidasMaestras";
import { GruposCotizacion } from "@/components/GruposCotizacion";

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

type Pestana = "insumos" | "unidades" | "especialidades" | "categorias" | "maestras" | "grupos";

const PESTANAS: [Pestana, string][] = [
  ["maestras", "Registro de partidas"],
  ["insumos", "Maestro de insumos"],
  ["especialidades", "Especialidad de partidas"],
  ["grupos", "Grupos de partidas"],
  ["categorias", "Categorías de partidas"],
  ["unidades", "Unidades de medida"],
];

function DatosApu() {
  const [pestana, setPestana] = useState<Pestana>("maestras");

  return (
    <>
      <Encabezado
        titulo="Análisis de Precios Unitarios (APU)"
        subtitulo="Insumos, unidades y catálogo técnico (WBS)"
      />

      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-card p-1">
        {PESTANAS.map(([p, texto]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              pestana === p
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
      ) : pestana === "grupos" ? (
        <GruposCotizacion />
      ) : pestana === "categorias" ? (
        <CategoriasPartida />
      ) : (
        <PartidasMaestras />
      )}
    </>
  );
}
