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
