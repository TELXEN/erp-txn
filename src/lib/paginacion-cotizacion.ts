/** Distribute measured rows, keeping headings with their first item when possible. */
export function paginarCotizacion<T>(filas: T[], opciones: {
  alto: (fila: T) => number;
  encabezado: (fila: T) => boolean;
  primera: number;
  siguientes: number;
  cierre: number;
}): T[][] {
  const { alto, encabezado, primera, siguientes, cierre } = opciones;
  const paginas: T[][] = [[]];
  let usado = 0;
  filas.forEach((fila, indice) => {
    let necesario = alto(fila);
    if (encabezado(fila)) {
      for (let i = indice + 1; i < filas.length; i++) {
        const siguiente = filas[i];
        if (siguiente === undefined) break;
        necesario += alto(siguiente);
        if (!encabezado(siguiente)) break;
      }
    }
    let pagina = paginas[paginas.length - 1];
    if (!pagina) return;
    const capacidad = paginas.length === 1 ? primera : siguientes;
    if (pagina.length && usado + necesario > capacidad) {
      pagina = [];
      paginas.push(pagina);
      usado = 0;
    }
    pagina.push(fila);
    usado += alto(fila);
  });
  const ultima = paginas[paginas.length - 1];
  const capacidad = paginas.length === 1 ? primera : siguientes;
  if (!ultima || usado + cierre <= capacidad) return paginas;
  // Move only the suffix needed to accommodate the closing block, never a whole group.
  const cola: T[] = [];
  let altoCola = cierre;
  while (ultima.length > 1) {
    const fila = ultima[ultima.length - 1];
    if (fila === undefined || altoCola + alto(fila) > siguientes) break;
    ultima.pop();
    cola.unshift(fila);
    altoCola += alto(fila);
    const anterior = ultima[ultima.length - 1];
    if (anterior !== undefined && encabezado(anterior)) continue;
    break;
  }
  paginas.push(cola);
  return paginas;
}