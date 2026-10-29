import { describe, it, expect } from "vitest";
import { opcionesEspecialidad, opcionesSubfamilia, usaSubfamilia, validarClasificacion } from "./clasificacion-insumo";
import type { EspecialidadPartida } from "./especialidades";

const sub = (p: { id: string; especialidad_id?: string; codigo?: string; nombre?: string; activo?: boolean }) => ({
  id: p.id,
  especialidad_id: p.especialidad_id ?? "e-elec",
  codigo: p.codigo ?? "01",
  nombre: p.nombre ?? "Conductores",
  activo: p.activo ?? true,
});

const esp = (p: Partial<EspecialidadPartida>): EspecialidadPartida => ({
  id: "e-elec",
  codigo: "06",
  nombre: "ELÉCTRICA",
  orden: 6,
  activo: true,
  bloque: "construccion",
  descripcion: null,
  codigo_modular: "06",
  ...p,
});

describe("clasificación para el código T+EE+SS+NNN", () => {
  it("la especialidad es obligatoria", () =>
    expect(validarClasificacion("MAT", "", "s1")).toBe("Elige la especialidad: con ella se genera el código."));

  it("el material exige subfamilia", () =>
    expect(validarClasificacion("MAT", "e-elec", "")).toBe("Elige la subfamilia: los materiales la requieren."));

  it("el subcontrato puede ir sin subfamilia", () => expect(validarClasificacion("SC", "e-elec", "")).toBeNull());

  it("la mano de obra nunca usa subfamilia", () => {
    expect(usaSubfamilia("MO")).toBe(false);
    expect(usaSubfamilia("mano_obra")).toBe(false);
    expect(validarClasificacion("MO", "e-elec", "s1")).toBeNull();
  });

  it("materiales, equipos y subcontratos sí usan subfamilia", () => {
    expect(usaSubfamilia("MAT")).toBe(true);
    expect(usaSubfamilia("materiales")).toBe(true);
    expect(usaSubfamilia("EQ")).toBe(true);
    expect(usaSubfamilia("SC")).toBe(true);
  });

  it("solo ofrece subfamilias de la especialidad del insumo", () => {
    const subs = [sub({ id: "s1" }), sub({ id: "s2", especialidad_id: "e-civ", codigo: "02", nombre: "Otros" })];
    expect(opcionesSubfamilia(subs, "e-elec", null).map((o) => o.value)).toEqual(["s1"]);
  });

  it("mantiene la subfamilia inactiva que ya estaba asignada", () =>
    expect(opcionesSubfamilia([sub({ id: "s1", activo: false })], "e-elec", "s1").map((o) => o.value)).toEqual(["s1"]));

  it("sin especialidad no se ofrece ninguna subfamilia", () =>
    expect(opcionesSubfamilia([sub({ id: "s1" })], null, null)).toEqual([]));

  it("solo ofrece especialidades activas con código de 2 dígitos", () => {
    const catalogo = [esp({ id: "e-elec" }), esp({ id: "e-vieja", activo: false, codigo_modular: null })];
    expect(opcionesEspecialidad(catalogo, null).map((o) => o.value)).toEqual(["e-elec"]);
  });

  it("muestra el código de la especialidad como comentario", () =>
    expect(opcionesEspecialidad([esp({ id: "e-elec" })], null)[0]).toEqual({ value: "e-elec", texto: "ELÉCTRICA", detalle: "06" }));
});
