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
        └─ subcategorias_insumo  RENOMBRADA desde subfamilias_insumo, con categoria_id
             └─ insumos           + categoria_id, subcategoria_id (renombrada), marca_id, numero_parte
```

Decisiones:
- **Nueva tabla de categorías** a partir de los valores de `bloque`: cada bloque distinto por especialidad se convierte en una categoría. Luego se elimina la columna `bloque`.
- **Renombrado real**: `subfamilias_insumo` → `subcategorias_insumo` y `insumos.subfamilia_id` → `subcategoria_id`, actualizando vistas de insumos, triggers, generador de códigos y pantallas. Como la app publicada es solo de prueba, se hace el cambio directo (puede pedir permiso de cambio incompatible en la base).

## Marca y número de parte del fabricante
- Cada insumo tendrá **Marca** (lista del catálogo de Marcas, con buscador) y **N.º de parte** (texto libre, ej. 3RT2016-1AP01).
- Ambos opcionales; se muestran como columnas en el Maestro y en la ventana de registro, después de la subcategoría.
- Se permite repetir una descripción si cambian marca o número de parte (mismo artículo de distinto fabricante); se avisa si se repite la combinación marca + número de parte.
- La búsqueda del Maestro también encuentra por número de parte.

## Ficha del insumo en ventana flotante
Se registra y edita en una **ventana flotante** (no en la fila): la tabla queda compacta y la ficha tiene espacio para todo. Doble clic en una fila abre su ficha.

```text
+--------------------------------------------------------------+
| Especialidad > Categoría > Subcategoría      Código 20540001 |
| Descripción (nombre)                                         |
| Breve descripción (texto corto, opcional)                    |
| Unidad | Marca | N.º de parte | Precio base                  |
|--------------------------------------------------------------|
| Últimas órdenes de compra (5 más recientes)                  |
|  Fecha | N.º OC | Proveedor | Cantidad | P.U. | Moneda       |
|--------------------------------------------------------------|
| Creado por Juan P. · 12/10/2026 10:30                        |
| Modificado por Ana R. · 30/10/2026 · Luis T. · 31/10/2026    |
+--------------------------------------------------------------+
```

- **Breve descripción**: nueva columna `insumos.descripcion_breve` (texto corto), visible en la ficha y como ayuda al pasar el cursor en la tabla.
- **Historial de compras**: solo lectura, leído de las órdenes de compra existentes que incluyen el insumo; sin datos nuevos. Muestra las 5 últimas y el aviso de desviación ±10% respecto al precio base.
- **Registro de autor**: nuevas columnas `creado_por` y `creado_en`, y una tabla `insumos_modificaciones` (insumo, usuario, fecha) que llena un trigger en cada cambio; la ficha muestra el creador y las dos últimas modificaciones con nombre del usuario. Los insumos ya existentes mostrarán «Creador no registrado».
- **Precio promedio de compra**: en el bloque de historial, junto a las últimas OC, se muestra el P.U. promedio (en S/, convirtiendo USD con el TC de cada orden) y la cantidad total comprada.
- **Consumo de los últimos 6 meses**: tabla por mes (cantidad y monto) con total, leída de las salidas de almacén y vales ya registrados; solo lectura.
- **Estado de compra**: interruptor «Compra activa / desactivada» (`insumos.compra_activa`, por defecto activa). Desactivado: sigue en el Maestro y en APU/historial, pero no aparece para nuevos requerimientos ni órdenes de compra. Chip de color en la tabla.
- **Aprobación de insumos nuevos**: un insumo nuevo nace «Pendiente de aprobación» y no puede usarse en compras hasta que Gerencia/Administración lo apruebe o rechace (con motivo). Se guarda en `insumos_aprobaciones` (acción, usuario, fecha, motivo) y la ficha muestra ese registro. Quienes aprueban ven un filtro «Pendientes» en el Maestro. Los insumos actuales quedan como aprobados.
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
