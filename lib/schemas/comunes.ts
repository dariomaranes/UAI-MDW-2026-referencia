/**
 * Piezas de schema que usa más de una entidad.
 *
 * Viven acá y no repetidas en cada archivo por la misma razón de siempre: si
 * la misma regla está escrita en dos lugares, tarde o temprano quedan
 * distintas.
 */
import { z } from "zod";

/**
 * Las especies que maneja el sistema. Unión literal, nunca `string`:
 * el editor autocompleta y cualquier otro valor es un error de tipos.
 */
export const especieSchema = z.enum(["PERRO", "GATO"]);
export type Especie = z.infer<typeof especieSchema>;

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
