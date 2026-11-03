/**
 * Iconos "realistas a color" para la cinta (botones grandes y pequeños).
 * Llevan los mismos nombres que los de lucide a los que sustituyen en AppShell,
 * así la definición de la cinta no cambia. Estilo: rellenos planos con volumen
 * ligero y contorno oscuro fino, legibles desde 16 px.
 */
import type { ReactNode, SVGProps } from "react";

const C = "var(--color-icono-contorno)";
const PA = "var(--color-icono-papel)";
const PS = "var(--color-icono-papel-sombra)";
const LI = "var(--color-icono-linea)";
const VE = "var(--color-icono-verde)";
const AZ = "var(--color-icono-azul)";
const RO = "var(--color-icono-rojo)";
const NA = "var(--color-icono-naranja)";
const OR = "var(--color-icono-dorado)";
const ME = "var(--color-icono-metal)";
const MC = "var(--color-icono-metal-claro)";
const MA = "var(--color-icono-madera)";
const MD = "var(--color-icono-madera-clara)";
const VN = "var(--color-icono-ventana)";
const TE = "var(--color-icono-techo)";
const RS = "var(--color-icono-rosa)";
const PIEL = "#f1c27d";

type P = SVGProps<SVGSVGElement>;
function crear(nombre: string, dibujo: ReactNode) {
  const Icono = ({ className, ...props }: P) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {dibujo}
    </svg>
  );
  Icono.displayName = nombre;
  return Icono;
}

/* Piezas reutilizables */
const hoja = (x = 4, y = 2.5, w = 14, h = 19) => (
  <>
    <path fill={PA} d={`M${x + 1.5} ${y}h${w - 6}l5 5V${y + h - 1.5}a1.5 1.5 0 0 1-1.5 1.5H${x + 1.5}A1.5 1.5 0 0 1 ${x} ${y + h - 1.5}V${y + 1.5}A1.5 1.5 0 0 1 ${x + 1.5} ${y}Z`} />
    <path fill={PS} d={`M${x + w - 4.5} ${y}v5h5Z`} />
  </>
);
const persona = (cx: number, cy: number, ropa: string, s = 1) => (
  <>
    <path fill={ropa} d={`M${cx - 5 * s} ${cy + 9 * s}a${5 * s} ${4.5 * s} 0 0 1 ${10 * s} 0Z`} />
    <circle fill={PIEL} cx={cx} cy={cy + 1.5 * s} r={3 * s} />
  </>
);
const moneda = (cx: number, cy: number, r: number) => (
  <>
    <circle fill={OR} cx={cx} cy={cy} r={r} />
    <circle stroke="#b07d12" cx={cx} cy={cy} r={r * 0.68} />
  </>
);
const carpeta = (color: string) => (
  <>
    <path fill={color} d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5l2 2h9a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18Z" />
    <path fill="#fff" fillOpacity={0.35} stroke="none" d="M3 9.5h18v1.5H3Z" />
  </>
);

/* ---------- Inicio ---------- */
export const SlidersHorizontal = crear("SlidersHorizontal", <>
  <rect fill={MC} x="2.5" y="3.5" width="19" height="17" rx="2" />
  <path stroke={LI} strokeWidth={1.6} d="M6 8h12M6 12h12M6 16h12" />
  <rect fill={AZ} x="13" y="6.5" width="3" height="3" rx="0.8" />
  <rect fill={VE} x="7.5" y="10.5" width="3" height="3" rx="0.8" />
  <rect fill={NA} x="11.5" y="14.5" width="3" height="3" rx="0.8" />
</>);
export const Settings = crear("Settings", <>
  <path fill={ME} d="M10.3 2.5h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.5.5v3.4l-2.5.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.4h-3.4l-.5-2.4-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.5-.5v-3.4l2.5-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8Z" />
  <circle fill={MC} cx="12" cy="12" r="3.3" />
</>);
export const Palette = crear("Palette", <>
  <path fill={MD} d="M12 2.5a9.5 9.5 0 1 0 0 19c1.4 0 2-1 1.5-2.2-.6-1.4.3-2.8 1.8-2.8H18a3.5 3.5 0 0 0 3.5-3.5C21.5 6.6 17.3 2.5 12 2.5Z" />
  <circle fill={RO} cx="7.5" cy="10" r="1.6" /><circle fill={OR} cx="10.5" cy="6.5" r="1.6" />
  <circle fill={VE} cx="15" cy="6.8" r="1.6" /><circle fill={AZ} cx="7.8" cy="14.8" r="1.6" />
</>);
export const CircleHelp = crear("CircleHelp", <>
  <circle fill={AZ} cx="12" cy="12" r="9.5" />
  <path stroke="#fff" strokeWidth={2.2} d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.4" />
  <circle fill="#fff" stroke="none" cx="12" cy="17.4" r="1.3" />
</>);
export const NotebookText = crear("NotebookText", <>
  <rect fill={AZ} x="4" y="2.5" width="16" height="19" rx="1.5" />
  <rect fill={PA} x="7" y="4.5" width="11" height="15" rx="0.8" />
  <path stroke={LI} strokeWidth={1.2} d="M9 8.5h7M9 11.5h7M9 14.5h5" />
  <path stroke={C} strokeWidth={1.4} d="M3 7h3M3 12h3M3 17h3" />
</>);
export const BadgeInfo = crear("BadgeInfo", <>
  <circle fill={VN} cx="12" cy="12" r="9.5" />
  <circle fill={AZ} stroke="none" cx="12" cy="7.5" r="1.5" />
  <path stroke={AZ} strokeWidth={2.6} d="M12 11v6.5" />
</>);
export const Stamp = crear("Stamp", <>
  <path fill={MA} d="M9.5 3.5a2.5 2.5 0 0 1 5 0V10h-5Z" />
  <path fill={RO} d="M4 13a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2.5H4Z" />
  <rect fill={ME} x="3" y="15.5" width="18" height="2.5" rx="0.6" />
  <path stroke={RO} strokeWidth={1.4} d="M5 21h14" />
</>);
export const UserRoundCheck = crear("UserRoundCheck", <>
  {persona(9.5, 3, AZ, 1.15)}
  <circle fill={VE} cx="17.5" cy="17" r="4" />
  <path stroke="#fff" strokeWidth={1.5} d="m15.6 17 1.3 1.3 2.4-2.6" />
</>);
export const Scale = crear("Scale", <>
  <path stroke={C} strokeWidth={1.5} d="M12 3.5v16M5 7h14" />
  <path fill={OR} d="M2.5 13.5 5 7.5l2.5 6Z" /><path fill={OR} d="M16.5 13.5 19 7.5l2.5 6Z" />
  <path fill={OR} d="M2.5 13.5h5a2.5 2.5 0 0 1-5 0ZM16.5 13.5h5a2.5 2.5 0 0 1-5 0Z" />
  <rect fill={MA} x="7.5" y="19.5" width="9" height="2" rx="0.8" />
  <circle fill={OR} cx="12" cy="4" r="1.3" />
</>);
export const Plug = crear("Plug", <>
  <path stroke={C} strokeWidth={2} d="M9 2.5V7M15 2.5V7" />
  <path fill={ME} d="M6 7h12v4a6 6 0 0 1-12 0Z" />
  <path fill={C} d="M10.5 16.5h3v2h-3Z" />
  <path stroke={VE} strokeWidth={2} d="M12 18.5v3" />
</>);
export const Type = crear("Type", <>
  <rect fill={PA} x="2.5" y="2.5" width="19" height="19" rx="2" />
  <path stroke={AZ} strokeWidth={2.6} strokeLinecap="butt" d="M6.5 7h11M12 7v11" />
  <path stroke={C} strokeWidth={1.2} d="M9.5 18h5" />
</>);
export const FolderKanban = crear("FolderKanban", <>
  {carpeta(OR)}
  <rect fill={AZ} x="6" y="11.5" width="3" height="6" rx="0.5" />
  <rect fill={VE} x="10.5" y="11.5" width="3" height="4" rx="0.5" />
  <rect fill={RO} x="15" y="11.5" width="3" height="5" rx="0.5" />
</>);
export const UserCog = crear("UserCog", <>
  {persona(9, 3, NA, 1.1)}
  <circle fill={ME} cx="17.5" cy="17" r="4" />
  <circle fill={MC} cx="17.5" cy="17" r="1.5" />
</>);
export const Coins = crear("Coins", <>
  <ellipse fill={OR} cx="9" cy="17" rx="6.5" ry="3" />
  <path fill={OR} d="M2.5 13.5v3.5h13v-3.5Z" stroke="none" />
  <ellipse fill={OR} cx="9" cy="13.5" rx="6.5" ry="3" />
  <path d="M2.5 13.5V17M15.5 13.5V17" />
  {moneda(16, 8, 5.5)}
</>);

/* ---------- Catálogo / Maestro ---------- */
export const BookOpen = crear("BookOpen", <>
  <path fill={PA} d="M2.5 5c3-1 6.5-.8 9.5 1.2v14C9 18.3 5.5 18 2.5 19Z" />
  <path fill={PS} d="M21.5 5c-3-1-6.5-.8-9.5 1.2v14c3-1.9 6.5-2.2 9.5-1.2Z" />
  <path stroke={LI} d="M5 9h4.5M5 12h4.5M14.5 9H19M14.5 12H19" />
  <path fill={RO} stroke="none" d="M16.5 3.5h2.5v6l-1.25-1-1.25 1Z" />
</>);
export const Database = crear("Database", <>
  <path fill={AZ} d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
  <ellipse fill={VN} cx="12" cy="5.5" rx="8" ry="3" />
  <path stroke={VN} strokeWidth={1.2} d="M4 10c0 1.7 3.6 3 8 3s8-1.3 8-3M4 14.5c0 1.7 3.6 3 8 3s8-1.3 8-3" />
</>);
export const Shapes = crear("Shapes", <>
  <path fill={RO} d="M7 2.5 12 11H2Z" />
  <circle fill={AZ} cx="17" cy="7" r="4.3" />
  <rect fill={VE} x="3" y="13.5" width="8" height="8" rx="1" />
  <path fill={OR} d="m17 13 4.5 4.3-4.5 4.2-4.5-4.2Z" />
</>);
export const FolderTree = crear("FolderTree", <>
  <path stroke={C} strokeWidth={1.3} d="M6 7v11h5M6 11.5h5" />
  <path fill={OR} d="M3 2.5h3l1 1h2v4H3Z" />
  <path fill={OR} d="M11 9h3.5l1 1h5v3.5H11Z" />
  <path fill={AZ} d="M11 15.5h3.5l1 1h5V20H11Z" />
</>);
export const Network = crear("Network", <>
  <path stroke={C} strokeWidth={1.3} d="M12 8v4M5 16v-4h14v4" />
  <rect fill={AZ} x="8.5" y="2.5" width="7" height="5.5" rx="1" />
  <rect fill={VE} x="2" y="16" width="6" height="5" rx="1" />
  <rect fill={NA} x="16" y="16" width="6" height="5" rx="1" />
</>);
export const Tag = crear("Tag", <>
  <path fill={OR} d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7l9.5 9.5-8.5 8.5L3 11.5Z" />
  <circle fill={PA} cx="7.5" cy="7.5" r="1.7" />
  <path stroke="#b07d12" d="M11 11.5 15 15.5M13 10l3 3" />
</>);
export const ListTree = crear("ListTree", <>
  <path stroke={LI} strokeWidth={1.3} d="M5 7v12h3M5 13h3" />
  <rect fill={AZ} x="2.5" y="3" width="11" height="4" rx="1" />
  <rect fill={VE} x="8" y="11" width="13" height="4" rx="1" />
  <rect fill={OR} x="8" y="17" width="13" height="4" rx="1" />
</>);
export const FileSignature = crear("FileSignature", <>
  {hoja()}
  <path stroke={LI} strokeWidth={1.1} d="M6.5 9.5h7M6.5 12.5h7" />
  <path stroke={AZ} strokeWidth={1.4} d="M6.5 17.5c1.2-2 2-2 2.4-.4.3 1.2 1 1.2 1.8-.2.6-1 1.3-1 2 .6" />
  <path fill={RO} d="m17 20 1.6-1.2-1.2-1.6-1.6 1.2Z" stroke="none" />
</>);
export const Drill = crear("Drill", <>
  <path fill={NA} d="M3 5.5h12a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H9.5l-1 3H5.5l1-3H5A2 2 0 0 1 3 10Z" />
  <rect fill={C} x="4.5" y="15" width="5" height="6.5" rx="1" />
  <rect fill={ME} x="17" y="7" width="2.5" height="3.5" />
  <path stroke={C} strokeWidth={1.6} d="M19.5 8.75h2.5" />
</>);
export const Hammer = crear("Hammer", <>
  <path fill={MD} d="m11.5 10.5 2.1 2.1-7.6 7.6a1.5 1.5 0 0 1-2.1-2.1Z" />
  <path fill={ME} d="M9.5 6 13 2.5l3 1.5 4 4-2 2-2-1-2.5 2.5-3.5-3.5Z" />
  <path fill={MC} stroke="none" d="M13 3.5l2.6 1.3-1 1-2.1-1.6Z" />
</>);
export const Pickaxe = crear("Pickaxe", <>
  <path fill={MD} d="m13 9.5 1.5 1.5-9 9a1 1 0 0 1-1.5-1.5Z" />
  <path fill={ME} d="M5 6c4-3.5 9-4 13.5-2.5L20.5 5.5C22 10 21.5 15 18 19c.5-4.8-1-9-3.8-11.2C12 5 9.6 4.8 5 6Z" />
</>);
export const BadgeDollarSign = crear("BadgeDollarSign", <>
  <path fill={VE} d="m12 2 2.3 1.8 2.9-.3.9 2.8 2.5 1.5-.9 2.8.9 2.8-2.5 1.5-.9 2.8-2.9-.3L12 20l-2.3-1.8-2.9.3-.9-2.8-2.5-1.5.9-2.8-.9-2.8L5.9 7.3l.9-2.8 2.9.3Z" />
  <path stroke="#fff" strokeWidth={1.6} d="M14 8.5h-2.8a1.6 1.6 0 0 0 0 3.2h1.6a1.6 1.6 0 0 1 0 3.2H10M12 7v1.5M12 15v1.5" />
</>);
export const Barcode = crear("Barcode", <>
  <rect fill={PA} x="2" y="4.5" width="20" height="15" rx="1.5" />
  <path stroke={C} strokeWidth={1.5} strokeLinecap="butt" d="M5 7.5v9M8 7.5v9M12 7.5v9M17 7.5v9M19 7.5v9" />
  <path stroke={C} strokeWidth={0.8} strokeLinecap="butt" d="M6.6 7.5v9M10 7.5v9M14.5 7.5v9" />
  <path stroke={RO} strokeWidth={1} d="M3.5 12h17" />
</>);

/* ---------- Comercial ---------- */
export const Calculator = crear("Calculator", <>
  <rect fill={ME} x="4" y="2" width="16" height="20" rx="2" />
  <rect fill={VN} x="6" y="4" width="12" height="4.5" rx="0.8" />
  <g stroke="none">
    <rect fill={PA} x="6" y="10.5" width="3" height="2.5" rx="0.5" /><rect fill={PA} x="10.5" y="10.5" width="3" height="2.5" rx="0.5" /><rect fill={NA} x="15" y="10.5" width="3" height="2.5" rx="0.5" />
    <rect fill={PA} x="6" y="14.5" width="3" height="2.5" rx="0.5" /><rect fill={PA} x="10.5" y="14.5" width="3" height="2.5" rx="0.5" /><rect fill={NA} x="15" y="14.5" width="3" height="6" rx="0.5" />
    <rect fill={PA} x="6" y="18.5" width="7.5" height="2" rx="0.5" />
  </g>
</>);
export const LayoutTemplate = crear("LayoutTemplate", <>
  <rect fill={PA} x="2.5" y="3" width="19" height="18" rx="1.5" />
  <rect fill={AZ} x="4.5" y="5" width="15" height="4.5" rx="0.6" />
  <rect fill={VN} x="4.5" y="11.5" width="7" height="7.5" rx="0.6" />
  <path stroke={LI} strokeWidth={1.2} d="M14 12.5h5.5M14 15.5h5.5M14 18.5h3.5" />
</>);
export const FileText = crear("FileText", <>
  {hoja()}
  <path stroke={LI} strokeWidth={1.1} d="M6.5 10h8M6.5 13h8M6.5 16h5" />
</>);
export const Banknote = crear("Banknote", <>
  <rect fill="#7cc49a" x="1.5" y="5.5" width="21" height="13" rx="1.5" />
  <rect fill="none" stroke="#2b7a4b" x="3.5" y="7.5" width="17" height="9" rx="0.8" />
  <circle fill={VE} cx="12" cy="12" r="3" />
  <path stroke="#fff" strokeWidth={1.1} d="M12 10.3v3.4" />
</>);
export const FolderClosed = crear("FolderClosed", <>{carpeta(OR)}</>);

/* ---------- Operaciones ---------- */
export const Gauge = crear("Gauge", <>
  <path fill={C} d="M2.5 16a9.5 9.5 0 0 1 19 0v2H2.5Z" />
  <path stroke={VE} strokeWidth={2} strokeLinecap="butt" d="M5 15.5a7 7 0 0 1 2.4-5.2" />
  <path stroke={OR} strokeWidth={2} strokeLinecap="butt" d="M8.3 9.6A7 7 0 0 1 15.7 9.6" />
  <path stroke={RO} strokeWidth={2} strokeLinecap="butt" d="M16.6 10.3A7 7 0 0 1 19 15.5" />
  <path stroke="#fff" strokeWidth={1.6} d="m12 16 3.5-4.5" />
  <circle fill={MC} cx="12" cy="16" r="1.5" />
</>);
export const Factory = crear("Factory", <>
  <path fill={MC} d="M2.5 21V11l5 3v-3l5 3v-3l5 3V3.5h4V21Z" />
  <rect fill={RO} stroke="none" x="17.6" y="5" width="3.8" height="1.5" />
  <g fill={VN}><rect x="5" y="16" width="2.5" height="2.5" /><rect x="10" y="16" width="2.5" height="2.5" /><rect x="15" y="16" width="2.5" height="2.5" /></g>
</>);
export const Activity = crear("Activity", <>
  <rect fill={PA} x="2" y="3" width="20" height="18" rx="2" />
  <path stroke={VE} strokeWidth={2} d="M4 13h3.5l2-5 3.5 9 2-4h5" />
</>);

/* ---------- Logística ---------- */
export const Handshake = crear("Handshake", <>
  <path fill={AZ} d="M1.5 7h4l2 7h-4Z" /><path fill={NA} d="M22.5 7h-4l-2 7h4Z" />
  <path fill={PIEL} d="M6 8.5c2-1 4-1.5 6-.5l2.5-1c1.5-.3 3 .3 4 1.5L17 14l-4.5 4c-1 .9-2.3.4-2.6-.7-1 .3-1.9-.3-2-1.3-1 0-1.6-.8-1.5-1.8Z" />
  <path d="M12 8 9 10.5c.8 1 2.2 1 3 0l1.3-1" />
</>);
export const Inbox = crear("Inbox", <>
  <path fill={ME} d="M5 4h14l3 9v6a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 19v-6Z" />
  <path fill={MC} d="M2 13h5.5l1.5 3h6l1.5-3H22v6a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 19Z" />
  <rect fill={PA} x="7" y="6.5" width="10" height="4.5" stroke={LI} />
</>);
export const ShoppingCart = crear("ShoppingCart", <>
  <path stroke={C} strokeWidth={1.5} d="M1.5 3h3l2.5 12h12" />
  <path fill={AZ} d="M5.5 6h16l-2 7.5H7Z" />
  <circle fill={C} cx="9" cy="19" r="1.8" /><circle fill={C} cx="17.5" cy="19" r="1.8" />
</>);
export const Plane = crear("Plane", <>
  <path fill={MC} d="M21 3a1.5 1.5 0 0 0-2.1 0l-4.4 4.4-9.5-2.9-1.8 1.8 7.6 4.6-3.6 3.6-3-.5-1.5 1.5 3.5 2 2 3.5 1.5-1.5-.5-3 3.6-3.6 4.6 7.6 1.8-1.8-2.9-9.5L21 5.1A1.5 1.5 0 0 0 21 3Z" />
  <path stroke={AZ} strokeWidth={1.4} d="M7 8.8 9.2 7.3M15.2 14.8l1.5-2.2" />
</>);
export const Truck = crear("Truck", <>
  <rect fill={AZ} x="1.5" y="5" width="13" height="11" rx="1" />
  <path fill={NA} d="M14.5 8.5h4l3 3.5V16h-7Z" />
  <path fill={VN} d="M16 10h2.3l1.7 2H16Z" />
  <circle fill={C} cx="6" cy="17.5" r="2.2" /><circle fill={C} cx="17.5" cy="17.5" r="2.2" />
  <circle fill={ME} stroke="none" cx="6" cy="17.5" r="0.9" /><circle fill={ME} stroke="none" cx="17.5" cy="17.5" r="0.9" />
</>);
export const Warehouse = crear("Warehouse", <>
  <path fill={TE} d="M1.5 9.5 12 3l10.5 6.5V11H1.5Z" />
  <rect fill={MC} x="3" y="11" width="18" height="10" />
  <rect fill={ME} x="7.5" y="13.5" width="9" height="7.5" />
  <path stroke={C} d="M7.5 16h9M7.5 18.5h9" />
</>);
export const Car = crear("Car", <>
  <path fill={RO} d="M3 12.5 5 7.5A2 2 0 0 1 6.9 6h10.2A2 2 0 0 1 19 7.5l2 5v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
  <path fill={VN} d="M6.2 11.5 7.4 8h9.2l1.2 3.5Z" />
  <circle fill={C} cx="7" cy="17.5" r="2" /><circle fill={C} cx="17" cy="17.5" r="2" />
  <circle fill={OR} stroke="none" cx="5" cy="14" r="0.9" /><circle fill={OR} stroke="none" cx="19" cy="14" r="0.9" />
</>);
export const CalendarClock = crear("CalendarClock", <>
  <rect fill={PA} x="2.5" y="4" width="15" height="15" rx="1.5" />
  <path fill={RO} d="M2.5 5.5A1.5 1.5 0 0 1 4 4h12a1.5 1.5 0 0 1 1.5 1.5V8h-15Z" />
  <path stroke={C} strokeWidth={1.5} d="M6.5 2.5v3M13.5 2.5v3" />
  <circle fill={AZ} cx="17" cy="17" r="5" />
  <path stroke="#fff" strokeWidth={1.4} d="M17 14.5V17l1.7 1.2" />
</>);
export const Route = crear("Route", <>
  <path stroke={C} strokeWidth={3.2} d="M6 19h8.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H18" />
  <path stroke={OR} strokeWidth={1} strokeDasharray="1.6 1.6" d="M6 19h8.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H18" />
  <circle fill={VE} cx="5" cy="19" r="2.3" />
  <path fill={RO} d="M19 1.5a2.7 2.7 0 0 1 2.7 2.7c0 2-2.7 4.8-2.7 4.8s-2.7-2.8-2.7-4.8A2.7 2.7 0 0 1 19 1.5Z" />
</>);
export const Wrench = crear("Wrench", <>
  <path fill={ME} d="M14.5 2.5a5.5 5.5 0 0 0-5.1 7.6L3 16.5a2.1 2.1 0 0 0 3 3l6.4-6.4a5.5 5.5 0 0 0 7.6-5.1l-3 3-3-1-1-3 3-3a5.6 5.6 0 0 0-1.5-.5Z" />
  <circle fill={MC} cx="4.8" cy="18.2" r="0.9" />
</>);
export const PackagePlus = crear("PackagePlus", <>
  <path fill={MD} d="M2.5 7 10 3l7.5 4v9L10 20l-7.5-4Z" />
  <path fill={MA} d="M10 11v9l-7.5-4V7Z" />
  <path d="M2.5 7 10 11l7.5-4" />
  <circle fill={VE} cx="18" cy="17.5" r="4.5" />
  <path stroke="#fff" strokeWidth={1.6} d="M18 15.3v4.4M15.8 17.5h4.4" />
</>);
export const History = crear("History", <>
  <circle fill={PA} cx="12.5" cy="12" r="8.5" />
  <path stroke={AZ} strokeWidth={1.8} d="M4 12A8.5 8.5 0 1 1 6.5 18" />
  <path fill={AZ} stroke="none" d="m1.5 10.5 2.6 3.4 2.9-3.2Z" />
  <path stroke={C} strokeWidth={1.5} d="M12.5 7.5V12l3 2" />
</>);
export const HardHat = crear("HardHat", <>
  <path fill={OR} d="M4 16a8 8 0 0 1 16 0Z" />
  <path fill="#f7c95a" stroke="none" d="M10.5 8.2h3V15h-3Z" />
  <path d="M10.5 8.2V15M13.5 8.2V15" />
  <rect fill={OR} x="2" y="15.5" width="20" height="3" rx="1.2" />
</>);

/* ---------- Finanzas ---------- */
export const ShoppingBag = crear("ShoppingBag", <>
  <path fill={NA} d="M4 7.5h16l-1.2 13a1.5 1.5 0 0 1-1.5 1.4H6.7a1.5 1.5 0 0 1-1.5-1.4Z" />
  <path stroke={C} strokeWidth={1.4} d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4" />
</>);
export const Briefcase = crear("Briefcase", <>
  <path stroke={C} strokeWidth={1.5} d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  <rect fill={MA} x="2.5" y="6.5" width="19" height="14" rx="2" />
  <path stroke="#7a4f27" d="M2.5 12h19" />
  <rect fill={OR} x="10.5" y="10.5" width="3" height="3" rx="0.5" />
</>);
export const Wallet = crear("Wallet", <>
  <path fill={TE} d="M3 7a2 2 0 0 1 2-2h12.5v3" />
  <rect fill={MA} x="2.5" y="7" width="19" height="13" rx="2" />
  <path fill={TE} d="M15 11.5h6.5v4H15a2 2 0 0 1 0-4Z" />
  <circle fill={OR} cx="15.5" cy="13.5" r="1" />
</>);
export const TrendingUp = crear("TrendingUp", <>
  <rect fill={PA} stroke={LI} x="2.5" y="2.5" width="19" height="19" rx="2.5" />
  <path stroke={VE} strokeWidth={2.2} d="m5 17 5-5 3 3 6-6.5" />
  <path fill={VE} stroke="none" d="M20.5 6.5v5l-5-5Z" />
</>);
export const ScrollText = crear("ScrollText", <>
  <path fill={PA} d="M6 3.5h13a2 2 0 0 1 2 2V7h-3v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5h3Z" />
  <path fill={PS} d="M18 3.5a2 2 0 0 1 3 1.7V7h-3Z" />
  <path stroke={LI} strokeWidth={1.1} d="M9 8h6M9 11h6M9 14h4" />
</>);
export const ToolCase = crear("ToolCase", <>
  <path stroke={C} strokeWidth={1.5} d="M9 6.5V4.5h6v2" />
  <rect fill={RO} x="2.5" y="6.5" width="19" height="14" rx="1.5" />
  <rect fill={ME} x="2.5" y="11.5" width="19" height="2" />
  <rect fill={MC} x="10.5" y="10.5" width="3" height="4" rx="0.5" />
</>);
export const Fuel = crear("Fuel", <>
  <rect fill={RO} x="3" y="3" width="11" height="18" rx="1.5" />
  <rect fill={PA} x="5" y="5.5" width="7" height="4.5" rx="0.6" />
  <path stroke={C} strokeWidth={1.4} d="M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 0 3 0V8l-2.5-3" />
  <rect fill={C} x="2" y="20" width="13" height="1.8" rx="0.4" />
</>);
export const Grid3x3 = crear("Grid3x3", <>
  <rect fill={PA} x="2.5" y="2.5" width="19" height="19" rx="1.5" />
  <path fill={VE} stroke="none" d="M3 3h18v5.8H3Z" opacity={0.85} />
  <path stroke={C} d="M2.5 8.8h19M2.5 15.2h19M8.8 2.5v19M15.2 2.5v19" />
</>);
export const ArrowDownLeft = crear("ArrowDownLeft", <>
  {moneda(15, 9, 6.5)}
  <path stroke={VE} strokeWidth={2.6} d="M11 13 4 20" />
  <path fill={VE} stroke="none" d="M2.5 21.5V14l7.5 7.5Z" />
</>);
export const ArrowUpRight = crear("ArrowUpRight", <>
  {moneda(9, 15, 6.5)}
  <path stroke={RO} strokeWidth={2.6} d="m13 11 7-7" />
  <path fill={RO} stroke="none" d="M21.5 2.5V10L14 2.5Z" />
</>);
export const BadgePercent = crear("BadgePercent", <>
  <rect fill={AZ} x="2.5" y="5" width="19" height="14" rx="2" />
  <circle fill="#fff" stroke="none" cx="8.5" cy="9.5" r="1.6" /><circle fill="#fff" stroke="none" cx="15.5" cy="14.5" r="1.6" />
  <path stroke="#fff" strokeWidth={1.8} d="m16 8.5-8 7" />
</>);
export const CircleDollarSign = crear("CircleDollarSign", <>
  {moneda(12, 12, 9.5)}
  <path stroke="#7a560c" strokeWidth={1.6} d="M14.5 8.5h-3.3a1.8 1.8 0 0 0 0 3.6h1.6a1.8 1.8 0 0 1 0 3.6H9.5M12 6.5v2M12 15.7v1.8" />
</>);
export const FileX2 = crear("FileX2", <>
  {hoja()}
  <circle fill={RO} cx="16.5" cy="17" r="4.5" />
  <path stroke="#fff" strokeWidth={1.6} d="m14.8 15.3 3.4 3.4M18.2 15.3l-3.4 3.4" />
</>);

/* ---------- Personal ---------- */
export const Users = crear("Users", <>
  {persona(16, 3.5, NA, 0.95)}
  {persona(9, 4, AZ, 1.15)}
</>);
export const CalendarDays = crear("CalendarDays", <>
  <rect fill={PA} x="2.5" y="4" width="19" height="17" rx="1.5" />
  <path fill={RO} d="M2.5 5.5A1.5 1.5 0 0 1 4 4h16a1.5 1.5 0 0 1 1.5 1.5V9h-19Z" />
  <path stroke={C} strokeWidth={1.5} d="M7 2.5v3M17 2.5v3" />
  <g fill={LI} stroke="none"><rect x="5" y="11" width="3" height="2.5" /><rect x="10.5" y="11" width="3" height="2.5" /><rect x="5" y="15.5" width="3" height="2.5" /><rect x="10.5" y="15.5" width="3" height="2.5" /><rect x="16" y="15.5" width="3" height="2.5" /></g>
  <rect fill={VE} stroke="none" x="16" y="11" width="3" height="2.5" />
</>);
export const HandCoins = crear("HandCoins", <>
  {moneda(15.5, 6, 4)}
  <path fill={PIEL} d="M2 14.5h3l3-1.5h4.5a1.5 1.5 0 0 1 0 3H10l5.5-.2 4-2.3a1.5 1.5 0 0 1 1.8 2.3L16 20.5H5l-3 .5Z" />
  <rect fill={AZ} x="1" y="14" width="3" height="7.5" rx="0.5" />
</>);
export const Sprout = crear("Sprout", <>
  <path fill={MA} d="M5 16h14l-1.5 5.5h-11Z" />
  <path stroke="#2b7a4b" strokeWidth={1.5} d="M12 16V9" />
  <path fill={VE} d="M12 10C12 6 9 4 4.5 4.5 4.5 9 7.5 10.5 12 10Z" />
  <path fill="#5cc28a" d="M12 12c0-4 3-6 7.5-5.5C19.5 11 16.5 12.5 12 12Z" />
</>);
export const Gift = crear("Gift", <>
  <rect fill={AZ} x="3.5" y="11" width="17" height="10" rx="1" />
  <rect fill={VN} x="2.5" y="7.5" width="19" height="4" rx="1" />
  <path fill={RO} stroke="none" d="M10.8 7.5h2.4V21h-2.4Z" />
  <path fill={RO} d="M12 7.5C10 4 6.5 4 7 6.2c.3 1.3 3 1.3 5 1.3Zm0 0c2-3.5 5.5-3.5 5-1.3-.3 1.3-3 1.3-5 1.3Z" />
</>);
export const UserMinus = crear("UserMinus", <>
  {persona(9.5, 3, ME, 1.15)}
  <circle fill={RO} cx="17.5" cy="17" r="4" />
  <path stroke="#fff" strokeWidth={1.6} d="M15.5 17h4" />
</>);
