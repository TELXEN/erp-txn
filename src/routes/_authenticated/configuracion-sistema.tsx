import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { Panel, Vacio } from "@/components/ui-kit";

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
      <Tarjeta>
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay parámetros configurables por el momento.
        </p>
      </Tarjeta>
    </div>
  );
}
