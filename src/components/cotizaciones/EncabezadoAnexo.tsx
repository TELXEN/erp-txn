import { useEmpresa } from "@/lib/empresa";

/** Encabezado corporativo de los anexos de cotización (Gastos generales, Dossier APU): igual al de la cotización. */
export function EncabezadoAnexo({ titulo, codigo, hoja, total, cliente, proyecto }: { titulo: string; codigo?: string | null | undefined; hoja: number; total: number; cliente?: string | null | undefined; proyecto?: string | null | undefined }) {
  const { data: empresa } = useEmpresa();
  return (
    <>
      <header style={{ display: "flex", gap: 12, alignItems: "center", paddingBottom: 6, color: "#000", lineHeight: 1.15, textTransform: "uppercase" }}>
        <div style={{ width: 132, flexShrink: 0, display: "flex", alignItems: "center", alignSelf: "flex-start" }}>{empresa?.logo_url ? <img src={empresa.logo_url} alt="" crossOrigin="anonymous" style={{ maxWidth: 132, maxHeight: 78, objectFit: "contain" }} /> : <b style={{ fontSize: 20 }}>TELXEN</b>}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left", paddingLeft: 4, alignSelf: "flex-start" }}>
          <b style={{ fontSize: 13, fontWeight: 700 }}>{empresa?.razon_social || "TELXEN S.A.C"}</b>
          <div style={{ fontWeight: 300, fontSize: 6, marginTop: 2 }}>{empresa?.eslogan || ""}</div>
          <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.direccion || "—"}</div>
          <div style={{ fontWeight: 300, fontSize: 7.5, marginTop: 2 }}>{empresa?.web || "—"}</div>
        </div>
        <div style={{ width: 248, flexShrink: 0, textAlign: "center", display: "flex", flexDirection: "column" }}>
          <div style={{ border: "1px solid #000", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700 }}>RUC: {empresa?.ruc || "—"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5 }}>{titulo}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5 }}>{codigo || "SIN CÓDIGO"}</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 8, fontWeight: 700 }}>HOJA {hoja} DE {total}</div>
        </div>
      </header>
      <div style={{ marginTop: 4, fontSize: 9, textAlign: "left" }}><b>CLIENTE:</b> {cliente ?? ""}{proyecto ? <> &nbsp;·&nbsp; <b>PROYECTO:</b> {proyecto}</> : null}</div>
    </>
  );
}
