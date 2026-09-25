import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/almacen")({
  head: () => ({
    meta: [
      { title: "Almacén — ERP TELXEN SAC" },
      { name: "description", content: "Ingresos y salidas de almacén por obra." },
      { property: "og:title", content: "Almacén — ERP TELXEN SAC" },
      { property: "og:description", content: "Ingresos y salidas de almacén por obra." },
    ],
  }),
  component: AlmacenPage,
});

function AlmacenPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Almacén</h1>
        <p className="text-sm text-muted-foreground">
          Control de ingresos, salidas y transferencias de materiales.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Módulo en implementación. Aquí se registrarán los movimientos de almacén.
      </div>
    </div>
  );
}
