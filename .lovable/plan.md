# Mejorar la ventana «Condiciones de la propuesta»

## Qué verá el usuario
- La ventana usa el mismo estilo flotante que el resto del ERP (título, subtítulo «Se guarda al salir de cada campo», X para cerrar) y se mantiene encima del editor a pantalla completa.
- Cuatro tarjetas ordenadas en dos columnas, cada una con icono y título: Recursos humanos, Tiempo de ejecución, Condiciones de pago y Condiciones comerciales.
- Cada tarjeta tiene un cuadro de texto con borde claro y letra legible. Crece con el texto, sin barra de desplazamiento.
- Debajo de cada cuadro aparece «Una línea = un punto» y el número de puntos que saldrán impresos.
- Botón «Usar texto sugerido» en cada tarjeta para rellenar textos típicos de TELXEN cuando la tarjeta está vacía. Por ejemplo, en Condiciones de pago: «Adelanto 50 % a la orden de compra», «Saldo contra valorización».
- A la derecha, una vista previa en pequeño muestra cómo quedarán los términos impresos, con viñetas, igual que en la hoja.
- Pie de la ventana con «Cerrar». Cada campo se guarda al salir de él y aparece un aviso breve «Guardado».
- El botón que abre la ventana deja de ser una línea larga de texto. Pasa a ser un botón compacto «Condiciones» con icono en la barra de herramientas de la cotización.

## Detalles técnicos
- Crear `CondicionesPropuesta.tsx` en `components/cotizaciones` con `VentanaFlotante superpuesta`. Reutiliza `guardar`/`alSalir` y los campos actuales `recursos_humanos`, `tiempo_ejecucion`, `condiciones_pago` y `condiciones`, sin tocar la base de datos.
- `HojaCotizacion.tsx`: quitar el Dialog y el botón largo. La ventana se controla desde `cotizaciones.tsx` con un `BotonBarra` nuevo.
- Para la vista previa se extrae la misma lógica de viñetas (dividir por línea) que usa `cotizacion-vista.tsx`, así lo que se ve coincide con lo impreso.
- Los textos sugeridos van en una constante local. Son textos inventados que el usuario puede cambiar.
