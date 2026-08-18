/**
 * Schemas de la entidad Mascota.
 *
 * Sale de la historia H1 de `docs/spec.md`. Cada límite de acá contesta una
 * pregunta que alguien tuvo que decidir: no son números puestos al azar.
 */
import { z } from "zod";
import { especieSchema, fechaNoFutura } from "./comunes";

export const crearMascotaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre necesita al menos 2 caracteres")
    .max(60, "El nombre no puede superar los 60 caracteres"),

  especie: especieSchema,

  // Regla de negocio: una mascota no puede haber nacido en el futuro.
  fechaNacimiento: fechaNoFutura("La fecha de nacimiento no puede ser futura"),

  // El chip es opcional —hay mascotas sin chipear— pero si viene, es un
  // microchip ISO: exactamente 15 dígitos.
  chip: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "El chip son 15 dígitos, sin espacios ni guiones")
    .optional(),
});

export type CrearMascotaInput = z.infer<typeof crearMascotaSchema>;

/**
 * Para editar no hace falta mandar todos los campos: `.partial()` deriva un
 * schema con todo opcional a partir del anterior. Una definición, dos usos.
 */
export const actualizarMascotaSchema = crearMascotaSchema.partial();

export type ActualizarMascotaInput = z.infer<typeof actualizarMascotaSchema>;
