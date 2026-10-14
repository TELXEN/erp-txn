import { Font } from "@react-pdf/renderer";
import carlitoRegular from "@/assets/fonts/carlito-regular.woff";
import carlitoBold from "@/assets/fonts/carlito-bold.woff";
import arialRegular from "@/assets/fonts/liberation-sans-regular.ttf";
import arialBold from "@/assets/fonts/liberation-sans-bold.ttf";
import timesRegular from "@/assets/fonts/liberation-serif-regular.ttf";
import timesBold from "@/assets/fonts/liberation-serif-bold.ttf";
import sourceSansRegular from "@/assets/fonts/source-sans-3-regular.woff";
import sourceSansBold from "@/assets/fonts/source-sans-3-bold.woff";
import robotoRegular from "@/assets/fonts/roboto-regular.woff";
import robotoBold from "@/assets/fonts/roboto-bold.woff";
import interRegular from "@/assets/fonts/inter-regular.woff";
import interBold from "@/assets/fonts/inter-bold.woff";
import monoRegular from "@/assets/fonts/jetbrains-mono-regular.woff";
import monoBold from "@/assets/fonts/jetbrains-mono-bold.woff";
import { fuenteDocumento, type FuenteDocumentoId } from "@/lib/fuentes-documentos";

const archivos = [
  ["PdfCarlito", carlitoRegular, carlitoBold],
  ["PdfArial", arialRegular, arialBold],
  ["PdfTimes", timesRegular, timesBold],
  ["PdfSourceSans3", sourceSansRegular, sourceSansBold],
  ["PdfSegoeUI", sourceSansRegular, sourceSansBold],
  ["PdfRoboto", robotoRegular, robotoBold],
  ["PdfHelveticaNeue", arialRegular, arialBold],
  ["PdfInter", interRegular, interBold],
  ["PdfJetBrainsMono", monoRegular, monoBold],
] as const;

let registradas = false;

export function registrarFuentesPdf() {
  if (registradas) return;
  archivos.forEach(([family, regular, bold]) => {
    Font.register({ family, fonts: [{ src: regular, fontWeight: 400 }, { src: bold, fontWeight: 700 }] });
  });
  registradas = true;
}

export function familiaReactPdf(id?: FuenteDocumentoId) {
  registrarFuentesPdf();
  return fuenteDocumento(id).pdfFamily;
}
export function familiaCifrasReactPdf(id?: FuenteDocumentoId) {
  registrarFuentesPdf();
  const f = fuenteDocumento(id);
  return f.pdfCifras ?? f.pdfFamily;
}
