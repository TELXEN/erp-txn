/**
 * Tema documental compartido: Factura electrónica, Cotización y Preliquidación.
 * Cambiar un valor aquí actualiza los tres documentos (pantalla, impresión y PDF).
 */

export const DOC = {
  ink: "#374151",
  text: "#374151",
  muted: "#374151",
  mute: "#6B7280",
  line: "#E5E7EB",
  soft: "#F9FAFB",
  total: "#F3F4F6",
  green: "#1A2B4C",
  greenDark: "#1A2B4C",
  greenSoft: "#ffffff",
  dark: "#1A2B4C",
  white: "#ffffff",
  accent: "#F1C40F",
  accentSoft: "#FEF9E7",
  accentText: "#7D6608",
} as const;

/** Paleta monocromática para impresión/PDF: negro puro, grises neutros, sin acentos de color. */
export const DOC_MONO = {
  ink: "#111111",
  mute: "#444444",
  line: "#D4D4D4",
  soft: "#F5F5F5",
  total: "#EDEDED",
  dark: "#000000",
  accent: "#000000",
  accentSoft: "#F5F5F5",
  white: "#ffffff",
} as const;

/** Las hojas HTML heredan la misma selección que el ERP. */
export const DOC_FUENTE_CSS = "var(--font-global)";

/** Alias para plantillas que usan nombres pizarra/esmeralda: mapean al tema documental. */
export const DOC_ALIAS = {
  slate950: DOC.green,
  slate700: DOC.ink,
  slate500: DOC.mute,
  slate300: DOC.line,
  slate100: DOC.total,
  slate50: DOC.soft,
  emerald800: DOC.green,
  emerald700: DOC.green,
  emerald100: DOC.accentSoft,
  emerald50: DOC.soft,
  white: DOC.white,
} as const;
