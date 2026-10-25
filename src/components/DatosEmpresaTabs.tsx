import { useState } from "react";
import { Building2, Landmark, Scale } from "lucide-react";
import { Pestanas } from "@/components/ui-kit";
import { DatosEmpresa } from "@/components/DatosEmpresa";
import { RegimenEmpresaPanel } from "@/components/RegimenEmpresaPanel";
import { CuentasBancarias } from "@/components/CuentasBancarias";

type Pestana = "datos" | "regimen" | "cuentas";

/** Pestañas internas de «Datos de la empresa»: datos, régimen laboral y cuentas bancarias. */
export function DatosEmpresaTabs() {
  const [pestana, setPestana] = useState<Pestana>("datos");

  return (
    <div className="space-y-4">
      <Pestanas
        etiqueta="Datos de la empresa"
        valor={pestana}
        onCambiar={setPestana}
        opciones={[
          { id: "datos", texto: "Datos de la empresa", icono: <Building2 className="size-4" /> },
          { id: "regimen", texto: "Régimen laboral de la empresa", icono: <Scale className="size-4" /> },
          { id: "cuentas", texto: "Cuentas bancarias", icono: <Landmark className="size-4" /> },
        ]}
      />
      {pestana === "datos" ? <DatosEmpresa /> : pestana === "regimen" ? <RegimenEmpresaPanel /> : <CuentasBancarias />}
    </div>
  );
}
