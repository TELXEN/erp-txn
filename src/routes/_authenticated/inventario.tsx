import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — ERP TELXEN SAC" },
      { name: "description", content: "Stock y valorización del inventario de materiales." },
      { property: "og:title", content: "Inventario — ERP TELXEN SAC" },
      { property: "og:description", content: "Stock y valorización del inventario de materiales." },
    ],
  }),
  component: InventarioPage,
});

function InventarioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Inventario</h1>
        <p className="text-sm text-muted-foreground">
          Stock actual y valorización de materiales por almacén y obra.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Módulo en implementación. Aquí se consultará el stock del inventario.
      </div>
    </div>
  );
}
