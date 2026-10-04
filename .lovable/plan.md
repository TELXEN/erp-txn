# Cinta ultra-delgada para la edición de preliquidaciones

## Objetivo
Reemplazar el panel gris de dos filas (Proyecto, Cliente, Régimen, % aplicado, Condición de pago, Días de crédito, Saldo) que hoy empuja la hoja de preliquidación hacia abajo, por una cinta horizontal ultra-delgada estilo "ribbon" que libera espacio vertical para el documento.

## Diseño elegido (prototipo v3)
- Cinta de una sola fila con fondo azul marino (`DOC.green` #1A2B4C), bordes superiores redondeados, pegada al borde superior de la hoja.
- Fila de título mínima: "Configuración de preliquidación" en dorado (#F1C40F), texto 10px, con botón "Contraer panel" que colapsa la cinta a solo esa tira.
- Siete celdas en una fila (grid de 7 columnas con separadores finos): Proyecto, Cliente, Régimen, % aplicado, Condición, Días crédito y Saldo de obra.
- Cada celda: etiqueta 9px en gris claro mayúsculas + control transparente con texto blanco 12px; foco con anillo dorado.
- Saldo de obra como celda destacada con anillo dorado interno y valor en negrita (verde/rojo según signo, como hoy).
- Estado colapsado: solo la tira de título con resumen corto (proyecto · cliente) y botón "Expandir".

## Cambios técnicos
- `src/components/Preliquidaciones.tsx` (líneas ~356-399): reemplazar el `div` con `grid sm:grid-cols-4` + `Campo` por la cinta:
  - Contenedor `rounded-t-lg bg-[#1A2B4C] text-white` pegado a `HojaPreliquidacion` (sin `mb-4` entre ambos; la hoja pierde el redondeado superior en edición o la cinta se integra como cabecera).
  - Controles `Select`/`Input` con variante local "en oscuro": fondo transparente, texto blanco, sin borde, foco dorado. Se implementan inline con clases, sin tocar los componentes base `Select`/`Input` del ui-kit.
  - `CamposCondicion` se descompone en sus dos celdas (Condición de pago, Días de crédito) dentro de la misma fila; si su marcado actual no cabe, se extraen los selects directamente.
  - Estado `colapsada` (useState, por defecto expandida) con transición de altura.
  - La celda de saldo conserva el cálculo `saldoSel - netoForm * tc` y los colores `text-good`/`text-bad` adaptados a fondo oscuro.
- En pantallas angostas la cinta pasa a dos filas (grid-cols-4 / grid-cols-7 en `sm:`).
- Sin cambios en `HojaPreliquidacion`, vista previa, PDF ni lógica de guardado.

## Verificación
- `bunx tsgo --noEmit` y build OK.
- Playwright: abrir edición de TXN26-PL003, capturar pantalla, confirmar que la hoja empieza mucho más arriba, que los 7 controles funcionan (cambiar régimen y condición) y que el botón contraer/expandir funciona.
