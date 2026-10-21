# Iconos de la barra derecha más nítidos y con más impacto

Afecta la columna vertical de iconos (Agregar, Editar, Copiar, Mover, Eliminar, bloque Documento) en: Cotizaciones (lista y hoja), plantillas, Banco APU (partidas e insumos), Especialidades, Subfamilias, Títulos de partidas y Unidades de medida.

## Qué cambia a la vista
- **Mismo tamaño de iconos (15 px)**, pero con trazo más firme (2.25) y color definido en lugar del gris apagado actual.
- **Color por acción, siempre visible** (no solo al pasar el mouse):
  - Agregar: botón relleno con el color principal del ERP e icono claro (acción destacada).
  - Editar / Copiar / Mover / Documento: icono en tono oscuro de texto (no gris), borde definido.
  - Eliminar: icono rojo intenso con fondo rojo suave.
- **Al pasar el mouse**: fondo con el color de la acción, ligera elevación (sombra) y realce del icono.
- **Desactivados**: se distinguen claramente pero sin "borrarse" (opacidad 40% y sin sombra).
- **Contenedor de la barra**: fondo de tarjeta con sombra suave y borde más marcado, para que se despegue de la hoja; separadores finos entre grupos (Agregar | Editar/Copiar | Mover | Eliminar | Documento).
- Funciona igual en modo claro y oscuro; tamaños de tablas y filas no cambian.

## Detalles técnicos
- Nuevo componente `BarraLateralIconos` en `ui-kit.tsx` (contenedor sticky + estilos) y prop `variante="barra"` en `BotonIcono` con tonos `primario` relleno, `neutro` de alto contraste (`text-foreground`, `border-border`), `peligro` (`text-bad`, `bg-bad/10`).
- Tamaño de icono centralizado: los botones de barra fuerzan `[&_svg]:size-[17px] [&_svg]:stroke-[2.25]`, sin tocar cada icono.
- Token nuevo `--shadow-barra` en `src/styles.css`.
- Reemplazar los 7 contenedores duplicados (`sticky top-2 flex h-fit flex-col ...`) en HojaNiveles, cotizaciones.tsx, BancoApu (2), EspecialidadesPartida, HojaSubfamilias y BarraIconosHoja por el componente compartido.
- Los botones pequeños dentro de filas de tabla (24 px) no cambian, para respetar la densidad de tablas.
- Verificar con captura de pantalla en Cotizaciones y Banco APU.
