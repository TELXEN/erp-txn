import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, HardHat, SlidersHorizontal } from "lucide-react";
import { Boton, Panel } from "@/components/ui-kit";
import { ParametrosLaboralesPanel } from "@/components/ParametrosLaborales";
import { TEMAS, useTema } from "@/lib/temas";

function IconoPaletaColores({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r="1.4" fill="#ef4444" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1.4" fill="#f59e0b" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1.4" fill="#22c55e" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1.4" fill="#3b82f6" stroke="none" />
    </svg>
  );
}

function IconoCascoColores({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" stroke="#ef4444" />
      <path d="M14 6a6 6 0 0 1 6 6v3" stroke="#22c55e" />
      <path d="M20 15h2v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2h2" stroke="#3b82f6" />
      <path d="M4 15a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" stroke="#f59e0b" />
    </svg>
  );
}

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
          <IconoPaletaColores className="size-4" />
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
