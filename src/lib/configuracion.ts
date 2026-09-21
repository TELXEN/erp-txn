export type Situacion = "No iniciado" | "En proceso" | "Retrasado" | "Completado" | "Cancelado";
export type Prioridad = "Alta" | "Media" | "Baja";

export type Tono = { fondo: string; borde: string };

export const SITUACIONES: Situacion[] = [
  "No iniciado",
  "En proceso",
  "Retrasado",
  "Completado",
  "Cancelado",
];

export const PRIORIDADES: Prioridad[] = ["Alta", "Media", "Baja"];

export const TONO_SITUACION: Record<Situacion, Tono> = {
  "No iniciado": { fondo: "#E9E9E6", borde: "#C6C6C0" },
  "En proceso": { fondo: "#D2E9F8", borde: "#94C7E8" },
  Retrasado: { fondo: "#FBE1C4", borde: "#EFB673" },
  Completado: { fondo: "#CFEAD6", borde: "#92CFA3" },
  Cancelado: { fondo: "#F8D2CD", borde: "#E79E97" },
};

export const TONO_PRIORIDAD: Record<Prioridad, Tono> = {
  Alta: { fondo: "#F8D2CD", borde: "#E79E97" },
  Media: { fondo: "#FBE1C4", borde: "#EFB673" },
  Baja: { fondo: "#D5DFF8", borde: "#A3B6EA" },
};

export function tonoSituacion(valor: string): Tono {
  return TONO_SITUACION[valor as Situacion] ?? TONO_SITUACION["No iniciado"];
}

export function tonoPrioridad(valor: string): Tono {
  return TONO_PRIORIDAD[valor as Prioridad] ?? TONO_PRIORIDAD.Media;
}
