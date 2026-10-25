import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plug, FileText, Scale, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { CabeceraModulo, Panel, Pestanas } from "@/components/ui-kit";
import { DatosEmpresaTabs } from "@/components/DatosEmpresaTabs";
import { TipografiaDocumentosPanel } from "@/components/TipografiaDocumentos";
import { UsuariosPanel } from "@/components/UsuariosPanel";
import { ConfigDecolecta } from "@/components/facturacion/ConfigDecolecta";
import { ConfigSol } from "@/components/sire/ConfigSol";
import { useAuth } from "@/lib/auth";
import { HistorialNormativo } from "@/components/HistorialNormativo";

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
  const [pestana, setPestana] = useState<"tipografia" | "usuarios" | "empresa" | "integraciones" | "normativa">("empresa");
  const { rol } = useAuth();

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Sistema › Configuración"
        titulo="Configuración del Sistema"
        descripcion="Parámetros generales del sistema y sus documentos."
        icono={<SlidersHorizontal className="h-5 w-5" />}
      />
      <Pestanas
        etiqueta="Configuración del sistema"
        valor={pestana}
        onCambiar={setPestana}
        opciones={[
          { id: "empresa", texto: "Datos de la empresa", icono: <Building2 className="size-4" /> },
          { id: "tipografia", texto: "Tipografía de documentos", icono: <FileText className="size-4" /> },
          { id: "usuarios", texto: "Usuarios y Roles", icono: <ShieldCheck className="size-4" /> },
          ...(rol === "gerente" || rol === "administrador" ? [{ id: "normativa" as const, texto: "Valores normativos (RMV / UIT)", icono: <Scale className="size-4" /> }, { id: "integraciones" as const, texto: "Integraciones", icono: <Plug className="size-4" /> }] : []),
        ]}
      />
      {pestana === "normativa" ? <HistorialNormativo /> : pestana === "tipografia" ? <TipografiaDocumentosPanel /> : pestana === "empresa" ? <DatosEmpresaTabs /> : pestana === "integraciones" ? <div className="grid gap-4 xl:grid-cols-2"><ConfigDecolecta enLinea />{rol === "gerente" ? <ConfigSol /> : <Panel titulo="SUNAT SIRE · API SOL"><p className="p-5 text-sm text-muted-foreground">Solo Gerencia puede ver o cambiar las credenciales SOL.</p></Panel>}</div> : <UsuariosPanel />}
    </div>
  );
}
