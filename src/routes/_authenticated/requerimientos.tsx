import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/requerimientos")({
  head: () => ({
    meta: [
      { title: "Requerimientos — ERP TELXEN SAC" },
      { name: "description", content: "Requerimientos de materiales y servicios por obra." },
      { property: "og:title", content: "Requerimientos — ERP TELXEN SAC" },
      { property: "og:description", content: "Requerimientos de materiales y servicios por obra." },
    ],
  }),
  component: RequerimientosPage,
});

function RequerimientosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Requerimientos</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de materiales, equipos y servicios por obra.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Módulo en implementación. Aquí se registrarán los requerimientos de cada obra.
      </div>
    </div>
  );
}
