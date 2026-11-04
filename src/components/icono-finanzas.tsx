import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Finanzas en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];
const EJES = P("M3 3v16a2 2 0 0 0 2 2h16", "x");

export const DashboardFinDT = dosTonos([EJES], [P("m19 9-5 5-4-4-3 3", "a")]);

export const CostosDirectosDT = dosTonos(
  [P("M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z", "a")],
  [P("M16 10a4 4 0 0 1-8 0", "b"), P("M3.103 6.034h17.794", "c")],
);

export const GastosGeneralesDT = dosTonos(
  [P("M21.21 15.89A10 10 0 1 1 8 2.83", "a")],
  [P("M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z", "b")],
);

export const CajaChicaDT = dosTonos(
  [P("M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4", "a")],
  [P("M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1", "b")],
);

export const TesoreriaDT = dosTonos(
  [P("M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", "a")],
  [["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "b" }]],
);

export const FlujoCajaDT = dosTonos(
  [EJES],
  [P("M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z", "a")],
);

export const SireDT = dosTonos(
  [P("M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6", "a"), P("M14 2v5a1 1 0 0 0 1 1h5", "b")],
  [P("m14 20 2 2 4-4", "c")],
);

export const GGResumenDT = dosTonos(
  [["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2", key: "a" }]],
  [P("M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16", "b")],
);

export const DetalleGastosDT = dosTonos(
  [
    P("M19 17V5a2 2 0 0 0-2-2H4", "a"),
    P("M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3", "b"),
  ],
  [P("M15 12h-5", "c"), P("M15 8h-5", "d")],
);

export const CombustibleDT = dosTonos(
  [P("M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16", "a"), P("M2 21h13", "b")],
  [P("M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5", "c"), P("M3 9h11", "d")],
);

export const FlujoResumenDT = dosTonos([P("m22 7-8.5 8.5-5-5L2 17", "a")], [P("M16 7h6v6", "b")]);

export const MatrizDT = dosTonos(
  [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "a" }]],
  [P("M3 9h18", "b"), P("M3 15h18", "c"), P("M9 3v18", "d"), P("M15 3v18", "e")],
);

export const TesoreriaResumenDT = dosTonos(
  [P("M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z", "a"), P("M3 22h18", "b")],
  [P("M10 18v-7", "c"), P("M14 18v-7", "d"), P("M18 18v-7", "e"), P("M6 18v-7", "f")],
);

export const CxcDT = dosTonos([P("M17 7 7 17", "a")], [P("M17 17H7V7", "b")]);

export const CxpDT = dosTonos([P("M7 17 17 7", "a")], [P("M7 7h10v10", "b")]);

export const PrestamosDT = dosTonos(
  [P("M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z", "a")],
  [P("m15 9-6 6", "b"), P("M9 9h.01", "c"), P("M15 15h.01", "d")],
);
