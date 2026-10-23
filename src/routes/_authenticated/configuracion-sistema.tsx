import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, FileText, Landmark, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Boton, CabeceraModulo, Panel, Pestanas } from "@/components/ui-kit";
import { DatosEmpresa } from "@/components/DatosEmpresa";
import { CuentasBancarias } from "@/components/CuentasBancarias";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracionSistema,
});

function ConfiguracionSistema() {
  const { tema, cambiarTema } = useTema();
  const [pestana, setPestana] = useState<"tema" | "tipografia" | "usuarios" | "empresa" | "bancos">("tema");

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Sistema › Configuración"
        titulo="Configuración del Sistema"
        descripcion="Personaliza la apariencia del sistema y sus documentos."
        icono={<SlidersHorizontal className="h-5 w-5" />}
      />
      <Pestanas
        etiqueta="Configuración del sistema"
        valor={pestana}
        onCambiar={setPestana}
        opciones={[
          { id: "empresa", texto: "Datos de la empresa", icono: <Building2 className="size-4" /> },
          { id: "bancos", texto: "Cuentas bancarias", icono: <Landmark className="size-4" /> },
          { id: "tema", texto: "Tema de colores", icono: <IconoPaletaColores className="size-4" /> },
          { id: "tipografia", texto: "Tipografía de documentos", icono: <FileText className="size-4" /> },
          { id: "usuarios", texto: "Usuarios y Roles", icono: <ShieldCheck className="size-4" /> },
        ]}
      />
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
            </Panel> : pestana === "tipografia" ? <TipografiaDocumentosPanel /> : pestana === "empresa" ? <DatosEmpresa /> : pestana === "bancos" ? <CuentasBancarias /> : <UsuariosPanel />}
    </div>
  );
}
