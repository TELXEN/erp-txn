# Catálogo de insumos en cascada: Especialidad → Categoría → Subcategoría → Insumo

## Cómo funcionará para el usuario
1. En «Nuevo insumo» se elige primero la **Especialidad**. Categoría y Subcategoría quedan bloqueadas hasta elegirla.
2. Al elegir la especialidad, **Categoría** muestra solo las categorías de esa especialidad.
3. Al elegir la categoría, **Subcategoría** muestra solo las suyas, con la nota amarilla de guía.
4. Con la subcategoría elegida se habilitan descripción, unidad, marca y precio, y el código se genera solo.
5. Si se cambia la especialidad o la categoría, se limpian los niveles de abajo.
6. En Catálogo Técnico, las pestañas Especialidades / Categorías / Subcategorías quedan en ese orden y cada una filtra por el nivel de arriba.

Mano de Obra y Subcontratos siguen sin subcategoría (regla vigente): para ellos basta la especialidad (código SS = 00).

## Situación actual
- `especialidades_partida` (26): especialidades con código modular.
- `subfamilias_insumo` (55): cuelga de la especialidad y agrupa con un texto libre `bloque` (ej. «Iluminación»), que hoy funciona como categoría informal.
- `categorias_partida` (18): pertenece a **partidas/WBS**, no a insumos. No se toca ni se fusiona.
- `insumos` (10, solo 1 con subfamilia): guarda especialidad y subfamilia.

## Organización de tablas propuesta

```text
especialidades_partida  (se mantiene, es compartida con APU/WBS)
   └─ categorias_insumo       NUEVA: id, especialidad_id, codigo (1 dígito), nombre, descripcion, orden, activo
        └─ subfamilias_insumo  se le agrega categoria_id (pasará a llamarse «Subcategoría» en pantalla)
             └─ insumos         se le agrega categoria_id; conserva especialidad_id y subfamilia_id
```

Decisiones:
- **Nueva tabla de categorías** a partir de los valores de `bloque`: cada bloque distinto por especialidad se convierte en una categoría. `bloque` queda marcado como retirado (no se borra).
- **Renombrar solo en pantalla**: «Subfamilia» → «Subcategoría». Las tablas no se renombran físicamente para no romper la app publicada, las vistas de insumos, triggers ni el generador de códigos.
- **No se fusiona** con `categorias_partida` (es de partidas). La fusión necesaria es «bloque» → categoría real.
- **Código T+EE+SS+NNN se conserva**: el primer dígito de SS es la categoría y el segundo la subcategoría (ya ocurre: Iluminación 40-45, Puesta a Tierra 50-54). Ningún código existente cambia.

## Reglas en la base
- Un trigger valida que la categoría pertenezca a la especialidad y la subcategoría a la categoría; si no, rechaza el guardado.
- Al guardar una subcategoría, su código debe empezar con el dígito de su categoría.
- Unicidad de nombres por nivel sin distinguir mayúsculas ni tildes.
- Archivar en lugar de borrar cuando ya hay insumos usándola.

## Pasos
1. Migración: crear `categorias_insumo` (permisos y reglas de acceso como subfamilias), agregar `categoria_id` a subfamilias e insumos, cargar categorías desde `bloque`, enlazar, trigger de coherencia, comentario de retiro en `bloque`.
2. Ventana de insumo (Insumos.tsx y la ventana flotante): tres desplegables encadenados con buscador y código a la izquierda; campos del insumo deshabilitados hasta completar la cascada.
3. Catálogo Técnico: nueva pestaña **Categorías** (barra de iconos derecha + buscar, agregar, editar, eliminar) entre Especialidades y Subcategorías; Subcategorías elige su categoría en vez del texto bloque.
4. Tabla del maestro: columna Categoría junto a Subcategoría y filtro por los tres niveles.
5. Revisar en pantalla el registro completo de un material y uno de mano de obra.

## Preguntas abiertas
- ¿Equipos, Herramientas y EPP también deben exigir categoría y subcategoría como Materiales?
- ¿Alguna especialidad necesita más de 9 categorías? (el código usa un dígito)
