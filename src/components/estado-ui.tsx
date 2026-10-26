import type { ReactNode } from "react";
import { tonoPrioridad, tonoSituacion, type Tono } from "@/lib/configuracion";

function Insignia({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: tono.fondo,
        borderColor: tono.borde,
        color: `color-mix(in srgb, ${tono.borde} 65%, #16161a)`,
      }}
    >
      {children}
    </span>
  );
}

export function InsigniaSituacion({ valor }: { valor: string }) {
  return <Insignia tono={tonoSituacion(valor)}>{valor}</Insignia>;
}

export function InsigniaPrioridad({ valor }: { valor: string }) {
  return <Insignia tono={tonoPrioridad(valor)}>{valor}</Insignia>;
}

export function tonoTipoPresupuesto(valor: string): Tono {
  const v = (valor || "").toLowerCase();
  if (v.includes("deductivo")) return { fondo: "#F8D2E2", borde: "#E79EBB" };
  if (v.includes("contractual")) return { fondo: "#FDF3C9", borde: "#E8CE6B" };
  if (v.includes("metrado")) return { fondo: "#CFE9EE", borde: "#8FC4CF" };
  return { fondo: "#D2F2E8", borde: "#8FD6BC" };
}

export function InsigniaTipoPresupuesto({ valor }: { valor: string }) {
  return <Insignia tono={tonoTipoPresupuesto(valor)}>{valor || "Contractual"}</Insignia>;
}

export function tonoRubro(valor: string): Tono {
  switch (valor) {
    case "Subcontratos":
      return { fondo: "#DED5F8", borde: "#B3A3EA" };
    case "Equipos":
      return { fondo: "#FBE1C4", borde: "#EFB673" };
    case "Servicios":
      return { fondo: "#CFEEDC", borde: "#8FCFAC" };
    default:
      return { fondo: "#D5DFF8", borde: "#A3B6EA" };
  }
}

export function InsigniaRubro({ valor }: { valor: string }) {
  return <Insignia tono={tonoRubro(valor)}>{valor || "Materiales"}</Insignia>;
}

const PALETA_CATEGORIA: Tono[] = [
  { fondo: "#D5DFF8", borde: "#A3B6EA" },
  { fondo: "#CFEEDC", borde: "#8FCFAC" },
  { fondo: "#FBE1C4", borde: "#EFB673" },
  { fondo: "#DED5F8", borde: "#B3A3EA" },
  { fondo: "#F8D2CD", borde: "#E79E97" },
  { fondo: "#E9E9E6", borde: "#C6C6C0" },
  { fondo: "#CFE9EE", borde: "#8FC4CF" },
];

export function tonoCategoriaGasto(valor: string): Tono {
  const texto = valor || "";
  let suma = 0;
  for (let i = 0; i < texto.length; i += 1) suma += texto.charCodeAt(i);
  return PALETA_CATEGORIA[suma % PALETA_CATEGORIA.length]!;
}

/** Asigna un tono distinto a cada categoría de la lista, sin repetir colores. */
export function tonosCategoriaGasto(nombres: string[]): Map<string, Tono> {
  const usados = new Set<string>();
  const mapa = new Map<string, Tono>();
  for (const nombre of [...nombres].sort(new Intl.Collator("es").compare)) {
    const base = tonoCategoriaGasto(nombre);
    let tono = base;
    if (usados.has(base.borde)) {
      const idx = PALETA_CATEGORIA.findIndex((t) => t.borde === base.borde);
      for (let k = 1; k <= PALETA_CATEGORIA.length; k += 1) {
        const cand = PALETA_CATEGORIA[(idx + k) % PALETA_CATEGORIA.length]!;
        if (!usados.has(cand.borde)) {
          tono = cand;
          break;
        }
      }
    }
    usados.add(tono.borde);
    mapa.set(nombre, tono);
  }
  return mapa;
}

export function InsigniaCategoriaGasto({ valor, tono }: { valor: string; tono?: Tono | undefined }) {
  return <Insignia tono={tono ?? tonoCategoriaGasto(valor)}>{valor || "Sin categoría"}</Insignia>;
}

