# Igualar el tono amarillo de los iconos seleccionados

## Qué pasa hoy
El amarillo del icono activo no es el mismo en todos lados:
- La cinta usa por defecto #F2C12E (el amarillo TXN acordado), pero los temas TELXEN lo reemplazan por #FFC709.
- El menú lateral marca el activo con otro token (#FFC709).
- Los demás temas usan un tono gris/apagado para la cinta.

## Qué cambia
Un solo amarillo TXN **#F2C12E** para cualquier icono o botón seleccionado: iconos grandes y pequeños de la cinta, y el ítem activo del menú lateral. El hover sigue siendo ese mismo amarillo al 20 %. El texto sobre el amarillo sigue en negro.

## Detalles técnicos
- `src/lib/temas.ts`: `--cinta-seleccion` fijo en `#F2C12E` en todos los temas (incluido el que hoy usa `c.muted`).
- `src/styles.css`: nuevo token `--seleccion: #F2C12E`; `--color-cinta-seleccion` lo usa.
- `src/components/AppShell.tsx`: el estado activo del menú lateral (líneas ~299, 493, 536) pasa de `bg-cta` a `bg-cinta-seleccion text-cinta-seleccion-foreground`. Los botones de acción (`--cta`) no se tocan.
- Verificar con Playwright cinta grande, pequeña y menú lateral en dos temas.
