# Opción «Maestro de Insumos» en el menú

## Qué verás
- En el menú lateral, sección **Datos**, una nueva opción **Maestro de Insumos** (para administrador y gerente), con su propio ícono.
- Al abrirla: la cabecera «Maestro de Insumos» y la misma hoja de insumos que hoy está en Banco APU (crear, editar, filtrar, desactivar). Es la misma lista única de fichas, no una copia.
- La pestaña Insumos de Banco APU sigue funcionando igual, y lo que cambies en un lado se ve en el otro.

## Detalles técnicos
- Nueva ruta `src/routes/_authenticated/maestro-insumos.tsx` con su `head()` y la cabecera CabeceraModulo/Encabezado, que muestra el componente existente `Insumos`.
- Agregar `{ a: "/maestro-insumos", texto: "Maestro de Insumos", roles: ["administrador","gerente"], icono: Boxes }` al grupo «Datos» de `AppShell.tsx`.
- No hay cambios en la base de datos.
