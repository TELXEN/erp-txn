import { useEffect, useState } from "react";

export type TemaId =
  | "telxen"
  | "obsidiana"
  | "word"
  | "excel"
  | "powerpoint";

function temaOffice(
  id: TemaId,
  nombre: string,
  descripcion: string,
  c: { base: string; panel: string; hover: string; borde: string; muted: string; tinte: string },
): Tema {
  return {
    id,
    nombre,
    descripcion,
    muestraBase: c.base,
    muestraAcento: c.hover,
    vars: {
      "--brand": c.tinte,
      "--brand-foreground": c.panel,
      "--cta": c.base,
      "--cta-foreground": "#FFFFFF",
      "--primary": c.base,
      "--primary-foreground": "#FFFFFF",
      "--accent": c.base,
      "--accent-foreground": "#FFFFFF",
      "--ring": c.base,
      "--sidebar": c.base,
      "--sidebar-foreground": "#FFFFFF",
      "--sidebar-muted": c.muted,
      "--sidebar-border": c.borde,
      "--sidebar-hover": c.hover,
      "--sidebar-panel": c.panel,
    },
  };
}

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
      "--primary": "#1C1C1F",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#FFC709",
      "--accent-foreground": "#171717",
      "--ring": "#003352",
      "--sidebar": "#1C1C1F",
      "--sidebar-foreground": "#FAFAFA",
      "--sidebar-muted": "#A1A1AA",
      "--sidebar-border": "#333338",
      "--sidebar-hover": "#262629",
      "--sidebar-panel": "#242427",
    },
  },
  temaOffice("word", "Microsoft Word", "Azul Word de Microsoft 365", {
    base: "#185ABD",
    panel: "#103F91",
    hover: "#2B6FD6",
    borde: "#4A7FCF",
    muted: "#D0E0F7",
    tinte: "oklch(0.975 0.01 255)",
  }),
  temaOffice("excel", "Microsoft Excel", "Verde Excel de Microsoft 365", {
    base: "#107C41",
    panel: "#0A5C30",
    hover: "#1A8F4F",
    borde: "#3D9A66",
    muted: "#CDEBD9",
    tinte: "oklch(0.975 0.01 155)",
  }),
  temaOffice("powerpoint", "Microsoft PowerPoint", "Naranja rojizo PowerPoint de Microsoft 365", {
    base: "#C43E1C",
    panel: "#9C3014",
    hover: "#D35230",
    borde: "#DB7457",
    muted: "#F8D6CB",
    tinte: "oklch(0.975 0.01 40)",
  }),
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
    if (guardado === "redwood" || guardado === "monocromo" || guardado === "esmeralda" || guardado === "cobalto" || guardado === "zafiro") return "telxen";
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
