import { expect, it } from "vitest";
import { leerFechaDocumento, mostrarFechaDocumento } from "./fecha-documento";

it("interpreta día/mes/año sin intercambiar día y mes", () => {
  expect(leerFechaDocumento("05/11/2026")).toBe("2026-11-05");
  expect(mostrarFechaDocumento("2026-11-19")).toBe("19/11/2026");
});
it("rechaza fechas imposibles sin sustituir la fecha guardada", () => {
  expect(leerFechaDocumento("31/02/2026")).toBeNull();
  expect(leerFechaDocumento("29/02/2028")).toBe("2028-02-29");
});