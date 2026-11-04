import { Icon, type LucideProps } from "lucide-react";
import type { IconNode } from "lucide-react";

/**
 * Iconos de la cinta Comercial en dos tonos: las piezas de `estructura` usan el color del texto (negro)
 * y las de `acento` llevan la clase `acento` (azul de la cinta, ver styles.css).
 */
function dosTonos(estructura: IconNode, acento: IconNode) {
  const nodo: IconNode = [
    ...estructura,
    ...acento.map(([t, a]) => [t, { ...a, className: "acento" }] as IconNode[number]),
  ];
  const C = ({ className, ...p }: LucideProps) => <Icon iconNode={nodo} className={`icono-dt ${className ?? ""}`} {...p} />;
  return C;
}

const HOJA = "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z";
const PLIEGUE = "M14 2v5a1 1 0 0 0 1 1h5";
const hoja: IconNode = [["path", { d: HOJA, key: "h" }], ["path", { d: PLIEGUE, key: "p" }]];
const DOLAR: IconNode = [["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", key: "s" }]];

export const ClientesDT = dosTonos(
  [["circle", { cx: "12", cy: "8", r: "3.5", key: "c" }], ["path", { d: "M5.5 21v-1.5A4.5 4.5 0 0 1 10 15h4a4.5 4.5 0 0 1 4.5 4.5V21", key: "cb" }]],
  [
    ["path", { d: "M5.2 11.6a2.6 2.6 0 1 1 1.6-4.9", key: "i" }],
    ["path", { d: "M1.5 19v-.8a3.4 3.4 0 0 1 3.2-3.4", key: "ib" }],
    ["path", { d: "M18.8 11.6a2.6 2.6 0 1 0-1.6-4.9", key: "d" }],
    ["path", { d: "M22.5 19v-.8a3.4 3.4 0 0 0-3.2-3.4", key: "db" }],
  ],
);

export const CotizacionDT = dosTonos(hoja, [
  ["path", { d: "M10 9H8", key: "a" }], ["path", { d: "M16 13H8", key: "b" }], ["path", { d: "M16 17H8", key: "c" }],
]);

export const CotizacionesDT = dosTonos(
  [
    ["path", { d: "M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8", key: "a" }],
    ["path", { d: "M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z", key: "b" }],
  ],
  [["path", { d: "M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1", key: "c" }]],
);

export const CalculadoraDT = dosTonos(
  [["rect", { width: "16", height: "20", x: "4", y: "2", rx: "2", key: "r" }]],
  [
    ["line", { x1: "8", x2: "16", y1: "6", y2: "6", key: "l" }],
    ["line", { x1: "16", x2: "16", y1: "14", y2: "18", key: "v" }],
    ...["M16 10h.01", "M12 10h.01", "M8 10h.01", "M12 14h.01", "M8 14h.01", "M12 18h.01", "M8 18h.01"].map(
      (d, i) => ["path", { d, key: `k${i}` }] as IconNode[number],
    ),
  ],
);

export const PlantillasDT = dosTonos(
  [["rect", { width: "18", height: "7", x: "3", y: "3", rx: "1", key: "a" }]],
  [["rect", { width: "9", height: "7", x: "3", y: "14", rx: "1", key: "b" }], ["rect", { width: "5", height: "7", x: "16", y: "14", rx: "1", key: "c" }]],
);

export const PreliquidacionesDT = dosTonos(hoja, [
  ["path", { d: "M8 18v-1", key: "a" }], ["path", { d: "M12 18v-6", key: "b" }], ["path", { d: "M16 18v-3", key: "c" }],
]);

export const FacturacionDT = dosTonos(
  [
    ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2", key: "a" }], ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2", key: "b" }],
    ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2", key: "c" }], ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2", key: "d" }],
  ],
  [["path", { d: "M8 7v10", key: "e" }], ["path", { d: "M12 7v10", key: "f" }], ["path", { d: "M17 7v10", key: "g" }]],
);

export const FacturasDT = dosTonos(
  [
    ["path", { d: "M13 22h5a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.3", key: "a" }],
    ["path", { d: PLIEGUE, key: "p" }],
  ],
  [
    ["path", { d: "m7.69 16.479 1.29 4.88a.5.5 0 0 1-.698.591l-1.843-.849a1 1 0 0 0-.879.001l-1.846.85a.5.5 0 0 1-.692-.593l1.29-4.88", key: "c" }],
    ["circle", { cx: "6", cy: "14", r: "3", key: "d" }],
  ],
);

export const BoletasDT = dosTonos(
  [["path", { d: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z", key: "a" }]],
  [...DOLAR, ["path", { d: "M12 17.5v-11", key: "b" }]],
);

export const NotaCreditoDT = dosTonos(hoja, [["path", { d: "M9 15h6", key: "a" }]]);
export const NotaDebitoDT = dosTonos(hoja, [["path", { d: "M9 15h6", key: "a" }], ["path", { d: "M12 18v-6", key: "b" }]]);
export const BajasDT = dosTonos(hoja, [["path", { d: "m14.5 12.5-5 5", key: "a" }], ["path", { d: "m9.5 12.5 5 5", key: "b" }]]);

export const RegistroVentasDT = dosTonos(
  [["path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z", key: "a" }]],
  [["path", { d: "M2 10h20", key: "b" }]],
);

export const GuiasDT = dosTonos(
  [
    ["path", { d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14", key: "b" }],
    ["polyline", { points: "3.29 7 12 12 20.71 7", key: "d" }],
    ["line", { x1: "12", x2: "12", y1: "22", y2: "12", key: "e" }],
  ],
  [["path", { d: "m16 16 2 2 4-4", key: "a" }], ["path", { d: "m7.5 4.27 9 5.15", key: "c" }]],
);

export const RetencionesDT = dosTonos(
  [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "r" }], ["circle", { cx: "12", cy: "12", r: "2", key: "c" }]],
  [
    ["path", { d: "m7.9 7.9 2.7 2.7", key: "a" }], ["path", { d: "m13.4 10.6 2.7-2.7", key: "b" }],
    ["path", { d: "m7.9 16.1 2.7-2.7", key: "d" }], ["path", { d: "m13.4 13.4 2.7 2.7", key: "e" }],
  ],
);

export const PercepcionesDT = dosTonos([["circle", { cx: "12", cy: "12", r: "10", key: "c" }]], [...DOLAR, ["path", { d: "M12 18V6", key: "b" }]]);
