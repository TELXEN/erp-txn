/** Primer dígito del código de insumo (debe coincidir con siguiente_codigo_insumo_modular). Herramientas manuales no lleva código. */
export function digitoTipoInsumo(tipo: string, categoria?: string | null): string | null {
  switch (tipo) {
    case "materiales": case "MAT": return "1";
    case "mano_obra": case "MO": return "2";
    case "equipos_herramientas": case "EQ": return (categoria ?? "").toLowerCase().startsWith("herramienta") ? "4" : "3";
    case "subcontratos": case "SC": return "5";
    case "epp_catalogo": case "EPP": return "6";
    default: return null;
  }
}
