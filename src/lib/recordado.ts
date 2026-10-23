import { useEffect, useRef, useState } from "react";

/** useState que se recuerda en este equipo (localStorage) y se restaura al volver a la página. */
export function useRecordado<T>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(inicial);
  const leido = useRef(false);
  useEffect(() => {
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo !== null) setValor(JSON.parse(crudo) as T);
    } catch {
      /* valor dañado: se ignora */
    }
    leido.current = true;
  }, [clave]);
  useEffect(() => {
    if (leido.current) localStorage.setItem(clave, JSON.stringify(valor));
  }, [clave, valor]);
  return [valor, setValor] as const;
}
