# Integrar los botones de cada pantalla a la cinta

## Qué cambia para el usuario
Hoy, con la cinta activa, queda debajo una franja con el título de la pantalla y sus botones (Nuevo, Exportar, Imprimir, filtros de periodo, etc.). Esa franja desaparece y su contenido pasa a la cinta, como las "pestañas contextuales" de Office (p. ej. "Diseño de tabla" en Excel):

- Al entrar a una pantalla aparece una pestaña extra al final, con el nombre de la pantalla (p. ej. «Cotizaciones»), resaltada con el color del tema.
- Esa pestaña se abre sola al entrar a la pantalla y contiene sus botones, en el mismo orden y agrupados como hoy, separados por las líneas verticales de la cinta.
- En la cinta clásica cada grupo lleva su título abajo (p. ej. «Documento», «Exportar»); en la simplificada los grupos van en una sola fila con separadores.
- El usuario puede pasar a otra pestaña (Comercial, Logística…) para navegar y volver a la pestaña de la pantalla en un clic.
- El título y subtítulo de la pantalla se muestran a la izquierda de la fila de pestañas, en letra pequeña.
- Con el menú lateral todo queda exactamente como hoy.
- La barra de iconos de la derecha (lupa, +, lápiz, papelera) no se mueve: es parte de la hoja, no de la pantalla.

## Agrupamiento
- Cada pantalla ya pasa sus botones juntos; los grupos se respetan tal cual vienen (cada contenedor de botones = un grupo).
- Las pantallas que quieran nombrar sus grupos podrán hacerlo; las demás muestran el grupo sin título.
- Los botones conservan su comportamiento (mismos clics, permisos y estados desactivados); solo cambia dónde se dibujan.

## Detalles técnicos
- `Encabezado` (AppShell.tsx) hoy hace portal a la ranura del `<header>`. Con cinta: el portal apunta a una nueva ranura dentro de `CintaOpciones` (fila de iconos de la pestaña contextual) y el título a una ranura en la fila de pestañas; el `<header>` se oculta cuando `conCinta`.
- Nuevo componente opcional `GrupoCinta({ titulo, children })` para nombrar grupos; los hijos directos de `acciones` sin envoltorio se tratan como un grupo.
- `CintaOpciones` recibe `contextual?: { titulo }` y añade la pestaña; se activa al cambiar de ruta; su estilo de botones se adapta vía selectores (`[&_button]`) para no tocar cada pantalla.
- Revisar con Playwright 4–5 pantallas con muchas acciones (Cotizaciones, Nómina, Gantt, Configuración) en ambos modos y en el lateral.
- Registrar la regla en AGENTS.md (acciones de pantalla viven en la pestaña contextual cuando hay cinta).
