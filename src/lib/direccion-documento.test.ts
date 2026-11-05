import { expect, it } from "vitest";
import { direccionSinUbicacion } from "./direccion-documento";

it("muestra solo la dirección sin el distrito, provincia y departamento anexados", () => {
  expect(direccionSinUbicacion("JR. CIRO ALEGRIA NRO 136  - EL TAMBO - HUANCAYO - JUNIN", "JUNIN", "HUANCAYO", "EL TAMBO")).toBe("JR. CIRO ALEGRIA NRO 136");
});
it("conserva nombres geográficos que forman parte de la calle", () => {
  expect(direccionSinUbicacion("AV. JUNIN NRO 136", "JUNIN", "HUANCAYO", "EL TAMBO")).toBe("AV. JUNIN NRO 136");
});