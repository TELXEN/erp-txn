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
        <circle cx="6" cy="14" r="3" />
        <path strokeWidth={1.6} d="m7.69 16.479 1.29 4.88a.5.5 0 0 1-.698.591l-1.843-.849a1 1 0 0 0-.879.001l-1.846.85a.5.5 0 0 1-.692-.593l1.29-4.88" />
      </g>
    </svg>
  );
}


/**
 * Gráfico de barras del «Dashboard Financiero»: eje en el color del texto y
 * tres barras verticales en verde, rojo y azul fijos (no cambian con el tema).
 */
export function GraficoFinanciero({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path stroke="#029a56" d="M8 17v-3" />
      <path stroke="#c1121f" d="M13 17V5" />
      <path stroke="#0077b6" d="M18 17V9" />
    </svg>
  );
}

/**
 * Hoja con verificación.
 *
 * Icono propio de «SIRE SUNAT»: hoja con esquina doblada y una palomita
 * dentro. La palomita va en verde (--color-icono-verde); el resto sigue el
 * color del texto para que el icono siga legible sobre el fondo de la cinta.
 */
export function HojaVerificada({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Hoja con esquina doblada */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      {/* Palomita de verificación, en verde */}
      <path stroke="var(--color-icono-verde)" d="m8.5 14.2 2.6 2.6 4.6-5.2" />
    </svg>
  );
}

/**
 * Caja de traslado con verificación.
 *
 * Icono propio de «Guías de Remisión»: caja isométrica con la palomita dentro
 * de la cara frontal. La palomita va en azul (--color-icono-azul); el resto
 * sigue el color del texto para que el icono siga legible sobre la cinta.
 */
export function CajaVerificada({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Caja de traslado */}
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path strokeWidth={1.4} d="M12 22V12" />
      <path strokeWidth={1.4} d="m3.29 7 8.71 5 8.71-5" />
      {/* Palomita de verificación, en azul */}
      <path stroke="var(--color-icono-azul)" d="m13.6 15.4 1.9 1.9 3.6-3.6" />
    </svg>
  );
}

/**
 * Escudo con verificación.
 *
 * Icono propio de «Aprobaciones»: escudo con una palomita dentro. La palomita
 * va en verde (--color-icono-verde); el escudo sigue el color del texto para
 * que el icono siga legible sobre el fondo de la cinta.
 */
export function EscudoVerificado({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Escudo */}
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      {/* Palomita de aprobación, en verde */}
      <path stroke="var(--color-icono-verde)" d="m9 12 2 2 4-4" />
    </svg>
  );
}

/**
 * Diagrama de Gantt con barras de color.
 *
 * Icono propio de «Gantt»: ejes en el color del texto y tres barras horizontales
 * en verde (--color-icono-verde) y rojo (--color-icono-rojo).
 */
export function GanttLineas({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Ejes */}
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      {/* Barras de planificación, en verde y rojo */}
      <path stroke="var(--color-icono-verde)" d="M10 6h8" />
      <path stroke="var(--color-icono-rojo)" d="M8 11h7" />
      <path stroke="var(--color-icono-verde)" d="M12 16h6" />
    </svg>
  );
}

/**
 * Curva S en azul.
 *
 * Icono propio de «Curva S»: ejes en el color del texto y la línea que dibuja la
 * curva en azul (--color-icono-azul).
 */
export function CurvaAzul({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Ejes */}
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      {/* La curva, en azul */}
      <path stroke="var(--color-icono-azul)" d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" />
    </svg>
  );
}

/**
 * Portapapeles con listado en azul.
 *
 * Icono propio de «Banco de Datos de EPP»: portapapeles cuyo listado central
 * (los dos puntos y las dos líneas) va en azul (--color-icono-azul); el resto
 * sigue el color del texto.
 */
export function PortapapelesDatos({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Portapapeles */}
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      {/* Listado, en azul */}
      <path stroke="var(--color-icono-azul)" d="M12 11h4" />
      <path stroke="var(--color-icono-azul)" d="M12 16h4" />
      <path stroke="var(--color-icono-azul)" d="M8 11h.01" />
      <path stroke="var(--color-icono-azul)" d="M8 16h.01" />
    </svg>
  );
}

/**
 * Portapapeles con verificación.
 *
 * Icono propio de «Valorizaciones»: portapapeles con una palomita dentro. La
 * palomita va en verde (--color-icono-verde); el resto sigue el color del texto.
 */
export function PortapapelesVerificado({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Portapapeles */}
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      {/* Palomita de conformidad, en verde */}
      <path stroke="var(--color-icono-verde)" d="m9 14 2 2 4-4" />
    </svg>
  );
}

/**
 * Portapapeles con lápiz.
 *
 * Icono propio de «Generar Requerimiento»: portapapeles con un lápiz escribiendo
 * sobre él. El lápiz va en azul (--color-icono-azul); el resto sigue el color
 * del texto para que el icono siga legible sobre el fondo de la cinta.
 */
export function PortapapelesLapiz({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Portapapeles */}
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M8 22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      {/* Lápiz, en azul */}
      <path stroke="var(--color-icono-azul)" d="M21.34 15.664a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
    </svg>
  );
}

/**
 * Boleta con dólar en verde.
 *
 * Icono propio de «Boletas»: ticket de venta cuyo símbolo de dólar va en verde
 * (--color-icono-verde); el ticket sigue el color del texto.
 */
export function BoletaDolar({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Ticket */}
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      {/* Dólar, en verde */}
      <path stroke="var(--color-icono-verde)" d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path stroke="var(--color-icono-verde)" d="M12 17.5v-11" />
    </svg>
  );
}

/**
 * Nota de crédito: hoja con menos en rojo.
 *
 * Icono propio de «Notas de crédito»: hoja con el signo menos en rojo
 * (--color-icono-rojo); la hoja sigue el color del texto.
 */
export function NotaCreditoRoja({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Hoja con esquina doblada */}
      <path d="M20 14V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      {/* Menos, en rojo */}
      <path stroke="var(--color-icono-rojo)" d="M14 18h6" />
    </svg>
  );
}

/**
 * Nota de débito: hoja con más en azul.
 *
 * Icono propio de «Notas de débito»: hoja con el signo más en azul
 * (--color-icono-azul); la hoja sigue el color del texto.
 */
export function NotaDebitoAzul({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Hoja con esquina doblada */}
      <path d="M11.35 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5.35" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      {/* Más, en azul */}
      <path stroke="var(--color-icono-azul)" d="M14 19h6" />
      <path stroke="var(--color-icono-azul)" d="M17 16v6" />
    </svg>
  );
}

/**
 * Edificio de tesorería.
 *
 * Icono propio de «Tesorería»: el frontón triangular de arriba y la línea
 * horizontal de abajo van en negro (--color-cinta-negro), y las columnas siguen
 * el color del botón (dorado). Así el edificio se distingue bien incluso cuando
 * el botón queda seleccionado y el dorado pasa al color de contraste.
 */
export function TesoreriaEdificio({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Frontón triangular, en negro y sin relleno */}
      <path className="text-cinta-negro" d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" />

      {/* Columnas, en el color del botón (dorado) */}
      <path d="M6 18v-7" />
      <path d="M10 18v-7" />
      <path d="M14 18v-7" />
      <path d="M18 18v-7" />
      {/* Línea horizontal de la base, en negro */}
      <path className="text-cinta-negro" d="M3 22h18" />
    </svg>
  );
}

/**
 * Bóveda de retenciones.
 *
 * Icono propio de «Retenciones»: el cuadrado, los puntos de las esquinas y sus
 * trazos siguen el color del texto, y el símbolo del centro (el disco de la
 * bóveda) va en naranja (--color-icono-naranja).
 */
export function BovedaRetenciones({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      <path d="m7.9 7.9 2.7 2.7" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
      <path d="m13.4 10.6 2.7-2.7" />
      <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
      <path d="m7.9 16.1 2.7-2.7" />
      <circle cx="16.5" cy="16.5" r=".5" fill="currentColor" />
      <path d="m13.4 13.4 2.7 2.7" />
      {/* Símbolo central de la bóveda, en naranja */}
      <circle cx="12" cy="12" r="2" stroke="var(--color-icono-naranja)" />
    </svg>
  );
}

/**
 * Partidas en tres colores.
 *
 * Icono propio de «Partidas»: tres niveles apilados, cada uno con su color fijo
 * —el contorno de arriba en azul, la línea del medio en verde y la de abajo en
 * rojo— para que la pila se lea de un vistazo.
 */
export function PartidasTresColores({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Contorno superior, en azul */}
      <path stroke="var(--color-icono-azul)" d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
      {/* Línea media, en verde */}
      <path stroke="var(--color-icono-verde)" d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
      {/* Línea inferior, en rojo */}
      <path stroke="var(--color-icono-rojo)" d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
    </svg>
  );
}

/**
 * Cajas de inventario.
 *
 * Icono propio de «Inventario»: los dos cubos de la base van en azul y el cubo
 * de arriba en verde, para que se lea la pila de un vistazo.
 */
export function CajasInventario({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Cubo de la base, a la izquierda, en azul */}
      <path stroke="var(--color-icono-azul)" d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path stroke="var(--color-icono-azul)" d="m7 16.5-4.74-2.85" />
      <path stroke="var(--color-icono-azul)" d="m7 16.5 5-3" />
      <path stroke="var(--color-icono-azul)" d="M7 16.5v5.17" />
      {/* Cubo de la base, a la derecha, en azul */}
      <path stroke="var(--color-icono-azul)" d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path stroke="var(--color-icono-azul)" d="m17 16.5-5-3" />
      <path stroke="var(--color-icono-azul)" d="m17 16.5 4.74-2.85" />
      <path stroke="var(--color-icono-azul)" d="M17 16.5v5.17" />
      {/* Cubo superior, en verde */}
      <path stroke="var(--color-icono-verde)" d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path stroke="var(--color-icono-verde)" d="M12 8 7.26 5.15" />
      <path stroke="var(--color-icono-verde)" d="m12 8 4.74-2.85" />
      <path stroke="var(--color-icono-verde)" d="M12 13.5V8" />
    </svg>
  );
}

/**
 * Ficha de cliente.
 *
 * Icono propio de «Clientes»: el cuadrado lleva el borde negro y la persona del
 * interior va en azul, para que la ficha se lea de un vistazo.
 */
export function FichaCliente({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Cuadrado de la ficha, con borde negro */}
      <rect stroke="var(--color-cinta-negro)" x="3" y="3" width="18" height="18" rx="4" />
      {/* Cabeza de la persona, en azul */}
      <circle stroke="var(--color-icono-azul)" cx="12" cy="9.8" r="2.8" />
      {/* Hombros de la persona, en azul */}
      <path stroke="var(--color-icono-azul)" d="M7.2 17.6c0-2.6 2.1-4.4 4.8-4.4s4.8 1.8 4.8 4.4" />
    </svg>
  );
}

/**
 * Flecha de retorno dentro de un círculo.
 *
 * Icono propio de «Volver»: el aro exterior encierra una flecha que avanza,
 * gira en semicírculo y apunta a la izquierda con la punta llena, como el botón
 * «deshacer» de Office. Se dibuja aquí con el mismo trazo (24x24, stroke
 * currentColor) que los iconos de lucide para que pese igual en la cinta.
 */
export function RetornoCirculo({ className, ...props }: SVGProps<SVGSVGElement>) {
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
      {/* Aro exterior, trazo pesado como la referencia */}
      <circle strokeWidth={2.9} cx="12" cy="12" r="9.6" />
      {/* Cuerpo: avanza a la derecha, gira en semicírculo ancho y vuelve a la izquierda, en azul */}
      <path strokeWidth={3.2} strokeLinecap="butt" stroke="var(--color-icono-azul)" d="M7 15.8h7.6a3.8 3.8 0 0 0 0-7.6H7.6" />
      {/* Punta triangular llena y prominente, en azul, mirando a la izquierda */}
      <path fill="var(--color-icono-azul)" stroke="none" d="M5.1 8.2 9.6 4.8v6.8Z" />






    </svg>
  );
}

/**
 * Lápiz y regla.
 *
 * Icono propio de «Edición»: un lápiz amarillo con punta de madera, mina de
 * grafito y goma rosa cruza por delante de una regla de metal con marcas. Se
 * dibuja a color y con contorno oscuro para que se lea como herramienta real
 * dentro de la cinta.
 */
export function LapizRegla({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Regla de metal, cruzada por detrás, casi horizontal y con pocas marcas largas */}
      <g transform="rotate(-18 12 12)">
        <rect fill="var(--color-regla-cuerpo)" stroke="var(--color-regla-trazo)" strokeWidth={1} x="1.6" y="13.4" width="20.8" height="5.4" rx="1.1" />
        <path stroke="var(--color-regla-trazo)" strokeWidth={1} d="M5.4 13.4v2.6M9 13.4v2.6M12.6 13.4v2.6M16.2 13.4v2.6M19.8 13.4v2.6" />
      </g>

      {/* Lápiz amarillo, en diagonal por delante */}
      <g transform="rotate(36 12 12)">
        {/* Goma rosa */}
        <rect fill="var(--color-lapiz-goma)" stroke="var(--color-cinta-negro)" strokeWidth={1} x="9.4" y="2.1" width="5.2" height="2.5" rx="1.2" />
        {/* Casquillón de metal */}
        <rect fill="var(--color-lapiz-metal)" stroke="var(--color-cinta-negro)" strokeWidth={1} x="9.4" y="4.4" width="5.2" height="1.9" />
        {/* Cuerpo amarillo con una faceta más clara */}
        <rect fill="var(--color-lapiz-cuerpo)" stroke="var(--color-cinta-negro)" strokeWidth={1} x="9.4" y="6.1" width="5.2" height="9.6" />
        <path stroke="var(--color-lapiz-cuerpo-claro)" strokeWidth={1.1} d="M11 6.6v8.6" />
        {/* Punta de madera afilada */}
        <path fill="var(--color-lapiz-madera)" stroke="var(--color-cinta-negro)" strokeWidth={1} d="M9.4 15.5 12 20.4l2.6-4.9Z" />
      {/* Mina de grafito */}
      <path fill="var(--color-lapiz-grafito)" stroke="none" d="M11.1 18.5 12 20.4l.9-1.9Z" />
    </g>
  </svg>
  );
}

/* =====================================================================
 * Iconos realistas de los accesos principales de la cinta.
 *
 * A diferencia de los iconos de trazo (lucide), estos se dibujan con
 * rellenos y contorno oscuro fino para que a 24 px se lean como objetos
 * reales: papel, metal, madera, ladrillo. Los colores viven en tokens
 * (--color-icono-*) para que combinen con cualquier tema.
 * ===================================================================== */

/** Hoja de cotización con esquina doblada, renglones y lápiz azul. */
export function CotizacionHoja({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Hoja con esquina doblada */}
      <path fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" d="M5 2.5h8.5l5 5V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V4A1.5 1.5 0 0 1 5 2.5Z" />
      <path fill="var(--color-icono-papel-sombra)" stroke="var(--color-icono-contorno)" d="M13.5 2.5v5h5Z" />
      {/* Renglones del presupuesto */}
      <path stroke="var(--color-icono-linea)" strokeWidth={1.1} d="M6.5 10h7M6.5 13h7M6.5 16h4.5" />
      {/* Lápiz azul en diagonal, por delante */}
      <g transform="rotate(38 16 15)">
        <rect fill="var(--color-icono-azul)" stroke="var(--color-icono-contorno)" x="14.9" y="9.5" width="2.6" height="8" />
        <path fill="var(--color-lapiz-madera)" stroke="var(--color-icono-contorno)" d="M14.9 17.5 16.2 20.4l1.3-2.9Z" />
        <path fill="var(--color-lapiz-grafito)" stroke="none" d="M15.75 19.2 16.2 20.4l.45-1.2Z" />
        <rect fill="var(--color-lapiz-goma)" stroke="var(--color-icono-contorno)" x="14.9" y="7.8" width="2.6" height="1.7" rx="0.8" />
      </g>
    </svg>
  );
}

/** Edificio de oficinas con ventanas celestes y puerta. */
export function EmpresaEdificio({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Torre principal */}
      <rect fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" x="4" y="3" width="11" height="18" rx="1" />
      {/* Ventanas de la torre */}
      <g fill="var(--color-icono-ventana)" stroke="var(--color-icono-contorno)" strokeWidth={0.8}>
        <rect x="6" y="5.5" width="2.4" height="2.4" /><rect x="10.4" y="5.5" width="2.4" height="2.4" />
        <rect x="6" y="9.4" width="2.4" height="2.4" /><rect x="10.4" y="9.4" width="2.4" height="2.4" />
        <rect x="6" y="13.3" width="2.4" height="2.4" /><rect x="10.4" y="13.3" width="2.4" height="2.4" />
      </g>
      {/* Anexo bajo a la derecha */}
      <rect fill="var(--color-icono-metal-claro)" stroke="var(--color-icono-contorno)" x="15" y="10" width="5.5" height="11" rx="1" />
      <rect fill="var(--color-icono-ventana)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="16.6" y="12" width="2.3" height="2.3" />
      {/* Puerta */}
      <rect fill="var(--color-icono-madera)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="8" y="17" width="3" height="4" />
    </svg>
  );
}

/** Hoja de codificación con números grandes. */
export function CodificacionHoja({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <path fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" d="M5 2.5h8.5l5 5V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V4A1.5 1.5 0 0 1 5 2.5Z" />
      <path fill="var(--color-icono-papel-sombra)" stroke="var(--color-icono-contorno)" d="M13.5 2.5v5h5Z" />
      {/* Números del correlativo */}
      <text x="6.3" y="14.5" fontSize="7" fontWeight="700" fill="var(--color-icono-azul)" stroke="none" fontFamily="sans-serif">01</text>
      <path stroke="var(--color-icono-linea)" strokeWidth={1.1} d="M6.5 17.5h11" />
      <path stroke="var(--color-icono-linea)" strokeWidth={1.1} d="M6.5 19.5h7" />
    </svg>
  );
}

/** Regla de madera con marcas de centímetros. */
export function ReglaUnidades({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <g transform="rotate(-30 12 12)">
        <rect fill="var(--color-icono-madera-clara)" stroke="var(--color-icono-contorno)" x="2" y="9" width="20" height="6" rx="1" />
        {/* Marcas de medida */}
        <path stroke="var(--color-icono-contorno)" strokeWidth={0.9} d="M5 9v2.6M8 9v1.7M11 9v2.6M14 9v1.7M17 9v2.6M20 9v1.7" />
        {/* Veta de la madera */}
        <path stroke="var(--color-icono-madera)" strokeWidth={0.8} d="M3 13.4h18" />
      </g>
    </svg>
  );
}

/** Pila de ladrillos con un saco de cemento detrás. */
export function MaterialesPila({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Saco de cemento detrás */}
      <path fill="var(--color-icono-cemento)" stroke="var(--color-icono-contorno)" d="M13 3.5h5a2 2 0 0 1 2 2v6h-9v-6a2 2 0 0 1 2-2Z" />
      <path stroke="var(--color-icono-linea)" strokeWidth={0.9} d="M13.5 6h4" />
      {/* Ladrillos: dos abajo, uno arriba */}
      <g stroke="var(--color-icono-contorno)">
        <rect fill="var(--color-icono-ladrillo)" x="2.5" y="15" width="9.5" height="4" rx="0.6" />
        <rect fill="var(--color-icono-ladrillo-claro)" x="12.5" y="15" width="9" height="4" rx="0.6" />
        <rect fill="var(--color-icono-ladrillo-claro)" x="4.5" y="10.5" width="9.5" height="4" rx="0.6" />
      </g>
      {/* Juntas de mortero */}
      <path stroke="var(--color-icono-papel)" strokeWidth={0.8} d="M7.2 15v4M16.8 15v4M9.2 10.5v4" />
      {/* Base */}
      <path stroke="var(--color-icono-contorno)" strokeWidth={1.2} d="M2 21h20" />
    </svg>
  );
}

/** Moneda dorada con signo de porcentaje. */
export function MargenMoneda({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Moneda con canto */}
      <circle fill="var(--color-icono-dorado)" stroke="var(--color-icono-contorno)" cx="12" cy="12" r="9" />
      <circle fill="none" stroke="var(--color-icono-contorno)" strokeWidth={0.8} cx="12" cy="12" r="6.8" />
      {/* Signo % */}
      <path stroke="var(--color-icono-contorno)" strokeWidth={1.6} d="m8.8 15.2 6.4-6.4" />
      <circle fill="none" stroke="var(--color-icono-contorno)" strokeWidth={1.3} cx="9.4" cy="9.4" r="1.6" />
      <circle fill="none" stroke="var(--color-icono-contorno)" strokeWidth={1.3} cx="14.6" cy="14.6" r="1.6" />
    </svg>
  );
}

/** Tablero de resumen con cuatro paneles de colores. */
export function PanelResumen({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      <rect fill="var(--color-icono-metal-claro)" stroke="var(--color-icono-contorno)" x="2.5" y="2.5" width="19" height="19" rx="2" />
      <rect fill="var(--color-icono-azul)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="5" y="5" width="8" height="6" rx="1" />
      <rect fill="var(--color-icono-verde)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="15" y="5" width="4" height="6" rx="1" />
      <rect fill="var(--color-icono-naranja)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="5" y="13" width="4" height="6" rx="1" />
      <rect fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="11" y="13" width="8" height="6" rx="1" />
    </svg>
  );
}

/** Galpón de almacén con puerta de persiana y caja dentro. */
export function AlmacenGalpon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Techo a dos aguas */}
      <path fill="var(--color-icono-techo)" stroke="var(--color-icono-contorno)" d="M12 2.8 2.5 8.2v2h19v-2Z" />
      {/* Muro */}
      <rect fill="var(--color-icono-metal-claro)" stroke="var(--color-icono-contorno)" x="3.5" y="10.2" width="17" height="10.3" />
      {/* Puerta de persiana */}
      <rect fill="var(--color-icono-metal)" stroke="var(--color-icono-contorno)" x="7" y="12" width="10" height="8.5" />
      <path stroke="var(--color-icono-contorno)" strokeWidth={0.8} d="M7 14.2h10M7 16.4h10M7 18.6h10" />
      {/* Base */}
      <path stroke="var(--color-icono-contorno)" strokeWidth={1.2} d="M2 21.5h20" />
    </svg>
  );
}

/** Maletín de cuero con asa y broche. */
export function MaletinGG({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Asa */}
      <path fill="none" stroke="var(--color-icono-contorno)" strokeWidth={1.6} d="M9 7V5.2A1.7 1.7 0 0 1 10.7 3.5h2.6A1.7 1.7 0 0 1 15 5.2V7" />
      {/* Cuerpo del maletín */}
      <rect fill="var(--color-icono-madera)" stroke="var(--color-icono-contorno)" x="2.5" y="7" width="19" height="13" rx="2" />
      {/* Tapa más clara */}
      <path fill="var(--color-icono-madera-clara)" stroke="var(--color-icono-contorno)" d="M4.5 7h15a2 2 0 0 1 2 2v3.5h-19V9a2 2 0 0 1 2-2Z" />
      {/* Broche */}
      <rect fill="var(--color-icono-dorado)" stroke="var(--color-icono-contorno)" strokeWidth={0.8} x="10.4" y="11.2" width="3.2" height="2.6" rx="0.6" />
    </svg>
  );
}

/** Gráfico de flujo con flecha ascendente verde. */
export function FlujoCajaGraf({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Plano del gráfico: papel blanco con marco gris medio, sin bloque oscuro */}
      <rect fill="var(--color-icono-papel)" stroke="var(--color-icono-linea)" strokeWidth={1} x="3" y="3" width="18" height="18" rx="2.5" />
      {/* Ejes suaves */}
      <path stroke="var(--color-icono-papel-sombra)" strokeWidth={1} d="M6.5 6.5v11h11" />
      {/* Barras en azul claro */}
      <rect fill="#4da3d1" stroke="none" x="7.5" y="13" width="2.4" height="5.5" />
      <rect fill="#3b90c2" stroke="none" x="11" y="10.5" width="2.4" height="8" />
      <rect fill="#2c7fb0" stroke="none" x="14.5" y="8" width="2.4" height="10.5" />
      {/* Flecha ascendente */}
      <path fill="none" stroke="var(--color-icono-verde)" strokeWidth={1.7} d="m7 11 3.5-3.5 2.5 2.5 4.5-4.5" />
      <path fill="var(--color-icono-verde)" stroke="none" d="M15 4.6h4.6v4.6l-1.5-1.5-1.6 1.5-1.5-1.5 1.6-1.6Z" />
    </svg>
  );
}

/** Recibo de honorarios con borde dentado y sello. */
export function ReciboHonorarios({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Recibo con bordes dentados */}
      <path fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" d="M6 2.5v19l1.8-1.2 1.8 1.2 1.7-1.2 1.7 1.2 1.8-1.2 1.7 1.2 1.8-1.2 1.7 1.2v-19l-1.7 1.2-1.8-1.2-1.7 1.2-1.8-1.2-1.7 1.2-1.7-1.2-1.8 1.2Z" />
      {/* Renglones */}
      <path stroke="var(--color-icono-linea)" strokeWidth={1.1} d="M8.5 7h7M8.5 10h7M8.5 13h4.5" />
      {/* Símbolo S/ del honorario */}
      <text x="8.2" y="19.4" fontSize="5.5" fontWeight="700" fill="var(--color-icono-verde)" stroke="none" fontFamily="sans-serif">S/</text>
      {/* Firma */}
      <path stroke="var(--color-icono-azul)" strokeWidth={1} d="M13 18.2c1-1.6 1.8-1.6 2 .2.2-1.4 1-1.8 2-.6" />
    </svg>
  );
}

/** Alcancía de cerdito con moneda entrando. */
export function ChanchitoAFP({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Moneda que entra por la ranura */}
      <circle fill="var(--color-icono-dorado)" stroke="var(--color-icono-contorno)" cx="12" cy="4.4" r="2.4" />
      {/* Cuerpo del cerdito */}
      <path fill="var(--color-icono-rosa)" stroke="var(--color-icono-contorno)" d="M5 12.5a7 5.6 0 0 1 14 0v1.2a2.4 2.4 0 0 1-2.4 2.4h-.8l-.5 2.4h-2l-.4-2h-1.8l-.4 2h-2l-.5-2.4h-.8A2.4 2.4 0 0 1 5 13.7Z" />
      {/* Oreja */}
      <path fill="var(--color-icono-rosa)" stroke="var(--color-icono-contorno)" d="m8.2 8 1.4-2 1.4 2Z" />
      {/* Hocico */}
      <ellipse fill="var(--color-icono-rosa)" stroke="var(--color-icono-contorno)" cx="19.4" cy="12.8" rx="1.7" ry="1.4" />
      {/* Ojo y ranura */}
      <circle fill="var(--color-icono-contorno)" stroke="none" cx="15.6" cy="11" r="0.7" />
      <path stroke="var(--color-icono-contorno)" strokeWidth={1.1} d="M10.5 7.6h3" />
      {/* Colita */}
      <path fill="none" stroke="var(--color-icono-contorno)" strokeWidth={1} d="M5 12.5c-1.2-.3-1.6-1.3-1-2.2" />
    </svg>
  );
}

/** Paleta de pintor con cinco colores. */
export function PaletaTemas({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Paleta de madera con el hueco del pulgar */}
      <path fill="var(--color-icono-madera-clara)" stroke="var(--color-icono-contorno)" d="M12 2.8a9.2 9.2 0 1 0 0 18.4c1.2 0 1.8-.8 1.8-1.7 0-.8-.6-1.3-.6-2.1 0-1 .8-1.7 1.9-1.7h2.1a3.3 3.3 0 0 0 3.3-3.3C20.4 7 16.6 2.8 12 2.8Z" />
      {/* Gotas de pintura */}
      <circle fill="var(--color-icono-rojo)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} cx="7.2" cy="8.6" r="1.6" />
      <circle fill="var(--color-icono-dorado)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} cx="11.6" cy="6.4" r="1.6" />
      <circle fill="var(--color-icono-verde)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} cx="15.8" cy="8.8" r="1.6" />
      <circle fill="var(--color-icono-azul)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} cx="7.6" cy="13.6" r="1.6" />
    </svg>
  );
}

/** Salvavidas de ayuda con franjas rojas. */
export function AyudaSalvavidas({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {/* Aro exterior */}
      <circle fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" cx="12" cy="12" r="9.2" />
      {/* Franjas rojas del salvavidas */}
      <path fill="var(--color-icono-rojo)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} d="M12 2.8a9.2 9.2 0 0 1 6.5 2.7l-2.5 2.5a5.2 5.2 0 0 0-4-1.6 5.2 5.2 0 0 0-4 1.6L5.5 5.5A9.2 9.2 0 0 1 12 2.8Z" />
      <path fill="var(--color-icono-rojo)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} d="M12 21.2a9.2 9.2 0 0 1-6.5-2.7l2.5-2.5a5.2 5.2 0 0 0 4 1.6 5.2 5.2 0 0 0 4-1.6l2.5 2.5a9.2 9.2 0 0 1-6.5 2.7Z" />
      <path fill="var(--color-icono-rojo)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} d="M2.8 12a9.2 9.2 0 0 1 2.7-6.5L8 8a5.2 5.2 0 0 0-1.6 4c0 1.6.6 3 1.6 4l-2.5 2.5A9.2 9.2 0 0 1 2.8 12Z" />
      <path fill="var(--color-icono-rojo)" stroke="var(--color-icono-contorno)" strokeWidth={0.7} d="M21.2 12a9.2 9.2 0 0 1-2.7 6.5L16 16a5.2 5.2 0 0 0 1.6-4c0-1.6-.6-3-1.6-4l2.5-2.5a9.2 9.2 0 0 1 2.7 6.5Z" />
      {/* Aro interior */}
      <circle fill="var(--color-icono-papel)" stroke="var(--color-icono-contorno)" cx="12" cy="12" r="5.2" />
      {/* Signo de pregunta */}
      <text x="9.3" y="15.6" fontSize="8.5" fontWeight="700" fill="var(--color-icono-azul)" stroke="none" fontFamily="sans-serif">?</text>
    </svg>
  );
}






