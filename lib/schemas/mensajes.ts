/**
 * Los mensajes que Zod arma solo, en castellano.
 *
 * Cada validador de nuestros schemas lleva su mensaje escrito a mano. Pero hay
 * errores que ningún validador nuestro produce —que falte un campo, que llegue
 * un número donde iba un texto, un valor fuera de un enum— y esos los redacta
 * Zod en inglés y llegan tal cual al usuario, adentro del `detalles` de un 400.
 *
 * Un `errorMap` global los traduce desde un solo lugar, y no pisa nada: cuando
 * un validador tiene mensaje propio, ese gana. Este mapa entra solo cuando
 * nadie escribió algo mejor.
 *
 * Las cuatro ramas de abajo son las que este proyecto realmente produce, ni una
 * más. El resto sigue saliendo con el texto de Zod: es preferible un mensaje en
 * inglés a uno inventado que diga otra cosa.
 *
 * Este módulo NO EXPORTA NADA: se importa por su efecto, y por eso cada archivo
 * de `lib/schemas/` arranca con `import "./mensajes";`. Si alguno se olvida,
 * sus mensajes vuelven al inglés sin que nada falle.
 *
 * Ojo con esto, que es la lección: Zod 4 ya trae traducciones oficiales para
 * cuarenta idiomas —`z.config(z.locales.es())`, una línea— y están acá al lado,
 * en `node_modules/zod/v4/locales/es.js`. Este archivo existe porque el
 * proyecto usa la API 3. Antes de escribir algo a mano, siempre conviene mirar
 * si la herramienta ya lo trae.
 */
import { z } from "zod";

const TIPOS: Record<string, string> = {
  string: "un texto",
  number: "un número",
  boolean: "un valor verdadero/falso",
  date: "una fecha",
  array: "una lista",
  object: "un objeto",
};

const comoSeLlama = (tipo: string) => TIPOS[tipo] ?? `un valor de tipo ${tipo}`;

/** `"'PERRO' | 'GATO'"` → `"PERRO, GATO"`. */
const opciones = (expected: string) =>
  expected.split("|").map((o) => o.trim().replace(/'/g, "")).join(", ");

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      // De lejos, el más frecuente: el campo no vino.
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Este dato es obligatorio" };
      }
      // Un enum que recibe otro tipo llega como invalid_type, y su `expected`
      // es la lista de opciones entrecomillada. Se detecta por la comilla.
      if (issue.expected.includes("'")) {
        return { message: `Valor no válido. Las opciones son: ${opciones(issue.expected)}` };
      }
      return {
        message: `Se esperaba ${comoSeLlama(issue.expected)} y llegó ${comoSeLlama(issue.received)}`,
      };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Valor no válido. Las opciones son: ${issue.options.join(", ")}` };

    case z.ZodIssueCode.invalid_date:
      return { message: "La fecha no es válida" };

    default:
      return { message: ctx.defaultError };
  }
});
