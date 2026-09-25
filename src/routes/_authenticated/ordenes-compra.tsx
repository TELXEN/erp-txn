import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ordenes-compra")({
  head: () => ({
    meta: [
      { title: "Órdenes de Compra — ERP TELXEN SAC" },
      { name: "description", content: "Órdenes de compra a proveedores." },
      { property: "og:title", content: "Órdenes de Compra — ERP TELXEN SAC" },
      { property: "og:description", content: "Órdenes de compra a proveedores." },
    ],
  }),
  component: OrdenesCompraPage,
});

function OrdenesCompraPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Órdenes de Compra</h1>
        <p className="text-sm text-muted-foreground">
          Emisión y seguimiento de órdenes de compra y servicio a proveedores.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Módulo en implementación. Aquí se generarán y aprobarán las órdenes de compra.
      </div>
    </div>
  );
}
