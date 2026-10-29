import { SelectorBuscable } from "@/components/SelectorBuscable";
import { useEspecialidadesPartida } from "@/lib/especialidades";
import { opcionesEspecialidad, opcionesSubfamilia, usaSubfamilia } from "@/lib/clasificacion-insumo";
import { useSubfamilias } from "@/lib/codigo-insumo";

export type Clasificacion = { especialidad_id: string; subfamilia_id: string };

/** Celdas Especialidad + Subfamilia de la fila de captura rápida del Maestro de Insumos.
 *  La subfamilia se filtra por la especialidad elegida; en materiales es obligatoria.
 *  La mano de obra no lleva subfamilia, así que solo ocupa la celda de Especialidad. */
export function CeldasClasificacion({
  tipo,
  valor,
  onChange,
}: {
  tipo: string;
  valor: Clasificacion;
  onChange: (v: Clasificacion) => void;
}) {
  const { data: especialidades = [] } = useEspecialidadesPartida();
  const { data: subfamilias = [] } = useSubfamilias();
  const conSub = usaSubfamilia(tipo);
  const esMat = tipo === "MAT" || tipo === "materiales";
  const opciones = [
    ...(esMat ? [] : [{ value: "", texto: "Sin subfamilia", detalle: "00" }]),
    ...opcionesSubfamilia(subfamilias, valor.especialidad_id, valor.subfamilia_id),
  ];

  return (
    <>
      <td className="px-2 py-2">
        <SelectorBuscable
          aria-label="Especialidad"
          value={valor.especialidad_id}
          onChange={(v) => onChange({ especialidad_id: v, subfamilia_id: "" })}
          opciones={opcionesEspecialidad(especialidades, valor.especialidad_id)}
          placeholder="— Elegir —"
        />
      </td>
      {conSub && (
        <td className="px-2 py-2">
          {valor.especialidad_id ? (
            <SelectorBuscable
              aria-label="Subfamilia"
              value={valor.subfamilia_id}
              onChange={(v) => onChange({ ...valor, subfamilia_id: v })}
              opciones={opciones}
              placeholder={esMat ? "— Elegir —" : "Sin subfamilia"}
            />
          ) : (
            <p className="text-muted-foreground/60">—</p>
          )}
        </td>
      )}
    </>
  );
}
