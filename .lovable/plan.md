# Quitar el desglose de costo directo en Costos Directos

## Qué cambia

La pantalla **Costos Directos** queda en una sola vista, sin pestañas, con este orden:

```text
Obra / Cliente
Aviso de desbloqueos pendientes (si aplica)
[ Partidas ] [ Presupuesto CD ] [ Costo real ] [ Saldo ] [ Consumo ]
Control por partida  (tabla con buscador, acciones y compras por partida)
```

- Se quita el panel **Desglose de costo directo** (el desglose por categoría que hoy aparece debajo de las tarjetas).
- Las cinco tarjetas se mantienen exactamente como están.
- Se quita el selector de pestañas «Resumen de Costos Directos / Control por partida», porque al irse el desglose la pestaña de resumen se queda solo con las tarjetas. Las tarjetas y el control por partida pasan a verse siempre, uno debajo del otro.
- El buscador, el filtro, la barra de acciones (editar/eliminar), el registro de compras por partida y «Exportar a Excel» siguen igual.

## Detalles técnicos

- `src/routes/_authenticated/gastos-directos.tsx`
  - Quitar el render de `<DesgloseCd proyectoId={proyectoId} />` (línea 461) y su `import` (línea 28).
  - Quitar el estado `pestana` (líneas 118-121), el efecto que lo guarda en el navegador (líneas 167-169) y el bloque de botones de pestaña (líneas 416-427).
  - Quitar los conticionales `{pestana === "resumen" && ...}` (línea 429 y cierre en 462-464) y `{pestana === "partidas" && ...}` (línea 465 y cierre en 641), dejando el contenido de ambos bloques siempre visible y con la sangría corregida.
- `src/components/DesgloseCd.tsx` y `useDesgloseCd` **no se tocan**: siguen usándose en el Dashboard de Proyectos (pestaña «Desglose de costo directo»).
- La preferencia guardada `gastos-directos:pestana` deja de escribirse; no molesta a nadie.
- Se registra la tarea en `roadmap.md` al ejecutar el plan.

## Verificación

- Compilación sin errores.
- En pantalla, con una obra real abierta: las cinco tarjetas y «Control por partida» visibles a la vez, sin panel de desglose, sin pestañas; buscar una partida y abrir/añadir una compra sigue funcionando.
