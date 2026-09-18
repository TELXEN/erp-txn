export const soles = (n: number) =>
  "S/ " +
  (Number.isFinite(n) ? n : 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

export const fecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : "—");

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const mesActual = () => new Date().toISOString().slice(0, 7);

export const hoy = () => new Date().toISOString().slice(0, 10);

export const ESPECIALIDADES = [
  "MONTAJE DE TABLEROS",
  "TENDIDO DE CABLES",
  "OBRAS CIVILES",
  "MONTAJE DE EQUIPOS",
  "INSTALACIONES SANITARIAS",
  "PRUEBAS Y PUESTA EN SERVICIO",
  "OTROS",
];
