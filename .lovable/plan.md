# Dos temas nuevos estilo Microsoft 365: Gris oscuro y Negro

## Qué verás
En **Temas de colores** aparecerán dos tarjetas más, con el mismo modelo que Word, Excel y PowerPoint (menú del color del tema, botones principales del mismo color, texto blanco):

- **Microsoft 365 Gris oscuro** — menú gris carbón como el tema "Gris oscuro" de Office (base #444444, panel #333333, resalte #555555, borde #666666, texto secundario #D0D0D0).
- **Microsoft 365 Negro** — menú negro como el tema "Negro" de Office (base #262626, panel #1A1A1A, resalte #3A3A3A, borde #4A4A4A, texto secundario #C8C8C8).

Las pantallas de trabajo (tablas, hojas, documentos) siguen claras; solo cambian menú lateral y botones, igual que los temas Office actuales. Quedarán siete temas en total.

## Detalles técnicos
- `src/lib/temas.ts`: ampliar `TemaId` con `office-gris` y `office-negro` y añadir dos entradas con `temaOffice(...)` tras PowerPoint (tinte neutro `oklch(0.975 0 0)`).
- Actualizar la memoria de temas visuales: siete temas (se suman Gris oscuro y Negro de Microsoft 365); Esmeralda, Cobalto y Zafiro siguen retirados.
- Verificar con Playwright en /tema-colores que ambos temas se aplican al menú.
