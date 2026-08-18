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
import { crearNotaSchema } from "./nota";

describe("crearNotaSchema", () => {
  it("acepta una nota válida", async () => {
    await expect(
      crearNotaSchema.validate({
        titulo: "Un título",
        contenido: "Contenido de la nota",
      }),
    ).resolves.toBeDefined();
  });

  it("rechaza un título demasiado corto", async () => {
    await expect(
      crearNotaSchema.validate({
        titulo: "ab",
        contenido: "Contenido de la nota",
      }),
    ).rejects.toThrow();
  });

  it("rechaza un contenido que es solo espacios", async () => {
    // Este es el caso borde interesante: sin el .trim() del schema,
    // "    " pasaría la validación de longitud mínima.
    await expect(
      crearNotaSchema.validate({
        titulo: "Un título",
        contenido: "     ",
      }),
    ).rejects.toThrow();
  });
});
