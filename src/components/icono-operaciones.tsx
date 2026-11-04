import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Operaciones en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];
const EJES = P("M3 3v16a2 2 0 0 0 2 2h16", "x");
const PINZA: IconNode[number] = ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", key: "r" }];

export const DashboardProyectosDT = dosTonos([P("M3.34 19a10 10 0 1 1 17.32 0", "a")], [P("m12 14 4-4", "b")]);
export const ProyectosDT = dosTonos(
  [P("M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z", "a")],
  [P("M8 16h.01", "b"), P("M12 16h.01", "c"), P("M16 16h.01", "d")],
);
export const PartidasDT = dosTonos(
  [P("M13 5h8", "a"), P("M13 12h8", "b"), P("M13 19h8", "c")],
  [P("m3 17 2 2 4-4", "d"), P("m3 7 2 2 4-4", "e")],
);
export const AvanceDT = dosTonos(
  [P("M22 12h-2.48", "a"), P("M4.49 12H2", "b")],
  [P("M19.52 12a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12", "c")],
);
export const CalendarioDT = dosTonos(
  [["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "a" }], P("M16 2v4", "b"), P("M3 10h18", "c"), P("M8 2v4", "d")],
  [P("M17 14h-6", "e"), P("M13 18H7", "f"), P("M7 14h.01", "g"), P("M17 18h.01", "h")],
);
export const GanttDT = dosTonos([EJES], [P("M10 6h8", "a"), P("M8 11h7", "b"), P("M12 16h6", "c")]);
export const CurvaSDT = dosTonos([EJES], [P("M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7", "a")]);
export const RequerimientoDT = dosTonos(
  [P("M16 4h2a2 2 0 0 1 2 2v2", "a"), P("M8 22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "b"), PINZA],
  [P("M21.34 15.664a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z", "c")],
);
export const ValorizacionesDT = dosTonos(
  [PINZA, P("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", "a")],
  [P("m9 14 2 2 4-4", "b")],
);
export const AprobacionesDT = dosTonos(
  [P("M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "a")],
  [P("m9 12 2 2 4-4", "b")],
);
