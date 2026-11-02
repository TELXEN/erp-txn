import { useState } from "react";
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
        variante="texto"
        opciones={[
          { id: "datos", texto: "Datos generales" },
          { id: "cuentas", texto: "Cuentas bancarias" },
          { id: "regimen", texto: "Régimen laboral de la empresa" },
        ]}
      />
      {pestana === "datos" ? <DatosEmpresa /> : pestana === "regimen" ? <RegimenEmpresaPanel /> : <CuentasBancarias />}
    </div>
  );
}
