import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Boton } from "@/components/ui-kit";
import { HojaGastosGenerales } from "@/components/cotizaciones/HojaGastosGenerales";

export const Route = createFileRoute("/_authenticated/gg-vista")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? s["id"] : "" }),
  head: () => ({
    meta: [
      { title: "Desagregado de gastos generales — ERP TELXEN" },
      { name: "description", content: "Hoja A4 imprimible del desagregado de gastos generales de la cotización." },
      { property: "og:title", content: "Desagregado de gastos generales — ERP TELXEN" },
      { property: "og:description", content: "Impresión A4 de los gastos generales de una cotización." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VistaGG,
});

function VistaGG() {
  const { id } = Route.useSearch();
  const router = useRouter();
  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-md border border-line">
      <HojaGastosGenerales id={id} acciones={<Boton variante="linea" onClick={() => router.history.back()}><ArrowLeft size={13} /> Volver</Boton>} />
    </div>
  );
}
