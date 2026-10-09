import { Building2 } from "lucide-react";
import type { CSSProperties } from "react";

const ESLOGAN_POR_DEFECTO =
  "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL";

type EmpresaLogo = {
  razon_social?: string;
  logo_url?: string;
  eslogan?: string;
} | null | undefined;

/**
 * Logotipo de la empresa con el eslogan justo debajo.
 * El eslogan se parte en la primera coma para que ocupe dos líneas legibles.
 */
export function LogoEmpresa({
  empresa,
  className = "",
  imgClassName = "max-h-12 object-contain",
  iconSize = 40,
  iconStyle,
  tono,
}: {
  empresa: EmpresaLogo;
  className?: string;
  imgClassName?: string;
  iconSize?: number;
  iconStyle?: CSSProperties;
  tono?: string;
}) {
  const texto = empresa?.eslogan?.trim() || ESLOGAN_POR_DEFECTO;
  const coma = texto.indexOf(",");
  const linea1 = coma >= 0 ? texto.slice(0, coma + 1) : texto;
  const linea2 = coma >= 0 ? texto.slice(coma + 1).trim() : "";

  return (
    <div className={`flex min-w-0 flex-col items-center ${className}`}>
      {empresa?.logo_url ? (
        <img
          src={empresa.logo_url}
          alt={empresa.razon_social ?? "Logotipo"}
          className={imgClassName}
        />
      ) : (
        <Building2
          size={iconSize}
          style={iconStyle}
          className={iconStyle ? undefined : "text-primary"}
        />
      )}
      <span
        className={`mt-1 w-full text-center text-[6.5px] leading-[1.25] font-semibold uppercase ${
          tono ? "" : "text-muted-foreground"
        }`}
        style={tono ? { color: tono } : undefined}
      >
        <span className="block">{linea1}</span>
        {linea2 ? <span className="block">{linea2}</span> : null}
      </span>
    </div>
  );
}
