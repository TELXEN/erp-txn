import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Encabezado, useEnCinta } from "@/components/AppShell";
import { GrupoCinta } from "@/components/CintaOpciones";
import { Building2, Plug, FileText, Scale, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { CabeceraModulo, Panel, Pestanas } from "@/components/ui-kit";
import { DatosEmpresaTabs } from "@/components/DatosEmpresaTabs";
import { TipografiaDocumentosPanel } from "@/components/TipografiaDocumentos";
import { UsuariosPanel } from "@/components/UsuariosPanel";
import { ConfigDecolecta } from "@/components/facturacion/ConfigDecolecta";
import { ConfigSol } from "@/components/sire/ConfigSol";
import { useAuth } from "@/lib/auth";
import { HistorialNormativo } from "@/components/HistorialNormativo";

type Seccion = "tipografia" | "usuarios" | "empresa" | "integraciones" | "normativa";
const SECCIONES: Seccion[] = ["empresa", "tipografia", "usuarios", "normativa", "integraciones"];

export const Route = createFileRoute("/_authenticated/configuracion-sistema")({
  validateSearch: (s: Record<string, unknown>): { seccion?: string } => (typeof s["seccion"] === "string" ? { seccion: s["seccion"] } : {}),
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
  const { seccion } = Route.useSearch();
  const navigate = useNavigate({ from: "/configuracion-sistema" });
  const { rol } = useAuth();
  const enCinta = useEnCinta();
  const admin = rol === "gerente" || rol === "administrador";
  let pestana: Seccion = SECCIONES.includes(seccion as Seccion) ? (seccion as Seccion) : "empresa";
  if (!admin && (pestana === "normativa" || pestana === "integraciones")) pestana = "empresa";
  const setPestana = (v: Seccion) => navigate({ search: { seccion: v }, replace: true });
  const opciones = [
    { id: "empresa" as const, texto: "Datos de la empresa", icono: <Building2 className="size-4" /> },
    { id: "tipografia" as const, texto: "Tipografía de documentos", icono: <FileText className="size-4" /> },
    { id: "usuarios" as const, texto: "Usuarios y Roles", icono: <ShieldCheck className="size-4" /> },
    ...(admin ? [{ id: "normativa" as const, texto: "Valores normativos (RMV / UIT)", icono: <Scale className="size-4" /> }, { id: "integraciones" as const, texto: "Integraciones", icono: <Plug className="size-4" /> }] : []),
  ];

  return (
    <div className="space-y-4">
      <CabeceraModulo
        ruta="Sistema › Configuración"
        titulo="Configuración del Sistema"
        descripcion="Parámetros generales del sistema y sus documentos."
        icono={<SlidersHorizontal className="h-5 w-5" />}
      />
      {enCinta ? (
        <Encabezado titulo="Configuración del Sistema" subtitulo="Sistema › Configuración" />
      ) : (
        <Pestanas etiqueta="Configuración del sistema" valor={pestana} onCambiar={setPestana} variante="boton" opciones={opciones} />
      )}
      {pestana === "normativa" ? <HistorialNormativo /> : pestana === "tipografia" ? <TipografiaDocumentosPanel /> : pestana === "empresa" ? <DatosEmpresaTabs /> : pestana === "integraciones" ? <div className="grid gap-4 xl:grid-cols-2"><ConfigDecolecta enLinea />{rol === "gerente" ? <ConfigSol /> : <Panel titulo="SUNAT SIRE · API SOL"><p className="p-5 text-sm text-muted-foreground">Solo Gerencia puede ver o cambiar las credenciales SOL.</p></Panel>}</div> : <UsuariosPanel />}
    </div>
  );
}
