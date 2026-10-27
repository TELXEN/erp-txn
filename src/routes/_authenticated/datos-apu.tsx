import { createFileRoute } from "@tanstack/react-router";
import { Encabezado } from "@/components/AppShell";
import { BancoApu } from "@/components/BancoApu";

const TITULO = "Análisis de Precios Unitarios (APU) — ERP TELXEN";
const DESC = "Banco APU: partidas, rendimientos, cuadrillas y costos unitarios para cotizar.";

export const Route = createFileRoute("/_authenticated/datos-apu")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESC },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DatosApu,
});

function DatosApu() {
  return (
    <>
      <Encabezado titulo="Análisis de Precios Unitarios (APU)" subtitulo="Partidas, rendimientos, cuadrillas y costos unitarios" />
      <BancoApu />
    </>
  );
}
