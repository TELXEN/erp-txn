# Mano de obra: costo hora-hombre desde sueldo mensual

## Qué verá el usuario
En Maestro de insumos > Mano de obra, el formulario "Nuevo insumo" tendrá:

| Campo | Comportamiento |
|---|---|
| Código | Automático (ej. `MO-001`), solo lectura, según la codificación configurada en Catálogos Maestros |
| Descripción | Texto libre (ej. "Operario electricista") |
| Unidad | Fija en `hh` |
| Sueldo mensual (S/) | Se escribe |
| Margen (%) | Se escribe en porcentaje |
| Costo HH (S/) | Calculado en vivo, solo lectura |

Debajo del formulario, un desglose plegable "Cómo se calcula" muestra cada concepto del costo. La tabla del maestro añade la columna Sueldo mensual y muestra Costo HH y P. Venta (Costo HH + margen). Las otras cuatro pestañas quedan como están.

## Fórmula propuesta (régimen general, planilla)
Costo anual del empleador por trabajador:

```text
Sueldo anual            = Sueldo x 12
Gratificaciones         = Sueldo x 2            (julio y diciembre)
Bonif. extraord. 9%     = Gratificaciones x 9%  (Ley 30334, va al trabajador)
Vacaciones              = Sueldo x 1            (ya incluidas en las 12, se cuentan como días no trabajados)
CTS                     = (Sueldo + 1/6 grati) x 1
EsSalud                 = 9% x (Sueldo x 12)
SCTR salud + pensión    = % configurable (por defecto 1.5%) x Sueldo x 12   (obligatorio en construcción)
Seguro Vida Ley         = % configurable (por defecto 0.5%)
Asignación familiar     = 10% RMV x 12   (opcional, casilla)
-------------------------------------------------------------
Costo anual total
```

Horas efectivas al año:
```text
48 h semanales x 52 semanas = 2,496 h
- vacaciones (30 días ≈ 208 h)
- feriados (12 días ≈ 96 h)
= ≈ 2,192 horas efectivas
```

**Costo HH = Costo anual total / horas efectivas**
**P. Venta = Costo HH x (1 + margen %)**

Ejemplo: sueldo S/ 2,000 → costo anual ≈ S/ 33,900 → Costo HH ≈ S/ 15.47.

Nota: no se usa el régimen de construcción civil (jornal diario y BUC); si lo necesitas se agrega como segunda opción.

## Parámetros configurables
En Configuración del Sistema, panel nuevo "Parámetros de mano de obra" (solo Gerente): RMV, % EsSalud, % SCTR, % Vida Ley, horas semanales, días de vacaciones, feriados al año. Cambiarlos recalcula los costos HH al momento de editar.

## Código automático
En Catálogos Maestros se añade "Codificación de insumos" (prefijo por tipo, separador, dígitos), siguiendo el mismo esquema que proyectos y cotizaciones. El código se reserva en el servidor al guardar.

## Detalles técnicos
- Migración: columnas `sueldo_mensual numeric default 0` y `asignacion_familiar boolean default false` en `insumos`; tabla `parametros_laborales` (fila única, lectura autenticados, edición solo gerente, con GRANTs y RLS); tabla `codificacion_insumo` + función `siguiente_codigo_insumo(tipo)` solo service_role, invocada desde un server fn en `codigos.functions.ts`.
- `src/lib/apu.ts`: función pura `calcularCostoHH(sueldo, params, asigFam)` que devuelve desglose y total; para MO, `precio` se guarda con el Costo HH calculado, así el APU y el buscador siguen usando `precioVenta` sin cambios.
- `Insumos.tsx`: formulario específico cuando la pestaña es MO, desglose plegable, columna Sueldo mensual; edición en fila recalcula.
- Verificar en navegador: crear un insumo MO, revisar código, cálculo y que aparezca en el APU con su P. Venta.
