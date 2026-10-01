import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, HardHat, Palette, SlidersHorizontal } from "lucide-react";
import { Boton, Panel } from "@/components/ui-kit";
import { ParametrosLaboralesPanel } from "@/components/ParametrosLaborales";
import { TEMAS, useTema } from "@/lib/temas";

export const Route = createFileRoute("/_authenticated/configuracion-sistema")({
  head: () => ({
    meta: [
      { title: "Configuración del Sistema — TELXEN ERP" },
      { name: "description", content: "Parámetros generales del sistema ERP TELXEN." },
      { property: "og:title", content: "Configuración del Sistema — TELXEN ERP" },
      { property: "og:description", content: "Parámetros generales del sistema ERP TELXEN." },
    ],
  }),
  component: ConfiguracionSistema,
});

function ConfiguracionSistema() {
  const { tema, cambiarTema } = useTema();
  const [pestana, setPestana] = useState<"tema" | "laboral">("tema");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Personaliza la apariencia y los parámetros laborales del sistema.
          </p>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Secciones de configuración">
        <Boton
          type="button"
          variante="linea"
          role="tab"
          aria-selected={pestana === "tema"}
          onClick={() => setPestana("tema")}
          className={`-mb-px shrink-0 rounded-b-none border-x-0 border-t-0 px-4 py-2.5 ${
            pestana === "tema"
              ? "border-b-2 border-primary bg-primary/5 font-semibold text-primary"
              : "border-b-2 border-transparent text-muted-foreground"
          }`}
        >
          <Palette className="size-4" />
          Tema de colores
        </Boton>
        <Boton
          type="button"
          variante="linea"
          role="tab"
          aria-selected={pestana === "laboral"}
          onClick={() => setPestana("laboral")}
          className={`-mb-px shrink-0 rounded-b-none border-x-0 border-t-0 px-4 py-2.5 ${
            pestana === "laboral"
              ? "border-b-2 border-primary bg-primary/5 font-semibold text-primary"
              : "border-b-2 border-transparent text-muted-foreground"
          }`}
        >
          <HardHat className="size-4" />
          Parámetros laborales
        </Boton>
      </div>

      {pestana === "tema" ? (
        <Panel titulo="Tema de colores">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMAS.map((t) => {
              const activo = tema === t.id;
              return (
                <Boton
                  key={t.id}
                  type="button"
                  variante="linea"
                  onClick={() => cambiarTema(t.id)}
                  aria-pressed={activo}
                  className={`h-auto justify-start gap-3 p-3 text-left ${
                    activo ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-line text-foreground"
                  }`}
                >
                  <span className="flex size-8 shrink-0 overflow-hidden rounded-full border border-border">
                    <span className="h-full w-1/2" style={{ background: t.muestraBase }} />
                    <span className="h-full w-1/2" style={{ background: t.muestraAcento }} />
                  </span>
                  <span className="min-w-0 flex-1 font-sans">
                    <span className="block text-sm font-semibold">{t.nombre}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{t.descripcion}</span>
                  </span>
                  {activo && <Check className="size-4 shrink-0 text-primary" />}
                </Boton>
              );
            })}
          </div>
        </Panel>
      ) : (
        <ParametrosLaboralesPanel />
      )}
    </div>
  );
}
