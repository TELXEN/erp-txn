# Preliquidación: quitar la banda de configuración y editar todo sobre la hoja

## Qué verá el usuario
- Desaparece la banda de color «Configuración de preliquidación» del editor. La hoja empieza justo debajo del título del editor.
- Cada dato se completa en su lugar dentro de la hoja, con el mismo estilo discreto de los demás campos editables (texto del documento, subrayado suave al pasar el cursor):
  - **Cliente**: en el recuadro «Cliente», la razón social pasa a ser una lista desplegable. Si la preliquidación viene «Desde cliente», queda fija como hoy. RUC y dirección se siguen mostrando debajo.
  - **Proyecto / obra**: en su recuadro, lista desplegable (solo proyectos del cliente si el origen es «Desde cliente»). Debajo, en letra pequeña, **«Saldo de obra S/ …»** en verde o rojo, como hoy.
  - **Régimen (detracción/retención) y % aplicado**: en el bloque de totales, en la fila de detracción/retención, como desplegable y número junto a la etiqueta.
  - **Condición de pago y días de crédito**: en la línea de condición de pago que ya tiene la hoja (Contado/Crédito, plazo y vencimiento), en vez de arriba.
- Vista previa, PDF y lógica de guardado no cambian: solo se mueve dónde se escribe cada dato.

## Detalles técnicos
- `Preliquidaciones.tsx`: eliminar el bloque `bg-sidebar` (líneas ~416-544) y el estado `cintaColapsada`; pasar a `HojaPreliquidacion` las opciones (clientes, proyectos filtrados, regímenes, plazos), `clienteFijo`, `saldoObra` y callbacks `onCliente`, `onProyecto` (usa `elegirProyecto`), `onRegimen`, `onCondicion`.
- `HojaPreliquidacion.tsx`: nuevas props opcionales; en modo `editable` renderizar `select`/`input` con el estilo `ed` existente en los recuadros Cliente, Proyecto, fila de detracción y condición de pago. Sin `editable` se ve igual que hoy.
- Verificación: typecheck, y Playwright abriendo una preliquidación en edición para cambiar cliente, proyecto, régimen y condición sin guardar.
