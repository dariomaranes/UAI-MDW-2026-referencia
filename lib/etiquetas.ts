/**
 * Cómo se le muestra a una persona lo que en la base es un enum.
 *
 * En el schema, una especie es `PERRO`. En la pantalla dice "Perro". Esa
 * traducción hay que hacerla en algún lado, y el lugar importa.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN Record Y NO UN TERNARIO
 * ---------------------------------------------------------------------------
 * Hasta la clase 8 esto estaba escrito así, en tres archivos distintos:
 *
 *   especie === "PERRO" ? "Perro" : "Gato"
 *
 * Funciona hoy, y por eso es peligroso. El día que alguien agregue `CONEJO` al
 * enum, esas tres líneas van a mostrar "Gato" para los conejos: no es que
 * fallen, es que MIENTEN EN SILENCIO. Compila, pasan los tests, y la pantalla
 * muestra un dato incorrecto.
 *
 * `Record<Especie, string>` invierte eso. TypeScript exige que el objeto tenga
 * UNA CLAVE POR CADA VALOR del enum, así que agregar `CONEJO` al schema rompe
 * la compilación acá hasta que alguien decida cómo se llama en castellano:
 *
 *   Property 'CONEJO' is missing in type ... but required in type 'Record<Especie, string>'
 *
 * Es la misma idea que el `rol` de `lib/auth.ts`: el tipo sale de
 * `@prisma/client`, no de una copia escrita a mano. Si la base cambia, el
 * código deja de compilar en vez de seguir andando mal.
 */
import type { Especie, EstadoCertificado, MotivoCertificado, Rol } from "@prisma/client";

export const NOMBRE_ESPECIE: Record<Especie, string> = {
  PERRO: "Perro",
  GATO: "Gato",
};

export const NOMBRE_ROL: Record<Rol, string> = {
  DUENO: "Dueño",
  VETERINARIO: "Veterinario",
  ADMIN: "Administrador",
};

export const NOMBRE_MOTIVO: Record<MotivoCertificado, string> = {
  VIAJE: "Viaje",
  GUARDERIA: "Guardería",
  CONCURSO: "Concurso",
  OTRO: "Otro",
};

export const NOMBRE_ESTADO_CERTIFICADO: Record<EstadoCertificado, string> = {
  SOLICITADO: "Solicitado",
  EMITIDO: "Emitido",
  ANULADO: "Anulado",
};
