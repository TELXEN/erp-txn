import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { Boton, Panel } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  FUENTES_DOCUMENTOS,
  FUENTE_DOCUMENTO_DEFECTO,
  fuenteDocumento,
  useConfiguracionDocumentos,
  type FuenteDocumentoId,
} from "@/lib/fuentes-documentos";

export function TipografiaDocumentosPanel() {
  const qc = useQueryClient();
  const { rol } = useAuth();
  const puedeEditar = rol === "gerente";
  const { data } = useConfiguracionDocumentos();
  const [seleccion, setSeleccion] = useState<FuenteDocumentoId>(FUENTE_DOCUMENTO_DEFECTO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (data?.fuente_pdf) setSeleccion(data.fuente_pdf);
  }, [data?.fuente_pdf]);

  const fuente = fuenteDocumento(seleccion);

  async function guardar() {
    if (!data?.id || !puedeEditar) return;
    setGuardando(true);
    const { error } = await supabase
      .from("configuracion_documentos")
      .update({ fuente_pdf: seleccion })
      .eq("id", data.id);
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["configuracion_documentos"] });
    toast.success("Tipografía de documentos actualizada");
  }

  return (
    <Panel titulo="Tipografía de documentos" extra={<FileText className="size-5 text-primary" />}>
      <div className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FUENTES_DOCUMENTOS.map((item) => {
            const activa = item.id === seleccion;
            return (
              <Boton
                key={item.id}
                type="button"
                variante="linea"
                disabled={!puedeEditar}
                aria-pressed={activa}
                onClick={() => setSeleccion(item.id)}
                className={`h-auto min-h-24 items-start justify-start gap-3 p-3 text-left ${
                  activa ? "border-primary bg-primary/5 ring-2 ring-primary/40" : "border-line text-foreground"
                }`}
              >
                <span className="min-w-0 flex-1" style={{ fontFamily: item.css }}>
                  <span className="block text-base font-bold">{item.nombre}</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{item.descripcion}</span>
                </span>
                {activa && <Check className="size-4 shrink-0 text-primary" />}
              </Boton>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-card" style={{ fontFamily: fuente.css }}>
          <div className="border-b border-line bg-muted/40 px-5 py-4">
            <p className="text-lg font-bold">COTIZACIÓN TXN26-C001</p>
            <p className="text-sm">TELXEN SAC · RUC 20600000000</p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            <p>Vista previa: instalación eléctrica, automatización y control industrial.</p>
            <div className="grid grid-cols-[1fr_auto] border border-line">
              <span className="p-2 font-bold">Descripción</span><span className="p-2 font-bold">Importe</span>
              <span className="border-t border-line p-2">Servicio de muestra</span><span className="border-t border-line p-2">S/ 1,250.00</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {puedeEditar ? "La elección se aplicará a las próximas vistas previas e impresiones." : "Solo el Gerente puede modificar esta opción."}
          </p>
          {puedeEditar && (
            <Boton type="button" onClick={() => void guardar()} disabled={guardando || seleccion === data?.fuente_pdf}>
              {guardando ? "Guardando…" : "Guardar tipografía"}
            </Boton>
          )}
        </div>
      </div>
    </Panel>
  );
}