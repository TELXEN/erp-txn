import { useEffect, useState } from "react";

export type TemaId = "telxen" | "esmeralda" | "cobalto" | "zafiro" | "obsidiana";

export type Tema = {
  id: TemaId;
  nombre: string;
  descripcion: string;
  muestraBase: string;
  muestraAcento: string;
  vars: Record<string, string>;
};

export const TEMAS: Tema[] = [
  {
    id: "telxen",
    nombre: "TELXEN Industrial",
    descripcion: "Menú azul petróleo y amarillo eléctrico",
    muestraBase: "#003352",
    muestraAcento: "#FFC709",
    vars: {
      "--brand": "oklch(0.975 0.006 240)",
      "--brand-foreground": "#003352",
      "--cta": "#FFC709",
      "--cta-foreground": "#003352",
      "--primary": "#003352",
      "--primary-foreground": "oklch(0.985 0.005 95)",
      "--accent": "#FFC709",
      "--accent-foreground": "#003352",
      "--ring": "#003352",
      "--sidebar": "#003352",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#B8CFDC",
      "--sidebar-border": "#285B76",
      "--sidebar-hover": "#124966",
      "--sidebar-panel": "#002A44",
    },
  },
  {
    id: "esmeralda",
    nombre: "Esmeralda y Pizarra",
    descripcion: "Menú pizarra y verde esmeralda",
    muestraBase: "#1E293B",
    muestraAcento: "#059669",
    vars: {
      "--brand": "oklch(0.975 0.004 250)",
      "--brand-foreground": "#1E293B",
      "--cta": "#059669",
      "--cta-foreground": "#FFFFFF",
      "--primary": "#1E293B",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#059669",
      "--accent-foreground": "#FFFFFF",
      "--ring": "#059669",
      "--sidebar": "#1E293B",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#CBD5E1",
      "--sidebar-border": "#475569",
      "--sidebar-hover": "#334155",
      "--sidebar-panel": "#172033",
    },
  },
  {
    id: "cobalto",
    nombre: "Cobalto y Naranja",
    descripcion: "Menú azul cobalto y naranja de obra",
    muestraBase: "#0A2540",
    muestraAcento: "#EA580C",
    vars: {
      "--brand": "oklch(0.975 0.008 250)",
      "--brand-foreground": "#0A2540",
      "--cta": "#EA580C",
      "--cta-foreground": "#FFFFFF",
      "--primary": "#1E40AF",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#EA580C",
      "--accent-foreground": "#FFFFFF",
      "--ring": "#1E40AF",
      "--sidebar": "#1E40AF",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#BFDBFE",
      "--sidebar-border": "#4F70D7",
      "--sidebar-hover": "#1D4ED8",
      "--sidebar-panel": "#1E3A8A",
    },
  },
  {
    id: "zafiro",
    nombre: "Zafiro y Cian",
    descripcion: "Menú negro con acentos zafiro y cian",
    muestraBase: "#0A2647",
    muestraAcento: "#0FAAFF",
    vars: {
      "--brand": "oklch(0.975 0.006 235)",
      "--brand-foreground": "#0A2647",
      "--cta": "#0FAAFF",
      "--cta-foreground": "#0A2647",
      "--primary": "#09090B",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#0FAAFF",
      "--accent-foreground": "#0A2647",
      "--ring": "#0FAAFF",
      "--sidebar": "#09090B",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#A1A1AA",
      "--sidebar-border": "#27272A",
      "--sidebar-hover": "#18181B",
      "--sidebar-panel": "#18181B",
    },
  },
  {
    id: "obsidiana",
    nombre: "TELXEN Obsidiana",
    descripcion: "Menú negro, texto blanco y acento amarillo",
    muestraBase: "#09090B",
    muestraAcento: "#FFC709",
    vars: {
      "--brand": "oklch(0.975 0.006 240)",
      "--brand-foreground": "#003352",
      "--cta": "#FFC709",
      "--cta-foreground": "#171717",
      "--primary": "#09090B",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#FFC709",
      "--accent-foreground": "#171717",
      "--ring": "#003352",
      "--sidebar": "#09090B",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#A1A1AA",
      "--sidebar-border": "#27272A",
      "--sidebar-hover": "#18181B",
      "--sidebar-panel": "#18181B",
    },
  },
];

const LS_TEMA = "erp-telxen-tema";

export function aplicarTema(id: TemaId) {
  const tema = TEMAS.find((t) => t.id === id) ?? TEMAS[0]!;
  const raiz = document.documentElement;
  for (const [clave, valor] of Object.entries(tema.vars)) {
    raiz.style.setProperty(clave, valor);
  }
  try {
    window.localStorage.setItem(LS_TEMA, tema.id);
  } catch {
    // almacenamiento no disponible
  }
}

export function leerTema(): TemaId {
  try {
    const guardado = window.localStorage.getItem(LS_TEMA);
    if (TEMAS.some((t) => t.id === guardado)) return guardado as TemaId;
    if (guardado === "redwood" || guardado === "monocromo") return "telxen";
  } catch {
    // almacenamiento no disponible
  }
  return "telxen";
}

export function useTema() {
  const [tema, setTema] = useState<TemaId>("telxen");

  useEffect(() => {
    const guardado = leerTema();
    setTema(guardado);
    aplicarTema(guardado);
  }, []);

  function cambiarTema(id: TemaId) {
    setTema(id);
    aplicarTema(id);
  }

  return { tema, cambiarTema };
}
