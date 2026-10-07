# SIRE SUNAT: nueva distribución de la cabecera

## Objetivo
Reorganizar la cabecera del módulo SIRE SUNAT (`src/routes/_authenticated/sire.tsx`) en dos columnas: acciones de navegación a la izquierda y el bloque de sincronización apilado verticalmente a la derecha, todo alineado por el borde derecho.

## Diseño solicitado

```text
┌────────────────────────────────────────────────────────────────────┐
│ [Configuración] [Ventas (RVIE)] [Compras (RCE)]   [Sincronizar Compras y Ventas] │
│                                                                    │
│                                     [Mes ▾]  [Año ▾]               │
│                                     RVIE: Sincronizado · …        │
│                                     RCE: Sincronizado · …         │
└────────────────────────────────────────────────────────────────────┘
```

## Cambios (solo frontend, un archivo)

`src/routes/_authenticated/sire.tsx`, componente `SincronizacionGlobal`:

1. **Fila superior (flex, justify-between, items-start):**
   - Izquierda: `Configuración` seguido de las pestañas `Ventas (RVIE)` y `Compras (RCE)` (los botones `subtabs` actuales se integran en la misma fila, en línea con la estética de botón existente). «API SOL» solo aparece en Configuración, como hoy.
   - Derecha: botón negro «Sincronizar Compras y Ventas» con su spinner actual.
2. **Columna derecha apilada (debajo del botón, `items-end` para quedar alineada con el borde derecho del botón):**
   - Selectores `Mes` y `Año` en fila.
   - Debajo, el texto verde de estado de sincronización (`RVIE: Sincronizado …` / `RCE: …`) conservando los colores por estado (verde/rojo/ámbar).
3. Se eliminan la fila inferior actual de pestañas y el recuadro de estados al lado del botón; el bloque completo permanece sticky como ya está.
4. `ResumenOperaciones` y el resto de la pantalla no cambian.

## Verificación
- `bunx tsgo --noEmit` y build limpios.
- Playwright en `/sire` con sesión: comprobar fila superior izquierda (Configuración/Ventas/Compras), botón de sincronización a la derecha, Mes/Año debajo y estados RVIE/RCE debajo de Mes/Año alineados con el botón.
