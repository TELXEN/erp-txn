# SIRE: eliminar el botón «Registros»

## Objetivo
Ventas (RVIE) y Compras (RCE) quedan como pestañas principales de navegación; desaparece el botón «Registros», que solo duplicaba un nivel innecesario.

## Cambios (solo `src/routes/_authenticated/sire.tsx`)

1. **Eliminar el botón «Registros»** (`botonRegistros` y su prop en `SincronizacionGlobal`): la segunda fila queda únicamente con las pestañas de datos.
2. **Pestañas siempre visibles**: la segunda fila muestra permanentemente «Ventas (RVIE)» y «Compras (RCE)», con estilo subpestaña actual (borde inferior activo). Así el usuario siempre puede volver a un libro aunque esté en Configuración.
3. **Configuración**: el botón «Configuración» se mantiene en la fila superior (junto a Mes/Año). Cuando está activo, la segunda fila añade además su hija «API SOL» como pestaña activa, conservando el acceso a la configuración de credenciales.
4. La lógica de `tab` (`"RVIE" | "RCE" | "config"`) no cambia; solo la presentación de la navegación.

## Verificación
- `bunx tsgo --noEmit` limpio y build OK.
- Playwright: fila superior con Configuración + Mes/Año a la izquierda y sincronización a la derecha; fila inferior siempre con Ventas/Compras clicables y activación correcta al entrar a Configuración.
