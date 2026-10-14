# Opción tipográfica «Inter + JetBrains Mono» (APU y Cotizaciones)

## Qué verá el usuario
- En Configuración del Sistema → Tipografía de documentos aparece una nueva opción: **Inter + JetBrains Mono**.
- Las demás tipografías siguen funcionando igual que hoy (una sola letra para todo).
- Al elegir la nueva opción:
  - Textos, menús, botones y descripciones se muestran en **Inter**.
  - Códigos, cantidades, rendimientos, precios unitarios, IGV e importes se muestran en **JetBrains Mono** (cero con punto, cifras alineadas).
  - PDF y Excel usan la misma combinación: Inter para texto y JetBrains Mono para cifras y códigos.
- Los tamaños actuales no cambian (se respeta la densidad compacta ya acordada).

## Reglas de tabla incluidas (solo en Banco APU y Cotizaciones, para cualquier tipografía)
- Columnas de cantidad, rendimiento, C. unitario, IGV e importe alineadas a la derecha con cifras de ancho fijo.
- Descripciones largas limitadas a 2 líneas; el texto completo aparece al pasar el cursor.
- En pantallas menores a 1280 px, la columna de código queda fija a la izquierda y la de importe a la derecha al desplazar la tabla de lado, con sombra sutil.

## Fuera de alcance
- No se usan los colores slate/emerald del documento: se conservan los colores del tema.
- No se crea `tailwind.config.js` (el proyecto usa Tailwind v4).

## Detalles técnicos
- Fuentes autoalojadas con `@fontsource-variable/inter` y `@fontsource/jetbrains-mono` (400/700), importadas en `src/styles.css`; TTF locales en `src/assets/fonts/` para jsPDF y @react-pdf.
- `fuentes-documentos.ts`: nuevo id `inter-jetbrains` con `css`, `cssMono`, `pdfFamily`, `pdfMonoFamily`, `excelFamily`, `excelMonoFamily`. `aplicarFuenteGlobal` define `--font-global` y nueva variable `--font-cifras` (igual a `--font-global` en las demás opciones).
- `styles.css`: `--font-mono: var(--font-cifras)`; utilidad `cifra` (`font-family: var(--font-cifras)`, `tabular-nums`, `text-align: right`). Revisar las reglas que hoy fuerzan `.font-mono` a `--font-global` en dashboards para que usen `--font-cifras`.
- Aplicar `cifra`/`font-mono` a columnas numéricas y de código en `BancoApu.tsx`, `CotizacionHoja.tsx`, `PanelApuCotizacion.tsx`, `HojaCotizacion.tsx`; `line-clamp-2` + `title` en descripciones; `sticky left-0 / right-0` en código e importe bajo `xl`.
- Registrar familia mono en `fuentes-jspdf.ts` y `fuentes-documentos-pdf.ts`; en `exportar.ts` usarla para columnas numéricas; Excel asigna la familia mono a celdas numéricas.
- Actualizar `mem://design/tipografia` (excepción: opción combinada) y la regla de tipografía en `AGENTS.md`.
- Verificar con Playwright: seleccionar la opción, revisar Banco APU y una cotización a 1280 y 1920 px, descargar PDF.
