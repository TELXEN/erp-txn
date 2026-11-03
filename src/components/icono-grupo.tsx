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
