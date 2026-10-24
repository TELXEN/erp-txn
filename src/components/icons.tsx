import type { SVGProps } from "react";

/**
 * Recibo con código de barras.
 *
 * Icono propio de «Facturación Electrónica»: las librerías de iconos no traen
 * un recibo con código de barras, así que se dibuja aquí con el mismo trazo
 * (24x24, stroke currentColor) que los iconos de lucide para que se vea
 * idéntico en peso y tamaño dentro del menú.
 */
export function ReciboCodigoBarras({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Recibo con bordes dentados arriba y abajo */}
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      {/* Código de barras: tres barras separadas para que se lean bien a 16 px */}
      <path strokeWidth={1.2} d="M8.5 9v5" />
      <path strokeWidth={2} d="M12 9v5" />
      <path strokeWidth={1.2} d="M15.5 9v5" />
    </svg>
  );
}
