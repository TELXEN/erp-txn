# Mano de obra: costo hora-hombre según régimen laboral

## Qué verá el usuario
En Maestro de insumos > Mano de obra, el formulario "Nuevo insumo" tendrá:

| Campo | Comportamiento |
|---|---|
| Código | Automático, solo lectura: un dígito del tipo seguido del correlativo, sin separadores, máximo 8 dígitos (ej. `10000001` = Mano de obra N° 1) |
| Descripción | Texto libre (ej. "Operario electricista") |
| Régimen laboral | Construcción Civil / Régimen General Común / MYPE Pequeña Empresa |
| Categoría (solo Construcción Civil) | Operario / Oficial / Peón |
| Unidad | Fija en `hh` |
| Sueldo mensual (S/) | Se escribe. En Construcción Civil se precarga el jornal oficial de la categoría x 30 (editable) |
| Margen (%) | Se escribe en porcentaje |
| Costo HH (S/) | Calculado en vivo, solo lectura |

Debajo, un desglose plegable "Cómo se calcula" muestra cada concepto según el régimen elegido. La tabla añade las columnas Régimen y Sueldo mensual, con Costo HH y P. Venta (Costo HH + margen). Las otras cuatro pestañas no cambian.

## Conceptos por régimen (costo anual del empleador)

| Concepto | Régimen General | MYPE Pequeña Empresa | Construcción Civil |
|---|---|---|---|
| Remuneración | Sueldo x 12 | Sueldo x 12 | Jornal básico x días laborables |
| Gratificaciones | 2 sueldos + 9% bonif. | 1 sueldo (½ en jul. y dic.) + 9% | 40 jornales (Fiestas Patrias) + 40 (Navidad) |
| Vacaciones | 30 días | 15 días | 10% del jornal básico (pagadas, sin descanso) |
| CTS | 1 sueldo + 1/6 grati | ½ sueldo (15 días por año) | 15% del jornal básico |
| Asignación familiar | 10% RMV (opcional) | 10% RMV (opcional) | No aplica (escolaridad aparte) |
| Bonificación unificada (BUC) | No | No | 32% Operario / 30% Oficial y Peón |
| Movilidad / herramienta | No | No | Pasaje diario + 5% herramienta (operario) |
| EsSalud | 9% | 9% | 9% |
| SCTR salud + pensión | % configurable | % configurable | Obligatorio, % configurable |
| Seguro Vida Ley | % configurable | % configurable | % configurable |
| CONAFOVICER | No | No | 2% del jornal (lo paga el trabajador; informativo) |

Horas efectivas por año (configurable): 48 h semanales x 52 semanas menos vacaciones (si se descansan) y feriados.

**Costo HH = Costo anual total / horas efectivas**
**P. Venta = Costo HH x (1 + margen %)**

## Parámetros configurables
En Configuración del Sistema, panel "Parámetros laborales" (solo Gerente):
- Generales: RMV, % EsSalud, % SCTR, % Vida Ley, horas semanales, feriados al año.
- Construcción Civil: jornal vigente por categoría (Operario, Oficial, Peón), % BUC por categoría, pasaje diario, % herramienta.
Así, cuando salga la nueva tabla salarial de construcción civil, se actualiza en un solo lugar.

## Código automático
Formato numérico puro, sin separadores, máximo 8 dígitos: primer dígito identifica el tipo de insumo (1 = Mano de obra, 2 = Materiales, 3 = Equipos y maquinaria, 4 = Herramientas menores, 5 = Subcontratos) seguido del correlativo con ceros a la izquierda hasta completar 8 dígitos. Ejemplo: `10000001`, `20000012`. En Catálogos Maestros se añade "Codificación de insumos" con el correlativo por tipo (y el dígito de tipo editable por si cambia). El código se reserva en el servidor al guardar.

## Detalles técnicos
- Migración: en `insumos` columnas `sueldo_mensual numeric default 0`, `regimen_laboral text default 'General'` (General | MYPE Pequeña | Construcción Civil), `categoria_obrero text null`, `asignacion_familiar boolean default false`; tabla `parametros_laborales` (fila única, lectura autenticados, edición solo gerente, con GRANTs y RLS); tabla `codificacion_insumo` (dígito de tipo y correlativo por cada tipo, 8 dígitos totales) + función `siguiente_codigo_insumo(tipo)` solo service_role, invocada desde un server fn en `codigos.functions.ts`.
- `src/lib/apu.ts`: función pura `calcularCostoHH(insumo, params)` con una rama por régimen que devuelve desglose y total; para MO se guarda `precio` = Costo HH, así el APU y el buscador siguen usando `precioVenta` sin cambios.
- `Insumos.tsx`: formulario específico para MO con selector de régimen/categoría, desglose plegable, nuevas columnas; la edición en fila recalcula.
- Verificar en navegador: crear un insumo de cada régimen, revisar código, cálculo y que aparezca en el APU con su P. Venta.
