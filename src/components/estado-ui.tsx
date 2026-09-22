import type { ReactNode } from "react";
import { tonoPrioridad, tonoSituacion, type Tono } from "@/lib/configuracion";

function Insignia({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ backgroundColor: tono.fondo, borderColor: tono.borde, color: "#16161a" }}
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
  if (v.includes("deductivo")) return { fondo: "#F8D2CD", borde: "#E79E97" };
  if (v.includes("contractual")) return { fondo: "#E9E9E6", borde: "#C6C6C0" };
  if (v.includes("metrado")) return { fondo: "#D5DFF8", borde: "#A3B6EA" };
  return { fondo: "#FBE1C4", borde: "#EFB673" };
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

