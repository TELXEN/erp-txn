import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Datos en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];

export const CatalogoDT = dosTonos(
  [P("M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", "a")],
  [P("M12 7v14", "b")],
);

export const MaestroDT = dosTonos(
  [["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "a" }], P("M3 5V19A9 3 0 0 0 21 19V5", "b")],
  [P("M3 12A9 3 0 0 0 21 12", "c")],
);

export const UnidadesDT = dosTonos(
  [P("M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z", "a")],
  [P("m14.5 12.5 2-2", "b"), P("m11.5 9.5 2-2", "c"), P("m8.5 6.5 2-2", "d"), P("m17.5 15.5 2-2", "e")],
);

export const EspecialidadesDT = dosTonos(
  [P("M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z", "a"), ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1", key: "b" }]],
  [["circle", { cx: "17.5", cy: "17.5", r: "3.5", key: "c" }]],
);

export const CategoriasDT = dosTonos(
  [
    P("M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z", "a"),
    P("M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z", "b"),
  ],
  [P("M3 5a2 2 0 0 0 2 2h3", "c"), P("M3 3v13a2 2 0 0 0 2 2h3", "d")],
);

export const SubcategoriasDT = dosTonos(
  [
    ["rect", { x: "16", y: "16", width: "6", height: "6", rx: "1", key: "a" }],
    ["rect", { x: "2", y: "16", width: "6", height: "6", rx: "1", key: "b" }],
    ["rect", { x: "9", y: "2", width: "6", height: "6", rx: "1", key: "c" }],
  ],
  [P("M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3", "d"), P("M12 12V8", "e")],
);

export const MarcasDT = dosTonos(
  [P("M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z", "a")],
  [["circle", { cx: "7.5", cy: "7.5", r: ".5", fill: "currentColor", key: "b" }]],
);

export const TitulosWbsDT = dosTonos(
  [P("M3 10a2 2 0 0 0 2 2h3", "a"), P("M3 5v12a2 2 0 0 0 2 2h3", "b")],
  [P("M8 5h13", "c"), P("M13 12h8", "d"), P("M13 19h8", "e")],
);

export const MaterialesDT = dosTonos(
  [P("M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z", "a")],
  [P("M12 22V12", "b"), ["polyline", { points: "3.29 7 12 12 20.71 7", key: "c" }], P("m7.5 4.27 9 5.15", "d")],
);

export const SubcontratosDT = dosTonos(
  [P("M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516", "a"), P("M14.487 7.858A1 1 0 0 1 14 7V2", "b")],
  [P("M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z", "c"), P("M8 18h1", "d")],
);

export const EquiposDT = dosTonos(
  [
    P("M10 18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a3 3 0 0 1-3-3 1 1 0 0 1 1-1z", "a"),
    P("M13 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1l-.81 3.242a1 1 0 0 1-.97.758H8", "b"),
  ],
  [P("M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3", "c"), P("M18 6h4", "d"), P("m5 10-2 8", "e"), P("m7 18 2-8", "f")],
);

export const HerramientasDT = dosTonos(
  [P("m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9", "a"), P("m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5", "b")],
  [P("m18 15 4-4", "c")],
);

export const ManoObraDT = dosTonos(
  [
    P("m14 13-8.381 8.38a1 1 0 0 1-3.001-3L11 9.999", "a"),
    P("M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024", "b"),
    P("M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069", "c"),
  ],
  [P("M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z", "d")],
);

export const MargenesDT = dosTonos(
  [["line", { x1: "19", x2: "5", y1: "5", y2: "19", key: "a" }]],
  [["circle", { cx: "6.5", cy: "6.5", r: "2.5", key: "b" }], ["circle", { cx: "17.5", cy: "17.5", r: "2.5", key: "c" }]],
);

export const LaboralDT = dosTonos(
  [P("M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z", "a")],
  [P("M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", "b"), P("M12 18V6", "c")],
);

export const CodInsumosDT = dosTonos(
  [P("M3 5v14", "a"), P("M21 5v14", "b")],
  [P("M8 5v14", "c"), P("M12 5v14", "d"), P("M17 5v14", "e")],
);
