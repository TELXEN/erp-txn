import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, FileText, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Boton, Panel } from "@/components/ui-kit";
import { DatosEmpresa } from "@/components/DatosEmpresa";
import { TipografiaDocumentosPanel } from "@/components/TipografiaDocumentos";
import { UsuariosPanel } from "@/components/UsuariosPanel";
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
  const [pestana, setPestana] = useState<"tema" | "tipografia" | "usuarios" | "empresa">("tema");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Personaliza la apariencia del sistema y sus documentos.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-line pb-2" role="tablist" aria-label="Configuración del sistema">
        <Boton type="button" variante="linea" role="tab" aria-selected={pestana === "tema"} onClick={() => setPestana("tema")} className={pestana === "tema" ? "border-primary bg-primary/5 text-primary" : ""}>
          <IconoPaletaColores className="size-5" /> Tema de colores
        </Boton>
        <Boton type="button" variante="linea" role="tab" aria-selected={pestana === "tipografia"} onClick={() => setPestana("tipografia")} className={pestana === "tipografia" ? "border-primary bg-primary/5 text-primary" : ""}>
          <FileText className="size-4 text-primary" /> Tipografía de documentos
        </Boton>
        <Boton type="button" variante="linea" role="tab" aria-selected={pestana === "usuarios"} onClick={() => setPestana("usuarios")} className={pestana === "usuarios" ? "border-primary bg-primary/5 text-primary" : ""}>
          <ShieldCheck className="size-4 text-primary" /> Usuarios y Roles
        </Boton>
        <Boton type="button" variante="linea" role="tab" aria-selected={pestana === "empresa"} onClick={() => setPestana("empresa")} className={pestana === "empresa" ? "border-primary bg-primary/5 text-primary" : ""}>
          <Building2 className="size-4 text-primary" /> Datos de la empresa
        </Boton>
      </div>
      {pestana === "tema" ? <Panel titulo="Tema de colores" extra={<IconoPaletaColores className="size-5" />}>
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
      </Panel> : pestana === "tipografia" ? <TipografiaDocumentosPanel /> : pestana === "empresa" ? <DatosEmpresa /> : <UsuariosPanel />}
    </div>
  );
}
