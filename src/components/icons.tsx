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

/**
 * Billetes con una hoja.
 *
 * Icono propio de «Nómina y Boletas»: un billete al frente con una hoja de
 * papel asomando detrás. Se dibuja aquí con el mismo trazo (24x24, stroke
 * currentColor) que los iconos de lucide para que pese igual en el menú.
 */
export function NominaBoletas({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Hoja que asoma detrás del billete */}
      <path d="M10 10V2h10v14h-2.8" />
      <path strokeWidth={1.4} d="M13 5h4" />
      <path strokeWidth={1.4} d="M13 8h4" />
      {/* Billete al frente */}
      <rect x="2.5" y="10" width="14.5" height="10" rx="2" />
      <circle cx="9.75" cy="15" r="2.2" />
      <path strokeWidth={1.4} d="M5.6 15h.01M13.9 15h.01" />
    </svg>
  );
}

/**
 * Factura con sello de goma.
 *
 * Icono propio de «Facturas»: hoja con esquina doblada, líneas de detalle y un
 * sello de goma con cintas. El contorno del sello va en azul claro
 * (--color-sello-factura); el resto sigue el color del texto para que el icono
 * siga legible sobre el fondo de la cinta.
 */
export function FacturaSello({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Hoja con esquina doblada; se abre abajo a la izquierda para el sello */}
      <path d="M13 22h5a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.3" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      {/* Detalle de la factura: renglones y total */}
      <path strokeWidth={1.4} d="M8.5 7.5h6" />
      <path strokeWidth={1.4} d="M9.5 11h5" />
      <path strokeWidth={1.4} d="M13.5 14.5h3.5" />
      <path strokeWidth={1.4} d="M13.5 17.5h3.5" />
      {/* Sello de goma con cintas, en azul claro */}
      <g stroke="var(--color-sello-factura)">
        <circle cx="6" cy="14" r="3" strokeWidth={1.8} />
        <path strokeWidth={1.6} d="m7.69 16.479 1.29 4.88a.5.5 0 0 1-.698.591l-1.843-.849a1 1 0 0 0-.879.001l-1.846.85a.5.5 0 0 1-.692-.593l1.29-4.88" />
      </g>
    </svg>
  );
}

