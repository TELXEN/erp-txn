import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Inicio en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];
const D = (cx: string, cy: string, k: string) => ["circle", { cx, cy, r: ".5", fill: "currentColor", key: k }] as IconNode[number];

export const ConfigSistemaDT = dosTonos(
  [P("M10 5H3", "a"), P("M12 19H3", "b"), P("M21 12h-9", "c"), P("M21 19h-5", "d"), P("M21 5h-7", "e"), P("M8 12H3", "f")],
  [P("M14 3v4", "g"), P("M16 17v4", "h"), P("M8 10v4", "i")],
);
export const EmpresaDT = dosTonos(
  [P("M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2", "a"), P("M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", "b")],
  [P("M10 12h4", "c"), P("M10 8h4", "d"), P("M14 21v-3a2 2 0 0 0-4 0v3", "e")],
);
export const UsuariosDT = dosTonos(
  [P("M2 21a8 8 0 0 1 13.292-6", "a"), ["circle", { cx: "10", cy: "8", r: "5", key: "b" }]],
  [P("m16 19 2 2 4-4", "c")],
);
export const NormativaDT = dosTonos(
  [P("M12 3v18", "a"), P("M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1", "b"), P("M7 21h10", "c")],
  [P("m19 8 3 8a5 5 0 0 1-6 0zV7", "d"), P("m5 8 3 8a5 5 0 0 1-6 0zV7", "e")],
);
export const IntegracionesDT = dosTonos(
  [P("M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z", "a"), P("M12 22v-5", "b")],
  [P("M15 8V2", "c"), P("M9 8V2", "d")],
);
export const ParametrosDT = dosTonos(
  [P("M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915", "a")],
  [["circle", { cx: "12", cy: "12", r: "3", key: "b" }]],
);
export const CodificacionDT = dosTonos(
  [P("M14 2v5a1 1 0 0 0 1 1h5", "a"), P("M9.65 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v4", "b")],
  [P("M4 12v6", "c"), P("M4 14h2", "d"), ["circle", { cx: "4", cy: "20", r: "2", key: "e" }]],
);
export const ParamProyectosDT = dosTonos(
  [P("M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z", "a")],
  [P("M8 10v4", "b"), P("M12 10v2", "c"), P("M16 10v6", "d")],
);
export const RecursosHumanosDT = dosTonos(
  [P("M10 15H6a4 4 0 0 0-4 4v2", "a"), ["circle", { cx: "9", cy: "7", r: "4", key: "b" }]],
  [
    P("m14.305 16.53.923-.382", "c"), P("m15.228 13.852-.923-.383", "d"), P("m16.852 12.228-.383-.923", "e"), P("m16.852 17.772-.383.924", "f"),
    P("m19.148 12.228.383-.923", "g"), P("m19.53 18.696-.382-.924", "h"), P("m20.772 13.852.924-.383", "i"), P("m20.772 16.148.924.383", "j"),
    ["circle", { cx: "18", cy: "15", r: "3", key: "k" }],
  ],
);
export const CostosFinanzasDT = dosTonos(
  [["circle", { cx: "16", cy: "8", r: "6", key: "a" }], P("M13.744 17.736a6 6 0 1 1-7.48-7.48", "b")],
  [P("M15 6h1v4", "c"), P("m6.134 14.768.866-.5 2 3.464", "d")],
);
export const DisenoDT = dosTonos(
  [P("M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z", "a")],
  [P("M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7", "b"), P("M 7 17h.01", "c"), P("m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8", "d")],
);
export const TemasDT = dosTonos(
  [P("M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z", "a")],
  [D("13.5", "6.5", "b"), D("17.5", "10.5", "c"), D("6.5", "12.5", "d"), D("8.5", "7.5", "e")],
);
export const TipografiaDT = dosTonos([P("M12 4v16", "a"), P("M9 20h6", "c")], [P("M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2", "b")]);
export const AyudaGrupoDT = dosTonos([["circle", { cx: "12", cy: "12", r: "10", key: "a" }]], [P("M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "b"), P("M12 17h.01", "c")]);
export const AyudaDT = dosTonos(
  [P("M12 7v14", "l"), P("M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", "b")],
  [P("M15.5 8.5a1.8 1.8 0 1 1 2.3 1.7c-.5.2-.8.6-.8 1.1v.4", "q"), P("M17 14h.01", "p")],
);
export const ManualDT = dosTonos(
  [["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2", key: "r" }], P("M2 6h4", "a"), P("M2 10h4", "b"), P("M2 14h4", "c"), P("M2 18h4", "d")],
  [P("M9.5 8h5", "e"), P("M9.5 12H16", "f"), P("M9.5 16H14", "g")],
);
export const AcercaDT = dosTonos(
  [P("M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z", "a")],
  [["line", { x1: "12", x2: "12", y1: "16", y2: "12", key: "b" }], ["line", { x1: "12", x2: "12.01", y1: "8", y2: "8", key: "c" }]],
);
export const LicenciaDT = dosTonos(
  [P("M20 15.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z", "b"), P("M5 22h14", "c")],
  [P("M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-6 0c0 2 1 2 1 3.5V13", "a")],
);
