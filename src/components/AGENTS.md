# src/components

- Ribbon label widths must be measured at runtime with the typography the ribbon actually renders (canvas, bold weight) and the two-line break chosen by measured pixels; the character-count estimate is only the first paint, never the final width or a hand-set value.
- Inside the ribbon, CSS forces `svg { stroke-width: 1.5 }` and `svg [stroke-width] { stroke-width: 1.1 }`, so any custom icon part that carries a `strokeWidth` prop is drawn at 1.1 px there no matter the value. Keep the parts that must stay visible (outlines, seals) free of the prop so they inherit 1.5 px, and reserve the prop for fine detail lines.
- A screen that owns the ribbon passes `soloCinta` to `Encabezado` so its category keeps only the listed buttons while its own groups sit at the right; hidden sibling routes join a button through its `rutas` so the correct tab stays active. Focused screens never show unrelated actions.
- Quotation header dialogs use VentanaFlotante's `superpuesta` option so their portal remains above the full-screen quotation editor, including on creation.
