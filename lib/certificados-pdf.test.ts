import { describe, expect, it } from "vitest";
import { generarPdfCertificado } from "./certificados-pdf";

// Una función pura se prueba sin levantar nada: datos adentro, bytes afuera.
describe("generarPdfCertificado", () => {
  it("devuelve un PDF válido", async () => {
    const bytes = await generarPdfCertificado(
      {
        estado: "EMITIDO",
        codigoVerificacion: "ABCDEFGHJKLM",
        emitidoEn: new Date("2026-09-22"),
        vencimiento: new Date("2026-10-22"),
        mascota: { nombre: "Laika", especie: "PERRO" },
      },
      "https://ejemplo.com/api/verificacion",
    );

    // Todo PDF empieza con esos cinco bytes. Es la forma más barata de saber
    // que lo que salió es un archivo y no un error serializado.
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("tolera un certificado sin fechas ni código", async () => {
    const bytes = await generarPdfCertificado(
      {
        estado: "SOLICITADO",
        codigoVerificacion: null,
        emitidoEn: null,
        vencimiento: null,
        mascota: { nombre: "Mishi", especie: "GATO" },
      },
      "https://ejemplo.com/api/verificacion",
    );

    expect(bytes.length).toBeGreaterThan(0);
  });
});
