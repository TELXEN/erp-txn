# Subcategories grouped under each category

## What changes for you
1. **Categories as headings in Subcategorías:** in Catálogo Técnico → Subcategorías, each specialty lists **all** its categories as headings (all 17 for ELÉCTRICA), in alphabetical order with their number. That includes categories with no subcategories yet. Each heading gets a "+" to add a subcategory directly under that category.
2. **New categories appear on their own:** when you create a category, it shows up right away as a new heading, in its alphabetical spot. Renaming or deleting a category updates the headings too. Nothing gets copied, so nothing can fall out of sync.
3. **Up/down arrows for subcategories:** the right-hand icon bar gets "Subir" and "Bajar" buttons. They move the selected subcategory within its category. The numbers (01, 02, 03…) follow the new position right away, and the codes of the items in that subcategory change to match. Their links to APU, quotations and purchase orders stay the same, because those links don't depend on the code.
4. **Categories stay A to Z:** no arrows on categories. They keep sorting themselves alphabetically and renumbering automatically, as they do today.
5. **Delete protection for categories:** a category that still has subcategories can't be deleted. You get the message "Esta categoría tiene N subcategorías; muévelas o elimínalas primero."
6. **Delete protection for subcategories:** a subcategory that has items can't be deleted. You get the message "Esta subcategoría tiene N insumos." Empty subcategories delete normally, and the ones left in their category are renumbered with no gaps.

## Technical details
- HojaSubfamilias: group by `useCategoriasInsumo` (already alphabetical) instead of the existing `categoria_id` values, so empty categories render as headings; heading "+" opens the window with especialidad/categoría preset.
- Migration: RPC `mover_subcategoria(_id, _direccion)` (security definer, admin/gerente check via is_admin_o_gerente) swaps position with its neighbour inside the same categoria_id, renumbers codes contiguously per category under an advisory lock, and recodes affected insumos (replace SS segment, preserving the T+EE prefix and NNN) — temporary codes avoid unique collisions.
- BEFORE DELETE triggers: categorias_insumo blocks when subfamilias exist; subfamilias_insumo blocks when insumos reference it (friendly Spanish RAISE). AFTER DELETE renumbers remaining subcategories in that category.
- UI: BarraIconosHoja gets ChevronUp/ChevronDown, disabled at the edges or without selection; delete errors are shown in the existing notice.
- Tests: pure helper for the SS code replacement plus a test for the delete-block message.
