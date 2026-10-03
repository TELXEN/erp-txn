# Encabezado de proyecto del WBS con el azul del menú

## Objetivo
En el módulo de Partidas, la barra oscura que agrupa los proyectos (donde aparece «TXN26-P006 · COTIZACION01» y el botón «Renumerar WBS») deja de ser negro puro y adopta el color de fondo del menú lateral del tema activo, para integrarse visualmente con la navegación.

## Cambios

### 1. Fondo de la barra de proyecto
- Se reemplaza el fondo negro fijo actual por el color del menú lateral (token `--sidebar`) de cada tema: azul petróleo en TELXEN Industrial, pizarra en Esmeralda y Pizarra, azul cobalto en Cobalto y Naranja, negro en Zafiro y Cian y en TELXEN Obsidiana.
- Al cambiar de tema, la barra sigue automáticamente el color del menú.

### 2. Tipografía y textos
- El nombre del proyecto usa un blanco roto tipo Slate-50 (`#F8FAFC`), en semibold, con el espaciado actual para que la separación entre proyectos siga siendo clara.

### 3. Botón «Renumerar WBS»
- Estilo sutil dentro de la barra: texto en gris claro (Slate-300) con borde fino discreto, que pasa a blanco puro al pasar el cursor. Sin bordes invasivos.

### 4. Estilo general
- Sin ningún rastro de negro puro (`#000000`) en esta barra de separación.
- Las esquinas quedan rectas porque la tabla cruza de extremo a extremo.
- La fila de especialidad, la de categoría y el resto del listado no cambian.

## Verificación
- Revisar la barra en dos temas con fondos distintos (p. ej. TELXEN Industrial y Zafiro y Cian) en la vista previa.
- Confirmar contraste del texto y del botón, y que la franja lateral no cambie.
- Comprobar que la aplicación compile sin errores.

## Detalle técnico
Archivo: `src/routes/_authenticated/partidas.tsx`. Se sustituye el fondo fijo (`bg-ink`) por los tokens semánticos del menú (`bg-sidebar`), el texto por `text-sidebar-foreground` con tono Slate-50 y el botón por clases sutiles claras; sin cambios de base de datos.
