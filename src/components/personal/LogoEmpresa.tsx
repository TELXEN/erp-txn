import { Building2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { DOC } from "@/lib/documento-tema";

const ESLOGAN_POR_DEFECTO =
  "SOLUCIONES INTEGRALES EN ENERGÍA, AUTOMATIZACIÓN Y CONTROL INDUSTRIAL";

export type EmpresaDoc = {
  razon_social?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  logo_url?: string | null;
  eslogan?: string | null;
} | null | undefined;

type EmpresaLogo = {
  razon_social?: string | null;
  logo_url?: string | null;
  eslogan?: string | null;
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

/**
 * Encabezado único de los documentos laborales (boleta de pago, recibo por
 * honorarios, CTS, gratificación y liquidación): logo a la izquierda, razón
 * social con eslogan y dirección a la derecha, y recuadro con el título del
 * documento, el RUC debajo en letra pequeña y el número/líneas extra.
 */
export function EncabezadoDocumento({
  empresa,
  titulo,
  tituloClase = "text-[11px]",
  numero,
  numeroEditable = false,
  onNumero,
  lineas,
}: {
  empresa: EmpresaDoc;
  titulo: string;
  tituloClase?: string;
  numero?: string | undefined;
  numeroEditable?: boolean;
  onNumero?: (valor: string) => void;
  lineas?: ReactNode;
}) {
  return (
    <header className="mb-3 flex items-stretch justify-between gap-3 border-b-2 pb-3" style={{ borderColor: DOC.dark }}>
      <LogoEmpresa empresa={empresa} className="w-[120px] shrink-0 justify-center" imgClassName="h-12 w-24 object-contain" iconSize={30} />
      <div className="flex min-w-0 flex-1 flex-col justify-start pt-0.5 text-right">
        <p className="text-sm font-bold uppercase leading-tight">{empresa?.razon_social || "—"}</p>
        {empresa?.eslogan && <p className="whitespace-pre-line text-[7.5px] uppercase leading-tight text-muted-foreground">{empresa.eslogan.replace(", ", ", \n")}</p>}
        <p className="text-[8px] leading-tight text-muted-foreground">{empresa?.direccion}</p>
      </div>
      <div className="w-[190px] shrink-0 border text-center" style={{ borderColor: DOC.dark }}>
        <p className={`py-1 font-bold uppercase text-paper ${tituloClase}`} style={{ background: DOC.dark }}>{titulo}</p>
        <p className="pt-0.5 text-[8px]">RUC {empresa?.ruc || "—"}</p>
        {numero !== undefined && (numeroEditable && onNumero ? (
          <input
            aria-label="N° del documento"
            type="text"
            maxLength={20}
            placeholder="Pendiente de N°"
            className="w-full border-0 border-b border-dashed border-primary/40 bg-transparent px-1 py-0 text-center text-[10px] font-semibold tabular-nums outline-none placeholder:text-warn focus:border-primary print:border-0"
            value={numero}
            onChange={(e) => onNumero(e.target.value)}
          />
        ) : (
          <p className={`text-[11px] font-bold tabular-nums ${numero ? "" : "text-warn"}`}>N° {numero || "pendiente"}</p>
        ))}
        {lineas}
      </div>
    </header>
  );
}
