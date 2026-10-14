import type { jsPDF } from "jspdf";
import carlitoRegular from "@/assets/fonts/carlito-regular.ttf?url";
import carlitoBold from "@/assets/fonts/carlito-bold.ttf?url";
import sourceRegular from "@/assets/fonts/source-sans-3-regular.ttf?url";
import sourceBold from "@/assets/fonts/source-sans-3-bold.ttf?url";
import robotoRegular from "@/assets/fonts/roboto-regular.ttf?url";
import robotoBold from "@/assets/fonts/roboto-bold.ttf?url";
import sansRegular from "@/assets/fonts/liberation-sans-regular.ttf?url";
import sansBold from "@/assets/fonts/liberation-sans-bold.ttf?url";
import serifRegular from "@/assets/fonts/liberation-serif-regular.ttf?url";
import serifBold from "@/assets/fonts/liberation-serif-bold.ttf?url";
import { fuenteDocumento } from "./fuentes-documentos";

const archivos: Record<string, readonly [string, string]> = {
  carlito: [carlitoRegular, carlitoBold],
  arial: [sansRegular, sansBold],
  times: [serifRegular, serifBold],
  "source-sans-3": [sourceRegular, sourceBold],
  "segoe-ui": [sourceRegular, sourceBold],
  roboto: [robotoRegular, robotoBold],
  "helvetica-neue": [sansRegular, sansBold],
};
const cache = new Map<string, Promise<string>>();

function cargar(url: string) {
  const existente = cache.get(url);
  if (existente) return existente;
  const pendiente = fetch(url).then(async (respuesta) => {
    if (!respuesta.ok) throw new Error("No se pudo cargar la tipografía del PDF.");
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    let binario = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binario);
  }).catch((error) => { cache.delete(url); throw error; });
  cache.set(url, pendiente);
  return pendiente;
}

export async function registrarFuenteJsPdf(doc: jsPDF, id: string | undefined) {
  const fuente = fuenteDocumento(id);
  const urls = archivos[fuente.id];
  if (!urls) throw new Error("Tipografía de PDF no disponible.");
  const datos = await Promise.all(urls.map(cargar));
  datos.forEach((contenido, i) => {
    const estilo = i === 0 ? "normal" : "bold";
    const nombre = `${fuente.pdfFamily}-${estilo}.ttf`;
    doc.addFileToVFS(nombre, contenido);
    doc.addFont(nombre, fuente.pdfFamily, estilo);
  });
  return fuente.pdfFamily;
}