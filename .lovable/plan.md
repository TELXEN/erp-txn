# Propuestas para mejorar la pantalla del ERP

Cada punto se puede aprobar por separado. No cambia cálculos ni reglas del negocio.

## 1. Inicio con alertas del día
Una pantalla de inicio según el rol que muestra lo pendiente: cobros vencidos, partidas bloqueadas por sobrecosto, boletas sin validar, EMO por vencer y solicitudes que esperan a Gerencia. Al pulsar una alerta se abre el módulo que corresponde.

## 2. Búsqueda rápida (Ctrl+K)
Desde cualquier pantalla puedes escribir el nombre de un módulo, una obra, una cotización, un proveedor o una factura y saltar directo a ella.

## 3. Tablas más cómodas
- Totales fijos al pie de la tabla en todas las hojas.
- Columnas que puedes ocultar, y el sistema recuerda tu elección.
- Filtros que se mantienen al volver a la pantalla.

## 4. Uso en celular para campo
Tareo, requerimientos y caja chica se adaptan al celular, con botones grandes y formularios en una sola columna.

## 5. Aspecto uniforme
Todas las pantallas usan la misma cabecera (título, período y acciones) y los mismos mensajes cuando una lista está vacía o cargando.

## Detalles técnicos
- Solo cambios de presentación. Se reutilizan los datos actuales, los componentes `ui-kit` y `BarraIconosHoja`, y los tokens de tema.
- La búsqueda usa `cmdk`, que ya trae shadcn, y consultas de solo lectura.
- Cada etapa se revisa en pantalla con Playwright, en escritorio y en celular.
