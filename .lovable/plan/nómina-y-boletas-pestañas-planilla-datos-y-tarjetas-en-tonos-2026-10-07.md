# Nómina y Boletas: pestañas Planilla / Datos y tarjetas en tonos suaves

## Objetivo
Reorganizar la pantalla **Nómina y Boletas** (`src/routes/_authenticated/nomina.tsx`):
1. El cuadro «Comisiones AFP del mes» sale de la vista principal y pasa a una pestaña nueva llamada **Datos**.
2. Las cuatro tarjetas de totales (Total ingresos, Descuentos, Neto a pagar, EsSalud/SIS) se distinguen con colores bajos/suaves para leerse mejor.

## Cambios

### 1. Pestañas Planilla / Datos
- Añadir estado `pestana: "planilla" | "datos"` (por defecto **Planilla**).
- Botones segmentados bajo el encabezado, mismo patrón ya usado en Personal («primario» activo / «linea» inactivo):
  - **Planilla** — periodo (Mes/Año), generar/cerrar planilla, registro de pago, tarjetas de totales y tabla de boletas.
  - **Datos** — cuadro «Comisiones AFP del mes» completo (tabla, indicador de origen Decolecta/guardado/respaldo y botón «Actualizar desde Decolecta» solo para Gerente/Administrador) + un cuadro pequeño de referencia legal fija (RMV S/ 1,130 · ONP 13% · EsSalud 9% · SIS Micro S/ 15 · Asig. familiar 10% RMV) para que todo lo paramétrico quede junto.
- Los botones Imprimir boletas / Exportar a Excel se mantienen en el encabezado solo en la pestaña Planilla.
- Al cambiar de pestaña no se pierde el periodo ni la planilla abierta (mismo estado compartido).

### 2. Tarjetas de totales con tonos suaves
- Reutilizar la técnica de acentos suaves ya introducida en el formulario de trabajador (tokens `chip-*` a baja opacidad: fondo ~8%, borde ~25%, texto/acento al tono pleno) — sin colores nuevos hardcodeados.
- Asignación:
  - Total ingresos → azul (`chip-1`)
  - Descuentos al trabajador → ámbar (`chip-margenes`)
  - Neto a pagar → verde (`chip-mat`)
  - EsSalud / SIS → gris (`chip-codificacion`)
- Se conservan etiqueta mono arriba y monto grande abajo; textos a la izquierda, montos a la derecha.

## Fuera de alcance
- Sin cambios de cálculo, base de datos ni permisos; solo presentación y orden de la pantalla.

## Verificación
- `bunx tsgo --noEmit` y build limpios.
- Playwright sobre `/nomina`: pestañas visibles, comisiones solo en «Datos», tarjetas con tonos suaves y tabla de planilla intacta en «Planilla».
