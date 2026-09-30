import { createFileRoute } from "@tanstack/react-router";
import { FacturacionElectronica } from "./facturacion-electronica";

export const Route = createFileRoute("/_authenticated/guias-remision")({
  head: () => ({ meta: [{ title: "Guías de Remisión — ERP TELXEN" }, { name: "description", content: "Emisión de guías de remisión remitente con datos de traslado, transportista y direcciones." }, { property: "og:title", content: "Guías de Remisión — ERP TELXEN" }, { property: "og:description", content: "Guías de remisión con motivo de traslado, transportista, partida y llegada." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PaginaGuias,
});

function PaginaGuias() {
  return <FacturacionElectronica modo="guias" />;
}
