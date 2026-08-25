/**
 * El estado sanitario y la vigencia de un certificado se CALCULAN, no se
 * guardan. Estos tests existen para dejarlo clavado: son la regla de modelado
 * de la clase 3 convertida en verificación.
 */
import { describe, expect, it } from "vitest";
import { calcularVigencia } from "./certificado";

function enDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

describe("calcularVigencia", () => {
  it("un certificado emitido con vencimiento futuro está vigente", () => {
    expect(calcularVigencia({ estado: "EMITIDO", vencimiento: enDias(10) })).toBe(
      "VIGENTE",
    );
  });

  it("el mismo certificado, pasada su fecha, está vencido", () => {
    // Nadie tocó la base: cambió el día. Por eso VENCIDO no es una columna.
    expect(calcularVigencia({ estado: "EMITIDO", vencimiento: enDias(-1) })).toBe(
      "VENCIDO",
    );
  });

  it("un certificado anulado sigue anulado aunque su fecha no haya pasado", () => {
    expect(calcularVigencia({ estado: "ANULADO", vencimiento: enDias(10) })).toBe(
      "ANULADO",
    );
  });

  it("un certificado solicitado todavía no está emitido", () => {
    expect(calcularVigencia({ estado: "SOLICITADO", vencimiento: null })).toBe(
      "PENDIENTE",
    );
  });
});
