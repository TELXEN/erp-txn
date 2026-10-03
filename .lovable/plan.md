# Plan: «Registrar Gasto» de Gastos Generales como ventana flotante

Hoy el botón «+ Registrar Gasto» cambia a la pestaña «nuevo» y muestra un formulario incrustado en la página. Se reemplaza por una ventana flotante modal con el mismo patrón visual y de interacción que la ventana «Registrar compra» de Costos Directos (`ModalCompra` en `src/routes/_authenticated/gastos-directos.tsx`).

## Cambios

### Ventana modal «Registrar gasto general»

- Overlay fijo a pantalla completa (`fixed inset-0 z-50`) con fondo oscuro semitransparente, tarjeta centrada con scroll propio, botón X para cerrar y cierre al hacer clic fuera — idéntico al de la ventana de compra.
- Título «Registrar gasto general» con subtítulo descriptivo.
- Campos en cuadrícula de 2 columnas (1 en móvil), en este orden:
  - FECHA (con el mismo selector de fecha dd/MM/AAAA `FechaPeru` usado en la ventana de compra)
  - N° COMPROBANTE
  - CATEGORÍA DEL GASTO (lista desplegable de categorías activas, con su texto de ayuda)
  - PROVEEDOR (lista desplegable)
  - IMPUTACIÓN (obra u Oficina Central)
  - MONTO GASTADO y MONEDA (Soles/Dólares) con TIPO DE CAMBIO habilitado solo en dólares
  - PAGO (Contado/Crédito) con `CamposCondicion`: al contado, MEDIO DE EGRESO (cuentas bancarias o Caja Chica) y N° de operación; al crédito, fecha de vencimiento
- Vista previa en vivo del equivalente en soles («Equivalente: S/ …»), como el resumen de costo de la ventana de compra.
- Botones abajo: **Guardar** (color del menú) y **Cancelar**. Tras guardar, la ventana queda abierta con los campos de descripción, comprobante, proveedor y monto limpios para registrar otro gasto (mismo comportamiento persistente de la ventana de compra); un aviso discreto confirma el registro.
- La «Guía de categorías» se mantiene accesible como enlace/botón discreto dentro de la ventana (desplegable informativo).

### Limpieza

- Se elimina la pestaña «nuevo» y el panel incrustado «Nuevo gasto general»; el estado `pestana` queda solo con gastos / mantenimiento / combustible.
- El botón «+ Registrar Gasto» de la barra superior abre la ventana.
- La edición en línea de gastos existentes (lápiz) y el resto de la pantalla no cambian.

## Detalles técnicos

- Solo se modifica `src/routes/_authenticated/gastos-generales.tsx`; se reutilizan `FechaPeru` y el patrón de `ModalCompra` (se importan o replican los helpers locales `cent`/`soles` ya existentes).
- Sin cambios de base de datos ni de la lógica de guardado (`guardar` sigue insertando en `gastos_generales` con los mismos campos y validaciones).
- Colores con tokens del tema; diseño adaptable a móvil.

## Verificación

- `tsgo` limpio y build OK.
- Vista previa con sesión: abrir la ventana desde «+ Registrar Gasto», registrar un gasto de prueba, confirmar que aparece en la lista y que la ventana queda lista para otro registro; luego eliminar el gasto de prueba.
