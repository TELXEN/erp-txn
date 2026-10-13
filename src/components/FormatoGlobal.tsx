import { useEffect, useState } from "react";
import { formatearSiGritado, type ModoFormato } from "@/lib/formato-texto";

/** Fija un valor en un input controlado por React disparando su onChange. */
function fijarValor(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, valor);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function aplicarFormato(el: EventTarget | null) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  const modo = el.dataset["formato"] as ModoFormato | undefined;
  if (!modo || !el.value) return;
  const nuevo = formatearSiGritado(el.value, modo);
  if (nuevo !== el.value) fijarValor(el, nuevo);
}

/**
 * Formatea al salir del campo (o al pulsar Enter) cualquier input con data-formato
 * y avisa cuando Bloq Mayús está activo mientras se escribe.
 */
export function FormatoGlobal() {
  const [caps, setCaps] = useState(false);
  useEffect(() => {
    const salir = (e: FocusEvent) => aplicarFormato(e.target);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Enter") aplicarFormato(e.target);
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)
        setCaps(typeof e.getModifierState === "function" && e.getModifierState("CapsLock"));
    };
    document.addEventListener("focusout", salir, true);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("focusout", salir, true);
      document.removeEventListener("keydown", tecla, true);
    };
  }, []);
  if (!caps) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] rounded-md border border-cta/60 bg-card px-3 py-2 font-mono text-[11px] text-ink shadow-lg"
    >
      Bloq Mayús activado — el texto se corregirá al salir del campo
    </div>
  );
}
