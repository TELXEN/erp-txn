# Cotización en ventana flotante (como Gastos Generales)

## Qué verá el usuario
- Al abrir una cotización (desde la lista, «Nueva cotización» o «Vista previa»), ya no cambia de pantalla ni de cinta: se abre una ventana a pantalla completa encima de la lista.
- En la barra del título, junto a la X: conmutador **Edición | Vista previa** (igual que Gastos Generales).
- La cinta superior vuelve a ser la normal de Comercial; ya no muestra los grupos Vista, Estado, Obra, Documento ni Salida.
- Las herramientas de esos grupos pasan a una barra fina dentro de la ventana, bajo el título:
  - Edición: Estado (enviar, aprobar, rechazar, nueva revisión, retomar), Convertir en obra, Encabezado, Gastos generales, Dossier APU, Exportar.
  - Vista previa: Imprimir, Descargar PDF, Excel, Gastos generales, Dossier APU.
- Cerrar con la X devuelve a la lista con la cotización seleccionada. Volver se reemplaza por la X.
- La hoja A4 de la vista previa se ve centrada sobre fondo gris, como en Gastos Generales.

## Detalles técnicos
- `cotizaciones.tsx`: el bloque de edición (hoy con `soloCinta={SOLO_COTIZ}` y cinta propia) se envuelve en `VentanaFlotante` con `sinMargen`, `ancho="max-w-none"`, `ocultarBarra` y `acciones` (conmutador). Estado local `modo: "edicion" | "vista"`; la cotización abierta sigue en `seleccion`/`?abrir=`.
- Extraer el contenido de `cotizacion-vista.tsx` a un componente `VistaPreviaCotizacion` reutilizable dentro de la ventana; la ruta `/cotizacion-vista` se mantiene como envoltorio para enlaces existentes (Retomada, original de retoma) que ahora abren la ventana en modo vista.
- Botones de la barra interna con `Boton`/`BotonIcono` del ui-kit y separadores `barra-iconos`; quitar `GrupoVista`, `BotonGrande`, `BotonPequeno`, `Columna` y `SOLO_COTIZ` de `CintaCotizacion.tsx` (borrar el archivo si queda sin uso) y la ocultación de categorías en `CintaOpciones.tsx`.
- Gastos Generales abierto desde la cotización sigue siendo su propia ventana encima.
- Actualizar memorias: `cinta-cotizacion-solo-cotizaciones` (retirada) y nueva regla «cotización en ventana flotante con Edición | Vista previa»; regla en `src/routes/AGENTS.md`.
- Verificar en pantalla: abrir, alternar modos, imprimir, cerrar.
