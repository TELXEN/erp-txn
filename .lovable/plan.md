# Barras de título de proyecto más suaves (Partidas y Avance físico)

Hoy cada proyecto se separa con una barra azul oscuro casi negra, de borde a borde, que pesa mucho visualmente y compite con los datos.

## Nuevo estilo

```text
┃ TXN26-P001 · PLANTA DE RELAVES   1 partida · S/ 301.00            [Renumerar WBS]
```

- Fondo claro con un tinte suave del color del menú (en lugar del oscuro sólido).
- Una franja vertical gruesa a la izquierda, del color del menú, para marcar dónde empieza cada proyecto.
- Título en el color del menú y negrita; el resumen («1 partida · S/ 301.00») en gris pequeño.
- El chip «PROYECTO» pasa a un contorno fino; «Renumerar WBS» y la flecha de colapsar se mantienen en la misma posición.
- Funciona igual en los cinco temas (usa los colores del tema elegido).

Aplica a: Partidas («Listado por proyecto y tipos») y Avance físico («Partidas asignadas»). Las filas de especialidad y las partidas no cambian.

## Detalles técnicos

- partidas.tsx y avance.tsx: barra de proyecto `bg-primary/8 border-l-4 border-primary border-b border-line`, título `text-primary`, chip `border border-primary/30 text-primary`, botón Renumerar con variante línea normal.
- Sin cambios de datos.
- Verificación con Playwright a 1378x842 en ambas pantallas.
