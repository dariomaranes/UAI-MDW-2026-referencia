/**
 * Piezas de schema que usa más de una entidad.
 *
 * Viven acá y no repetidas en cada archivo por la misma razón de siempre: si
 * la misma regla está escrita en dos lugares, tarde o temprano quedan
 * distintas.
 */
import { z } from "zod";
import type { Especie as EspeciePrisma } from "@prisma/client";

/**
 * Las especies que maneja el sistema. Unión literal, nunca `string`:
 * el editor autocompleta y cualquier otro valor es un error de tipos.
 */
export const especieSchema = z.enum(["PERRO", "GATO"]);
export type Especie = z.infer<typeof especieSchema>;

/**
 * La lista de especies vive en dos lugares —acá y en el enum de
 * `schema.prisma`— porque son dos capas distintas: Prisma define qué acepta
 * la base, Zod define qué acepta la frontera de la aplicación.
 *
 * Que sean dos no es problema. Que se desincronicen sin que nadie se entere,
 * sí. Esta línea lo impide: si alguien agrega una especie en un lado y no en
 * el otro, `npm run typecheck` falla y el PR no pasa.
 *
 * `import type` se borra al compilar, así que esto no arrastra el cliente de
 * Prisma a ningún bundle.
 */
type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _especiesSincronizadas: Igual<Especie, EspeciePrisma> = true;
void _especiesSincronizadas;

/**
 * Los ids son cuid() generados por Prisma. No validamos el formato exacto
 * —eso ataría el schema a la base—, solo que venga algo.
 */
export const idSchema = (mensaje: string) => z.string().trim().min(1, mensaje);

/**
 * Fechas relativas a "ahora".
 *
 * OJO con la trampa: `z.coerce.date().max(new Date())` NO sirve acá. El
 * `new Date()` se evalúa una sola vez, cuando se construye el schema al
 * cargar el módulo, y queda congelado. Un servidor levantado hace tres días
 * rechazaría como "futura" una fecha de hoy.
 *
 * Con `.refine()` la comparación se hace en cada validación, que es lo que
 * queremos.
 */
export const fechaNoFutura = (mensaje: string) =>
  z.coerce.date().refine((fecha) => fecha <= new Date(), { message: mensaje });

export const fechaFutura = (mensaje: string) =>
  z.coerce.date().refine((fecha) => fecha > new Date(), { message: mensaje });
