import { createFileRoute } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";
import { Boton, CabeceraModulo, Panel } from "@/components/ui-kit";
import { TEMAS, useTema } from "@/lib/temas";

export const Route = createFileRoute("/_authenticated/tema-colores")({
  head: () => ({
    meta: [
      { title: "Tema de colores — TELXEN ERP" },
      { name: "description", content: "Elige el tema de colores del sistema ERP TELXEN." },
      { property: "og:title", content: "Tema de colores — TELXEN ERP" },
      { property: "og:description", content: "Elige el tema de colores del sistema ERP TELXEN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemaColores,
});

function TemaColores() {
  const { tema, cambiarTema } = useTema();

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Datos › Tema de colores"
        titulo="Tema de colores"
        descripcion="Elige los colores del menú y de los botones. La elección se guarda en este equipo."
        icono={<Palette className="h-5 w-5" />}
      />
      <Panel titulo="Temas disponibles" extra={<Palette className="size-5" />}>
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
    </div>
  );
}
