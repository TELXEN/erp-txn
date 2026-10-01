import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FuenteDocumentoId = "carlito" | "arial" | "times" | "source-sans-3";

export type FuenteDocumento = {
  id: FuenteDocumentoId;
  nombre: string;
  descripcion: string;
  css: string;
  pdfFamily: string;
  jsPdfFamily: "helvetica" | "times";
};

export const FUENTE_DOCUMENTO_DEFECTO: FuenteDocumentoId = "carlito";

export const FUENTES_DOCUMENTOS: FuenteDocumento[] = [
  {
    id: "carlito",
    nombre: "Calibri (Carlito)",
    descripcion: "Corporativa, compacta y familiar para documentos comerciales.",
    css: 'Carlito, Calibri, "Segoe UI", sans-serif',
    pdfFamily: "PdfCarlito",
    jsPdfFamily: "helvetica",
  },
  {
    id: "arial",
    nombre: "Arial",
    descripcion: "Clara y neutral, compatible con tablas y reportes extensos.",
    css: '"Liberation Sans", Arial, Helvetica, sans-serif',
    pdfFamily: "PdfArial",
    jsPdfFamily: "helvetica",
  },
  {
    id: "times",
    nombre: "Times New Roman",
    descripcion: "Clásica y formal para documentos administrativos.",
    css: '"Liberation Serif", "Times New Roman", Times, serif',
    pdfFamily: "PdfTimes",
    jsPdfFamily: "times",
  },
  {
    id: "source-sans-3",
    nombre: "Source Sans 3",
    descripcion: "Moderna y muy legible en tamaños pequeños.",
    css: '"Source Sans 3", Arial, sans-serif',
    pdfFamily: "PdfSourceSans3",
    jsPdfFamily: "helvetica",
  },
];

export function esFuenteDocumento(valor: string | null | undefined): valor is FuenteDocumentoId {
  return FUENTES_DOCUMENTOS.some((fuente) => fuente.id === valor);
}

export function fuenteDocumento(valor: string | null | undefined) {
  return FUENTES_DOCUMENTOS.find((fuente) => fuente.id === valor) ?? FUENTES_DOCUMENTOS[0];
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