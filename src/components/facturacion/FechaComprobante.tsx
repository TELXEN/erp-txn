import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarDays } from "lucide-react";
import { BotonIcono } from "@/components/ui-kit";
import { leerFechaDocumento, mostrarFechaDocumento } from "@/lib/fecha-documento";

export function FechaComprobante({ value, onChange, style, etiqueta }: { value: string; onChange: (iso: string) => void; style?: CSSProperties; etiqueta: string }) {
  const [texto, setTexto] = useState(() => mostrarFechaDocumento(value));
  const calendario = useRef<HTMLInputElement>(null);
  useEffect(() => setTexto(mostrarFechaDocumento(value)), [value]);
  return <span className="relative flex min-w-0 items-center gap-1">
    <input type="text" aria-label={etiqueta} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} value={texto} style={style} className="min-w-0" onChange={(e) => {
      setTexto(e.target.value);
      e.currentTarget.setCustomValidity("");
      const iso = leerFechaDocumento(e.target.value);
      if (iso !== null) onChange(iso);
    }} onBlur={(e) => {
      const iso = leerFechaDocumento(texto);
      e.currentTarget.setCustomValidity(iso === null ? "Escribe una fecha válida: dd/mm/aaaa." : "");
      if (iso === null) { e.currentTarget.reportValidity(); setTexto(mostrarFechaDocumento(value)); }
      else onChange(iso);
    }} />
    <BotonIcono etiqueta={`Calendario: ${etiqueta}`} className="size-5 rounded-sm border-0 bg-transparent" onClick={() => calendario.current?.showPicker()}><CalendarDays size={12} /></BotonIcono>
    <input ref={calendario} type="date" tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0" value={value} onChange={(e) => onChange(e.target.value)} />
  </span>;
}