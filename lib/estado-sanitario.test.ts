/**
 * Los tests de las reglas del plan de vacunación.
 *
 * Mírenlos antes que la implementación: no hay `await`, no hay base, no hay
 * variables de entorno y no hay servidor. Corren en milisegundos porque las
 * funciones que prueban son puras — si alguno de estos tests necesitara
 * levantar algo, la regla estaría en la capa equivocada.
 *
 * Fijate también en `HOY`: es una constante. Los tests de reglas que
 * dependen del tiempo solo son posibles porque la fecha entra por parámetro.
 *
 * Correr con: npm test
 */
import { describe, expect, it } from "vitest";
import {
  calcularProximaDosis,
  estadoSanitario,
  mesesCumplidos,
  primerVencimientoObligatorio,
  vacunasFaltantes,
  type AplicacionCargada,
  type VacunaDelPlan,
} from "./estado-sanitario";

/** Un martes cualquiera. Todo el archivo razona contra esta fecha. */
const HOY = new Date("2026-09-08T20:00:00Z");

function fecha(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

const antirrabica: VacunaDelPlan = {
  id: "v-antirrabica",
  nombre: "Antirrábica",
  edadMinimaMeses: 3,
  intervaloRefuerzoDias: 365,
  obligatoria: true,
};

const quintuple: VacunaDelPlan = {
  id: "v-quintuple",
  nombre: "Quíntuple",
  edadMinimaMeses: 2,
  intervaloRefuerzoDias: 365,
  obligatoria: true,
};

/** No obligatoria y de dosis única: sirve para dos casos borde distintos. */
const tosDePerreras: VacunaDelPlan = {
  id: "v-tos",
  nombre: "Tos de las perreras",
  edadMinimaMeses: 4,
  intervaloRefuerzoDias: null,
  obligatoria: false,
};

const PLAN_PERRO = [antirrabica, quintuple, tosDePerreras];

/** Nacida hace tres años: le corresponden todas las vacunas del plan. */
const ADULTA = fecha("2023-09-08");

function estadoDe(items: ReturnType<typeof estadoSanitario>, nombre: string) {
  return items.find((item) => item.nombre === nombre)?.estado;
}

describe("mesesCumplidos", () => {
  it("cuenta meses cumplidos, no aproximados", () => {
    expect(mesesCumplidos(fecha("2026-06-08"), HOY)).toBe(3);
  });

  it("no cuenta el mes que todavía no se cumplió", () => {
    // Nació un 9: el 8 del tercer mes todavía le falta un día.
    expect(mesesCumplidos(fecha("2026-06-09"), HOY)).toBe(2);
  });

  it("cuenta el mes el mismo día que se cumple", () => {
    // El caso borde de la edad mínima: hoy es el día, y hoy ya corresponde.
    expect(mesesCumplidos(fecha("2026-06-08"), HOY)).toBe(3);
  });
});

describe("estadoSanitario", () => {
  it("marca AL_DIA una vacuna aplicada cuyo refuerzo todavía no llegó", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
    ];

    const items = estadoSanitario(PLAN_PERRO, aplicaciones, ADULTA, HOY);

    expect(estadoDe(items, "Antirrábica")).toBe("AL_DIA");
  });

  it("marca PENDIENTE una vacuna que nunca se aplicó", () => {
    const items = estadoSanitario(PLAN_PERRO, [], ADULTA, HOY);

    expect(estadoDe(items, "Quíntuple")).toBe("PENDIENTE");
  });

  it("marca VENCIDA una vacuna cuyo refuerzo ya pasó", () => {
    // Nadie tocó este dato: lo venció el calendario. Es la razón por la que
    // el estado se calcula al leerlo y no se guarda en una columna.
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2025-06-01"), proximaDosis: fecha("2026-06-01") },
    ];

    const items = estadoSanitario(PLAN_PERRO, aplicaciones, ADULTA, HOY);

    expect(estadoDe(items, "Antirrábica")).toBe("VENCIDA");
  });

  it("marca NO_CORRESPONDE lo que la mascota todavía no tiene edad de recibir", () => {
    // EL CASO QUE SE OLVIDA SIEMPRE. Un cachorro de un mes no está
    // "pendiente" de la antirrábica: todavía no le toca. Sin este estado,
    // ningún cachorro podría tener un certificado nunca.
    const cachorro = fecha("2026-08-08");

    const items = estadoSanitario(PLAN_PERRO, [], cachorro, HOY);

    expect(estadoDe(items, "Antirrábica")).toBe("NO_CORRESPONDE");
    expect(estadoDe(items, "Quíntuple")).toBe("NO_CORRESPONDE");
  });

  it("una vacuna de dosis única aplicada queda AL_DIA para siempre", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-tos", fecha: fecha("2024-01-01"), proximaDosis: null },
    ];

    const items = estadoSanitario(PLAN_PERRO, aplicaciones, ADULTA, HOY);

    expect(estadoDe(items, "Tos de las perreras")).toBe("AL_DIA");
  });

  it("usa la aplicación más reciente cuando hay varias de la misma vacuna", () => {
    // El historial guarda todas las aplicaciones: la de hace tres años sigue
    // ahí y no puede ser la que decide el estado de hoy.
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2024-01-01"), proximaDosis: fecha("2025-01-01") },
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
    ];

    const items = estadoSanitario(PLAN_PERRO, aplicaciones, ADULTA, HOY);

    expect(estadoDe(items, "Antirrábica")).toBe("AL_DIA");
  });
});

describe("vacunasFaltantes", () => {
  it("devuelve el array vacío cuando las obligatorias están al día", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
      { vacunaId: "v-quintuple", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
    ];

    expect(vacunasFaltantes(PLAN_PERRO, aplicaciones, ADULTA, HOY)).toEqual([]);
  });

  it("enumera las que faltan, que es lo que pide el criterio de la H4", () => {
    const aplicaciones: AplicacionCargada[] = [
      // Vencida.
      { vacunaId: "v-antirrabica", fecha: fecha("2025-06-01"), proximaDosis: fecha("2026-06-01") },
      // Y la quíntuple nunca se aplicó.
    ];

    expect(vacunasFaltantes(PLAN_PERRO, aplicaciones, ADULTA, HOY)).toEqual([
      "Antirrábica",
      "Quíntuple",
    ]);
  });

  it("no cuenta las vacunas que no son obligatorias", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
      { vacunaId: "v-quintuple", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
    ];

    // La tos de las perreras está pendiente y no aparece: no bloquea nada.
    expect(vacunasFaltantes(PLAN_PERRO, aplicaciones, ADULTA, HOY)).toEqual([]);
  });

  it("no le reclama a un cachorro las vacunas que todavía no le tocan", () => {
    // El mismo caso borde que arriba, ahora en la regla que bloquea el
    // certificado: si esto fallara, ningún cachorro podría viajar nunca.
    const cachorro = fecha("2026-08-08");

    expect(vacunasFaltantes(PLAN_PERRO, [], cachorro, HOY)).toEqual([]);
  });
});

describe("primerVencimientoObligatorio", () => {
  it("devuelve la más próxima de las obligatorias al día", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
      { vacunaId: "v-quintuple", fecha: fecha("2026-05-01"), proximaDosis: fecha("2027-05-01") },
    ];

    expect(
      primerVencimientoObligatorio(PLAN_PERRO, aplicaciones, ADULTA, HOY),
    ).toEqual(fecha("2027-05-01"));
  });

  it("ignora las no obligatorias aunque venzan antes", () => {
    const aplicaciones: AplicacionCargada[] = [
      { vacunaId: "v-antirrabica", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
      { vacunaId: "v-quintuple", fecha: fecha("2026-08-01"), proximaDosis: fecha("2027-08-01") },
      { vacunaId: "v-tos", fecha: fecha("2026-08-01"), proximaDosis: fecha("2026-10-01") },
    ];

    expect(
      primerVencimientoObligatorio(PLAN_PERRO, aplicaciones, ADULTA, HOY),
    ).toEqual(fecha("2027-08-01"));
  });

  it("devuelve null cuando ninguna obligatoria al día tiene refuerzo", () => {
    // Sin fecha de vencimiento por vacunas, el certificado usa el tope de 30
    // días. Ese `null` es el que `calcularVencimiento` viene esperando desde
    // la clase 4.
    expect(primerVencimientoObligatorio(PLAN_PERRO, [], ADULTA, HOY)).toBeNull();
  });
});

describe("calcularProximaDosis", () => {
  it("suma el intervalo de refuerzo a la fecha de aplicación", () => {
    expect(calcularProximaDosis(fecha("2026-09-08"), 365)).toEqual(
      fecha("2027-09-08"),
    );
  });

  it("devuelve null cuando la vacuna es de dosis única", () => {
    // `null` acá es información, no un dato faltante: esta vacuna no se
    // repite. Por eso no es un 0, que habría que interpretar.
    expect(calcularProximaDosis(fecha("2026-09-08"), null)).toBeNull();
  });
});
