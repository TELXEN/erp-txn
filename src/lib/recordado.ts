import { useCallback, useEffect, useState, type SetStateAction } from "react";

/** useState que se recuerda en este equipo (localStorage) y se restaura al volver a la página. */
export function useRecordado<T>(clave: string, inicial: T) {
  const [estado, setEstado] = useState({ valor: inicial, claveLeida: "" });
  useEffect(() => {
    let valor = inicial;
    try {
      const crudo = localStorage.getItem(clave);
      if (crudo !== null) valor = JSON.parse(crudo) as T;
    } catch {
      /* valor dañado: se ignora */
    }
    setEstado({ valor, claveLeida: clave });
  }, [clave]);
  useEffect(() => {
    if (estado.claveLeida !== clave) return;
    try {
      localStorage.setItem(clave, JSON.stringify(estado.valor));
    } catch {
      /* almacenamiento no disponible: mantener selección durante esta visita */
    }
  }, [clave, estado]);
  const setValor = useCallback((accion: SetStateAction<T>) => {
    setEstado((anterior) => ({
      ...anterior,
      valor: typeof accion === "function" ? (accion as (prev: T) => T)(anterior.valor) : accion,
    }));
  }, []);
  return [estado.valor, setValor] as const;
}
