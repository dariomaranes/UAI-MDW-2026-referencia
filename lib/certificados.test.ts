/**
 * Los tests de las reglas del certificado.
 *
 * Estas dos funciones existen desde la clase 4 y se quedaron sin tests hasta
 * hoy — que es exactamente lo que la clase 5 viene a corregir: una regla de
 * negocio es lo único del sistema que NO se puede verificar mirando la
 * pantalla, así que es justo lo que hay que testear.
 *
 * Y fijate que se pueden testear sin haber tocado nada: `lib/certificados.ts`
 * no importa Prisma ni Next desde el día que se escribió. Esa decisión, que en
 * la clase 4 parecía una manía de orden, es la que hace posible este archivo.
 *
 * Correr con: npm test
 */
import { describe, expect, it } from "vitest";
import { calcularVencimiento, generarCodigoVerificacion } from "./certificados";

/** Un momento fijo. Los tests de fechas no pueden depender de cuándo corren. */
const EMISION = new Date("2026-09-08T12:00:00Z");

/** El tope de la regla de negocio: 30 días desde la emisión. */
const A_LOS_30_DIAS = new Date("2026-10-08T12:00:00Z");

function fecha(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

describe("calcularVencimiento", () => {
  it("usa el tope de 30 días cuando ninguna obligatoria vence", () => {
    // Es el caso de las vacunas de dosis única: no hay primera vacuna que
    // venza, así que manda el único término que queda.
    expect(calcularVencimiento(EMISION, null)).toEqual(A_LOS_30_DIAS);
  });

  it("usa el tope cuando la vacuna vence después", () => {
    // La antirrábica vence dentro de un año: el certificado no puede durar
    // tanto, porque la spec le pone techo de 30 días.
    expect(calcularVencimiento(EMISION, fecha("2027-08-01"))).toEqual(A_LOS_30_DIAS);
  });

  it("usa la vacuna cuando vence antes del tope", () => {
    // "Lo que ocurra primero". Acá el certificado dura menos de 30 días
    // porque lo que lo respalda se cae antes: un certificado no puede seguir
    // afirmando que la mascota está al día después de que dejó de estarlo.
    const enVeinteDias = fecha("2026-09-28");

    expect(calcularVencimiento(EMISION, enVeinteDias)).toEqual(enVeinteDias);
  });

  it("con empate exacto devuelve esa misma fecha", () => {
    // El borde: la vacuna vence justo el día 30. Las dos ramas dan lo mismo,
    // y el test está para dejarlo fijado — si alguien cambia el `<` por un
    // `<=`, nadie se entera hasta que un certificado dure un día de más.
    expect(calcularVencimiento(EMISION, A_LOS_30_DIAS)).toEqual(A_LOS_30_DIAS);
  });

  it("el segundo parámetro es opcional y equivale a null", () => {
    // Así se llamaba desde la clase 4, cuando el plan de vacunación todavía
    // no existía. Sigue funcionando igual.
    expect(calcularVencimiento(EMISION)).toEqual(A_LOS_30_DIAS);
  });
});

describe("generarCodigoVerificacion", () => {
  it("devuelve un código de 12 caracteres", () => {
    expect(generarCodigoVerificacion()).toHaveLength(12);
  });

  it("no usa caracteres que se confundan al leer de un papel", () => {
    // I/1 y O/0 son EL problema de un código que alguien va a tipear mirando
    // una pantalla ajena en un mostrador de aeropuerto. Se generan muchos
    // porque un solo código podría no incluirlos por casualidad.
    const codigos = Array.from({ length: 200 }, generarCodigoVerificacion);

    for (const codigo of codigos) {
      expect(codigo).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
    }
  });

  it("no repite el código entre llamadas", () => {
    // No prueba que sea criptográficamente seguro —eso no se testea así—,
    // pero sí que no es un contador ni una constante.
    const codigos = new Set(Array.from({ length: 100 }, generarCodigoVerificacion));

    expect(codigos.size).toBe(100);
  });
});
