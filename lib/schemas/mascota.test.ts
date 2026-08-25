/**
 * Test de ejemplo.
 *
 * El objetivo no es "tener tests": es cubrir las reglas que, si se rompen,
 * rompen el negocio. Un buen test describe un caso borde que alguien podría
 * romper sin darse cuenta.
 *
 * Correr con: npm test
 */
import { describe, expect, it } from "vitest";
import { crearMascotaSchema } from "./mascota";

describe("crearMascotaSchema", () => {
  it("acepta una mascota válida", () => {
    const resultado = crearMascotaSchema.safeParse({
      nombre: "Laika",
      especie: "PERRO",
      fechaNacimiento: "2023-05-10",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza una especie que no está en el catálogo", () => {
    // El caso que justifica la unión literal: con `string` esto pasaría, y
    // el valor quedaría guardado rompiendo todas las consultas por especie.
    const resultado = crearMascotaSchema.safeParse({
      nombre: "Rocky",
      especie: "HAMSTER",
      fechaNacimiento: "2023-05-10",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza una fecha de nacimiento futura", () => {
    // Regla de negocio de la spec, y el caso borde interesante: la fecha se
    // compara contra el momento de validar, no contra el momento en que se
    // construyó el schema al arrancar el servidor.
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    const resultado = crearMascotaSchema.safeParse({
      nombre: "Laika",
      especie: "PERRO",
      fechaNacimiento: manana.toISOString(),
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un chip que no tiene 15 dígitos", () => {
    const resultado = crearMascotaSchema.safeParse({
      nombre: "Laika",
      especie: "PERRO",
      fechaNacimiento: "2023-05-10",
      chip: "123",
    });

    expect(resultado.success).toBe(false);
  });
});
