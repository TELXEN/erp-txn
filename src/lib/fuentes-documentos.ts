import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FuenteDocumentoId =
  | "carlito"
  | "arial"
  | "times"
  | "source-sans-3"
  | "segoe-ui"
  | "roboto"
  | "helvetica-neue"
  | "inter-jetbrains";

export type FuenteDocumento = {
  id: FuenteDocumentoId;
  nombre: string;
  descripcion: string;
  css: string;
  pdfFamily: string;
  excelFamily: string;
  /** Familia para códigos y cifras; por defecto la misma del texto. */
  cssCifras?: string;
  pdfCifras?: string;
  excelCifras?: string;
};

export const FUENTE_DOCUMENTO_DEFECTO: FuenteDocumentoId = "carlito";

const FUENTE_CARLITO: FuenteDocumento = {
  id: "carlito",
  nombre: "Calibri (Carlito)",
  descripcion: "Corporativa, compacta y familiar para documentos comerciales.",
  css: 'Carlito, Calibri, "Segoe UI", sans-serif',
  pdfFamily: "PdfCarlito",
  excelFamily: "Carlito",
};

export const FUENTES_DOCUMENTOS: FuenteDocumento[] = [
  FUENTE_CARLITO,
  {
    id: "arial",
    nombre: "Arial",
    descripcion: "Clara y neutral, compatible con tablas y reportes extensos.",
    css: '"Liberation Sans", Arial, Helvetica, sans-serif',
    pdfFamily: "PdfArial",
    excelFamily: "Arial",
  },
  {
    id: "times",
    nombre: "Times New Roman",
    descripcion: "Clásica y formal para documentos administrativos.",
    css: '"Liberation Serif", "Times New Roman", Times, serif',
    pdfFamily: "PdfTimes",
    excelFamily: "Times New Roman",
  },
  {
    id: "source-sans-3",
    nombre: "Source Sans 3",
    descripcion: "Moderna y muy legible en tamaños pequeños.",
    css: '"Source Sans 3", Arial, sans-serif',
    pdfFamily: "PdfSourceSans3",
    excelFamily: "Source Sans 3",
  },
  {
    id: "segoe-ui",
    nombre: "Segoe UI",
    descripcion: "Contemporánea y limpia para documentos técnicos y ejecutivos.",
    css: '"Source Sans 3", "Segoe UI", sans-serif',
    pdfFamily: "PdfSegoeUI",
    excelFamily: "Segoe UI",
  },
  {
    id: "roboto",
    nombre: "Roboto",
    descripcion: "Equilibrada y legible en reportes, cuadros y cifras.",
    css: 'Roboto, Arial, sans-serif',
    pdfFamily: "PdfRoboto",
    excelFamily: "Roboto",
  },
  {
    id: "helvetica-neue",
    nombre: "Helvetica Neue",
    descripcion: "Sobria y precisa para presentaciones comerciales.",
    css: '"Liberation Sans", "Helvetica Neue", Arial, sans-serif',
    pdfFamily: "PdfHelveticaNeue",
    excelFamily: "Helvetica Neue",
  },
  {
    id: "inter-jetbrains",
    nombre: "Inter + JetBrains Mono",
    descripcion: "Inter para textos; JetBrains Mono para códigos y cifras alineadas.",
    css: 'Inter, Arial, sans-serif',
    pdfFamily: "PdfInter",
    excelFamily: "Inter",
    cssCifras: '"JetBrains Mono", Consolas, monospace',
    pdfCifras: "PdfJetBrainsMono",
    excelCifras: "JetBrains Mono",
  },
];

export function esFuenteDocumento(valor: string | null | undefined): valor is FuenteDocumentoId {
  return FUENTES_DOCUMENTOS.some((fuente) => fuente.id === valor);
}

export function fuenteDocumento(valor: string | null | undefined) {
  return FUENTES_DOCUMENTOS.find((fuente) => fuente.id === valor) ?? FUENTE_CARLITO;
}

export function aplicarFuenteGlobal(valor: string | null | undefined) {
  if (typeof document === "undefined") return;
  const fuente = fuenteDocumento(valor);
  document.documentElement.style.setProperty("--font-global", fuente.css);
  document.documentElement.style.setProperty("--font-cifras", fuente.cssCifras ?? fuente.css);
  document.documentElement.dataset["fuenteDocumento"] = fuente.id;
}

export function useConfiguracionDocumentos() {
  return useQuery({
    queryKey: ["configuracion_documentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion_documentos")
        .select("id,fuente_pdf")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return {
        id: data?.id ?? "",
        fuente_pdf: esFuenteDocumento(data?.fuente_pdf) ? data.fuente_pdf : FUENTE_DOCUMENTO_DEFECTO,
      };
    },
  });
}

export function useFuenteDocumento() {
  const consulta = useConfiguracionDocumentos();
  return { ...consulta, fuente: fuenteDocumento(consulta.data?.fuente_pdf) };
}