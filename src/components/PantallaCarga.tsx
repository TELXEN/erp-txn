// Indicador visible mientras una pantalla se prepara; evita la página en blanco.
export function PantallaCarga({ completa = false }: { completa?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center ${completa ? "min-h-screen" : "min-h-[50vh]"}`}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-primary motion-reduce:animate-none" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em]">Cargando…</p>
      </div>
    </div>
  );
}
