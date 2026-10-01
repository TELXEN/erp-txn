import { createFileRoute } from "@tanstack/react-router";
import { Check, SlidersHorizontal } from "lucide-react";
import { Panel } from "@/components/ui-kit";
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
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Parámetros generales del sistema. Este módulo se ampliará próximamente.
          </p>
        </div>
      </div>
      <Panel titulo="Tema de colores">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map((t) => {
            const activo = tema === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => cambiarTema(t.id)}
                aria-pressed={activo}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  activo ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-border hover:bg-muted"
                }`}
              >
                <span className="flex size-8 shrink-0 overflow-hidden rounded-full border border-border">
                  <span className="h-full w-1/2" style={{ background: t.muestraBase }} />
                  <span className="h-full w-1/2" style={{ background: t.muestraAcento }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.nombre}</span>
                  <span className="block text-xs text-muted-foreground">{t.descripcion}</span>
                </span>
                {activo && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </Panel>
      <ParametrosLaboralesPanel />
    </div>
  );
}
