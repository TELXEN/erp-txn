import { Icon, type LucideProps } from "lucide-react";
import type { IconNode } from "lucide-react";

/** Tres personas (centro al frente) dibujadas con el trazo de lucide. */
const nodo: IconNode = [
  ["circle", { cx: "12", cy: "8", r: "3.5", key: "c" }],
  ["path", { d: "M5.5 21v-1.5A4.5 4.5 0 0 1 10 15h4a4.5 4.5 0 0 1 4.5 4.5V21", key: "cb" }],
  ["path", { d: "M5.2 11.6a2.6 2.6 0 1 1 1.6-4.9", key: "i" }],
  ["path", { d: "M1.5 19v-.8a3.4 3.4 0 0 1 3.2-3.4", key: "ib" }],
  ["path", { d: "M18.8 11.6a2.6 2.6 0 1 0-1.6-4.9", key: "d" }],
  ["path", { d: "M22.5 19v-.8a3.4 3.4 0 0 0-3.2-3.4", key: "db" }],
];

export const GrupoPersonas = (props: LucideProps) => <Icon iconNode={nodo} {...props} />;

/** Llanta con llave inglesa cruzada, mismo trazo de lucide. */
const llanta: IconNode = [
  ["circle", { cx: "10", cy: "14", r: "7.5", key: "t" }],
  ["circle", { cx: "10", cy: "14", r: "3", key: "r" }],
  ["path", { d: "M10 6.5v4.5M10 17v4.5M2.5 14H7M13 14h4.5", key: "s" }],
  ["path", { d: "M15.5 8.5 19 5", key: "m" }],
  ["path", { d: "M19 5a2.5 2.5 0 1 0 2-2.9l-1.2 1.2.4 1.3 1.3.4 1.2-1.2", key: "w" }],
];

export const LlantaLlave = (props: LucideProps) => <Icon iconNode={llanta} {...props} />;

/** Libro abierto con signo de pregunta, mismo trazo de lucide. */
const libroAyuda: IconNode = [
  ["path", { d: "M12 7v14", key: "l" }],
  ["path", { d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z", key: "b" }],
  ["path", { d: "M15.5 8.5a1.8 1.8 0 1 1 2.3 1.7c-.5.2-.8.6-.8 1.1v.4", key: "q" }],
  ["path", { d: "M17 14h.01", key: "p" }],
];

export const LibroAyuda = (props: LucideProps) => <Icon iconNode={libroAyuda} {...props} />;
