# Fusionar Equipos y Maquinaria con Herramientas manuales

## Qué verá el usuario
- El tipo «EQUIPOS Y MAQUINARIA» pasa a llamarse **EQUIPOS Y HERRAMIENTAS** (mismo dígito 3 y mismo correlativo; los códigos actuales no cambian).
- En el Maestro de insumos desaparece la pestaña «HERRAMIENTAS MANUALES»; queda una sola pestaña **EQUIPOS Y HERRAMIENTAS** donde se registran equipos, maquinaria y herramientas (Propio/Alquilado, C. Unitario).
- «HERRAMIENTAS MANUALES» deja de verse en pestañas, buscador de insumos, tipo de partida y Codificación de insumos, pero sigue existiendo internamente.
- En el APU (ventana, cotización y dossier PDF), dentro del grupo EQUIPOS Y HERRAMIENTAS, se agrega **automáticamente** al final una fila «Herramientas manuales»:
  - Va siempre después del último insumo cargado del grupo (si hay herramienta 1, 2 y 3, Herramientas manuales es la 4.ª fila).
  - Cantidad = % de Márgenes APU (fila Herramientas manuales, % de la mano de obra); parcial = total MO × %.
  - Su parcial suma en el subtotal de EQUIPOS Y HERRAMIENTAS.
  - No se puede agregar ni borrar a mano; si el % es 0, no aparece.
- En Márgenes APU se mantiene la fila «Herramientas manuales (% de la mano de obra)» como única fuente del %.

## Datos existentes
- Hoy hay 1 insumo de tipo Herramientas manuales (40000001). Se conserva como insumo oculto de referencia (código/nombre de la fila automática).
- Los APU que tengan vinculado ese insumo como componente se limpian: la fila automática lo reemplaza, sin cambiar el P.U. si el % era el mismo de Márgenes APU.
- El % propio por insumo deja de usarse; manda el de Márgenes APU.

## Detalles técnicos
- Datos: `UPDATE tipos_insumo SET nombre='EQUIPOS Y HERRAMIENTAS' WHERE clave='EQ'`; borrar `apu_componentes` cuyo insumo sea tipo HT. Añadir columna `oculto boolean` a `tipos_insumo` (migración) y marcar HT como oculto, para que el filtro no dependa de claves fijas.
- `src/lib/apu.ts` `calcularApu`: ignorar componentes HT; calcular `herramientas = totMO × margenes.HT / 100` siempre y sumarlo a `tot.EQ` (no a `tot.HT`); devolver `herramientas` para pintar la fila automática.
- `ApuPartida.tsx`, `CotizacionHoja.tsx`, `apu-vista.tsx`: dejar de renderizar el grupo HT; añadir la fila automática al final del grupo EQ con código 40000001, nombre «Herramientas manuales», unidad %MO, cantidad = %, parcial. Si el grupo EQ no tiene insumos pero hay %, el grupo se muestra solo con esa fila.
- `Insumos.tsx`: quitar pestaña HT (filtrar tipos ocultos); eliminar `HerramientasWysiwyg`. `BuscadorInsumo.tsx`, `PartidasMaestras.tsx`, `CodificacionInsumos.tsx`: excluir tipos ocultos.
- `MargenesApu.tsx`: mantener la fila HT con su etiqueta de % de MO.
- Actualizar memoria «Herramientas en APU» y regla en AGENTS.md.
