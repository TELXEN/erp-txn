const OFICIOS = ["capataz", "operario", "oficial", "peon", "instrumentista"];

function posicion(nombre: string): number {
  const normalizado = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const indice = OFICIOS.indexOf(normalizado);
  return indice < 0 ? OFICIOS.length : indice;
}

export function compararManoObra(a: { nombre: string }, b: { nombre: string }): number {
  return posicion(a.nombre) - posicion(b.nombre) || a.nombre.localeCompare(b.nombre, "es");
}