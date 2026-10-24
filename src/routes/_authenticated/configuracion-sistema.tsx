import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plug, FileText, Landmark, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { CabeceraModulo, Panel, Pestanas } from "@/components/ui-kit";
import { DatosEmpresa } from "@/components/DatosEmpresa";
import { CuentasBancarias } from "@/components/CuentasBancarias";
import { TipografiaDocumentosPanel } from "@/components/TipografiaDocumentos";
import { UsuariosPanel } from "@/components/UsuariosPanel";
import { ConfigDecolecta } from "@/components/facturacion/ConfigDecolecta";
import { ConfigSol } from "@/components/sire/ConfigSol";
import { useAuth } from "@/lib/auth";

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
  const [pestana, setPestana] = useState<"tema" | "tipografia" | "usuarios" | "empresa" | "bancos" | "integraciones">("tema");
  const { rol } = useAuth();

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
          { id: "tema", texto: "Tema de colores", icono: <IconoPaletaColores className="size-4" /> },
          { id: "bancos", texto: "Cuentas bancarias", icono: <Landmark className="size-4" /> },
          { id: "tipografia", texto: "Tipografía de documentos", icono: <FileText className="size-4" /> },
          { id: "usuarios", texto: "Usuarios y Roles", icono: <ShieldCheck className="size-4" /> },
          ...(rol === "gerente" || rol === "administrador" ? [{ id: "integraciones" as const, texto: "Integraciones", icono: <Plug className="size-4" /> }] : []),
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
            </Panel> : pestana === "tipografia" ? <TipografiaDocumentosPanel /> : pestana === "empresa" ? <DatosEmpresa /> : pestana === "bancos" ? <CuentasBancarias /> : pestana === "integraciones" ? <div className="grid gap-4 xl:grid-cols-2"><ConfigDecolecta enLinea />{rol === "gerente" ? <ConfigSol /> : <Panel titulo="SUNAT SIRE · API SOL"><p className="p-5 text-sm text-muted-foreground">Solo Gerencia puede ver o cambiar las credenciales SOL.</p></Panel>}</div> : <UsuariosPanel />}
    </div>
  );
}
