import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Personal en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];

export const PersonalDT = dosTonos(
  [P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "a"), ["circle", { cx: "9", cy: "7", r: "4", key: "b" }]],
  [P("M16 3.128a4 4 0 0 1 0 7.744", "c"), P("M22 21v-2a4 4 0 0 0-3-3.87", "d")],
);

export const AsistenciaDT = dosTonos(
  [
    P("M8 2v4", "a"),
    P("M16 2v4", "b"),
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "c" }],
    P("M3 10h18", "d"),
  ],
  [
    P("M8 14h.01", "e"), P("M12 14h.01", "f"), P("M16 14h.01", "g"),
    P("M8 18h.01", "h"), P("M12 18h.01", "i"), P("M16 18h.01", "j"),
  ],
);

export const BoletasPagoDT = dosTonos(
  [P("M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20", "a")],
  [P("M15 13a3 3 0 1 0-6 0", "b"), ["circle", { cx: "12", cy: "8", r: "2", key: "c" }]],
);

export const BeneficiosDT = dosTonos(
  [
    P("M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17", "a"),
    P("m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9", "b"),
    P("m2 16 6 6", "c"),
  ],
  [["circle", { cx: "16", cy: "9", r: "2.9", key: "d" }], ["circle", { cx: "6", cy: "5", r: "3", key: "e" }]],
);

export const EppDT = dosTonos(
  [P("M14 6a6 6 0 0 1 6 6v3", "a"), P("M4 15v-3a6 6 0 0 1 6-6", "b"), ["rect", { x: "2", y: "15", width: "20", height: "4", rx: "1", key: "c" }]],
  [P("M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5", "d")],
);

export const EppBancoDT = dosTonos(
  [
    ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "a" }],
    P("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "b"),
  ],
  [P("M12 11h4", "c"), P("M12 16h4", "d"), P("M8 11h.01", "e"), P("M8 16h.01", "f")],
);

export const EppEntregasDT = dosTonos(
  [
    P("M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14", "a"),
    P("m7.5 4.27 9 5.15", "b"),
    ["polyline", { points: "3.29 7 12 12 20.71 7", key: "c" }],
    ["line", { x1: "12", x2: "12", y1: "22", y2: "12", key: "d" }],
  ],
  [P("M16 16h6", "e"), P("M19 13v6", "f")],
);

export const EppHistorialDT = dosTonos(
  [P("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "a"), P("M3 3v5h5", "b")],
  [P("M12 7v5l4 2", "c")],
);

export const BoletaPagoDT = dosTonos(
  [["rect", { width: "20", height: "12", x: "2", y: "6", rx: "2", key: "a" }]],
  [["circle", { cx: "12", cy: "12", r: "2", key: "b" }], P("M6 12h.01", "c"), P("M18 12h.01", "d")],
);

export const HonorariosDT = dosTonos(
  [
    P("M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z", "a"),
    P("M14 2v5a1 1 0 0 0 1 1h5", "b"),
  ],
  [P("M16 22a4 4 0 0 0-8 0", "c"), ["circle", { cx: "12", cy: "15", r: "3", key: "d" }]],
);

export const AfpDT = dosTonos(
  [P("M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z", "a")],
  [P("M16 10h.01", "b"), P("M2 8v1a2 2 0 0 0 2 2h1", "c")],
);

export const CtsDT = dosTonos(
  [P("M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3", "a"), P("M5 21h14", "b")],
  [P("M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4", "c")],
);

export const GratificacionesDT = dosTonos(
  [P("M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8", "a"), ["rect", { x: "3", y: "7", width: "18", height: "4", rx: "1", key: "b" }]],
  [P("M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5", "c"), P("M12 7v14", "d")],
);

export const LiquidacionesDT = dosTonos(
  [P("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "a"), ["circle", { cx: "9", cy: "7", r: "4", key: "b" }]],
  [["line", { x1: "22", x2: "16", y1: "11", y2: "11", key: "c" }]],
);
