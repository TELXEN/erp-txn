import { ChevronDown, ChevronUp } from "lucide-react";

const base =
  "inline-flex h-6 w-6 items-center justify-center rounded border border-line text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted-foreground";

export function FlechasOrden({
  primero,
  ultimo,
  onMover,
  ocupado,
}: {
  primero: boolean;
  ultimo: boolean;
  onMover: (direccion: -1 | 1) => void;
  ocupado?: boolean;
}) {
  return (
    <span className="inline-flex gap-0.5">
      <button type="button" title="Subir" className={base} disabled={primero || ocupado} onClick={() => onMover(-1)}>
        <ChevronUp size={13} />
      </button>
      <button type="button" title="Bajar" className={base} disabled={ultimo || ocupado} onClick={() => onMover(1)}>
        <ChevronDown size={13} />
      </button>
    </span>
  );
}
