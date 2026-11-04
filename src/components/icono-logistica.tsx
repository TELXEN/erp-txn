import type { IconNode } from "lucide-react";
import { dosTonos } from "./icono-comercial";

/** Iconos de la cinta Logística en dos tonos: estructura negra, detalles en azul (clase `acento`). */
const P = (d: string, k: string) => ["path", { d, key: k }] as IconNode[number];
const C = (cx: string, cy: string, r: string, k: string) => ["circle", { cx, cy, r, key: k }] as IconNode[number];

export const ProveedoresDT = dosTonos(
  [P("m21 3 1 11h-2", "a"), P("M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3", "b"), P("M3 4h8", "c")],
  [
    P("m11 17 2 2a1 1 0 1 0 3-3", "d"),
    P("m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4", "e"),
  ],
);

export const BandejaReqDT = dosTonos(
  [P("M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z", "a")],
  [["polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12", key: "b" }]],
);

export const OrdenCompraDT = dosTonos(
  [P("M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12", "a")],
  [C("8", "21", "1", "b"), C("19", "21", "1", "c")],
);

export const ImportacionesDT = dosTonos(
  [P("M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z", "a")],
  [P("M17.5 6h.01", "b"), P("M15.5 8h.01", "c")],
);

export const TransportistasDT = dosTonos(
  [
    P("M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2", "a"),
    P("M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14", "b"),
  ],
  [P("M15 18H9", "c"), C("17", "18", "2", "d"), C("7", "18", "2", "e")],
);

export const AlmacenContDT = dosTonos(
  [P("M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z", "a")],
  [P("M10 21.9V14L2.1 9.1", "b"), P("m10 14 11.9-6.9", "c"), P("M14 19.8v-8.1", "d"), P("M18 17.5V9.4", "e")],
);

export const VehiculosDT = dosTonos(
  [
    P("m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8", "a"),
    ["rect", { width: "18", height: "8", x: "3", y: "10", rx: "2", key: "b" }],
    P("M5 18v2", "c"),
    P("M19 18v2", "d"),
  ],
  [P("M7 14h.01", "e"), P("M17 14h.01", "f")],
);

export const ResumenDT = dosTonos(
  [
    ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "a" }],
    ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "b" }],
  ],
  [
    ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "c" }],
    ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "d" }],
  ],
);

export const FlotaDT = dosTonos(
  [P("M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2", "a")],
  [C("7", "17", "2", "b"), P("M9 17h6", "c"), C("17", "17", "2", "d")],
);

export const TareoVehicularDT = dosTonos(
  [P("M16 2v4", "a"), P("M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5", "b"), P("M3 10h5", "c"), P("M8 2v4", "d")],
  [C("16", "16", "6", "e"), P("M16 14v2.2l1.6 1", "f")],
);

export const TrasladosDT = dosTonos(
  [P("M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15", "a")],
  [C("6", "19", "3", "b"), C("18", "5", "3", "c")],
);

export const AlmacenDT = dosTonos(
  [
    P("M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11", "a"),
    P("M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z", "b"),
  ],
  [P("M6 13h12", "c"), P("M6 17h12", "d")],
);

export const InventarioDT = dosTonos(
  [
    P("M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z", "a"),
    P("M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z", "b"),
    P("M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z", "c"),
  ],
  [
    P("m7 16.5-4.74-2.85", "d"), P("m7 16.5 5-3", "e"), P("M7 16.5v5.17", "f"),
    P("m17 16.5-5-3", "g"), P("m17 16.5 4.74-2.85", "h"), P("M17 16.5v5.17", "i"),
    P("M12 8 7.26 5.15", "j"), P("m12 8 4.74-2.85", "k"), P("M12 13.5V8", "l"),
  ],
);
