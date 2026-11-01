# Subcategorías agrupadas por categoría

## Lo que verás
1. **Categorías como títulos en Subcategorías:** en Catálogo Técnico → Subcategorías, cada especialidad muestra **todas** sus categorías como títulos de grupo, en orden de la A a la Z y con su número, también las que aún no tienen subcategorías (las 17 de ELÉCTRICA). Cada título tiene un «+» para añadir una subcategoría en ese grupo.
2. **Las categorías nuevas aparecen solas:** al crear una categoría, aparece de inmediato como título nuevo en su lugar alfabético. Si la renombras o la eliminas, el título también se actualiza. No se copia nada, así que nunca se desordena.
3. **Flechas subir/bajar en subcategorías:** en la barra de iconos de la derecha habrá «Subir» y «Bajar» para mover la subcategoría seleccionada dentro de su categoría. La numeración (01, 02, 03…) sigue la nueva posición al instante, y los códigos de los insumos de esa subcategoría cambian para coincidir. Sus vínculos con APU, cotizaciones y órdenes de compra se mantienen.
4. **Categorías siempre de la A a la Z:** las categorías no llevan flechas; siguen ordenándose y numerándose solas por orden alfabético, como hoy.
5. **Protección al borrar categorías:** una categoría que tiene subcategorías no se puede borrar. Aparecerá el aviso: «Esta categoría tiene N subcategorías; muévelas o elimínalas primero».
6. **Protección al borrar subcategorías:** una subcategoría que tiene insumos no se puede borrar. Aparecerá el aviso: «Esta subcategoría tiene N insumos». Las vacías se borran normalmente, y las demás de su categoría se renumeran sin huecos.

## Detalles técnicos
- HojaSubfamilias: agrupar por `useCategoriasInsumo` (ya alfabético) en lugar de los `categoria_id` existentes, para mostrar también las categorías vacías; el «+» del título abre la ventana con especialidad y categoría precargadas.
- Migración: función `mover_subcategoria(_id, _direccion)` (security definer, valida is_admin_o_gerente). Intercambia la posición con la vecina dentro de la misma categoría, renumera los códigos de forma correlativa con un bloqueo advisory y recodifica los insumos afectados (reemplaza el segmento SS y conserva T+EE y NNN), usando códigos temporales para evitar choques de unicidad.
- Triggers BEFORE DELETE: en categorias_insumo bloquea si hay subcategorías; en subfamilias_insumo bloquea si hay insumos, con mensaje en español. AFTER DELETE renumera las subcategorías restantes de la categoría.
- Interfaz: BarraIconosHoja con ChevronUp/ChevronDown, desactivados en los extremos o sin selección; los errores al borrar se muestran en el aviso actual.
- Pruebas: función pura de reemplazo del segmento SS y prueba del mensaje de bloqueo al borrar.
