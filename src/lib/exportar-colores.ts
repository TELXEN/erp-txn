/**
 * html2canvas no interpreta los colores modernos de Tailwind v4 (oklab/oklch).
 * Convierte los colores calculados a RGB solo en el clon de exportación.
 */
export function colorearParaExportar(doc: Document) {
  const canvas = doc.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const view = doc.defaultView;
  if (!ctx || !view) return;
  for (const node of doc.querySelectorAll<HTMLElement>("*")) {
    const computed = view.getComputedStyle(node);
    for (const prop of ["color", "background-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color"]) {
      const value = computed.getPropertyValue(prop);
      if (!/(?:oklab|oklch|color-mix|color\()/.test(value)) continue;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      node.style.setProperty(prop, `rgba(${r}, ${g}, ${b}, ${(a ?? 255) / 255})`, "important");
    }
  }
}
