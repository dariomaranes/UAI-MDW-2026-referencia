/**
 * Schemas de la entidad Aplicacion: que ESTA vacuna se le dio a ESTA mascota
 * ESTE día.
 *
 * Sale de la historia H2 de `docs/spec.md`, y cada regla de acá es un criterio
 * de aceptación de esa historia convertido en código. Ese es el recorrido
 * completo de la clase 2: spec → tipo → validación.
 */
import { z } from "zod";
import { fechaFutura, fechaNoFutura, idSchema } from "./comunes";

export const registrarAplicacionSchema = z
  .object({
    mascotaId: idSchema("Falta indicar la mascota"),
    vacunaId: idSchema("Falta indicar la vacuna"),

    // Registrar una aplicación es anotar algo que YA pasó.
    fecha: fechaNoFutura("Una vacuna no se puede aplicar en el futuro"),

    // Y el refuerzo todavía no llegó: la regla opuesta, en el mismo
    // formulario. Es opcional porque hay vacunas de dosis única.
    proximaDosis: fechaFutura("El refuerzo tiene que ser posterior a hoy").optional(),

    observaciones: z
      .string()
      .trim()
      .max(500, "Las observaciones no pueden superar los 500 caracteres")
      .optional(),
  })
  // Una regla que mira DOS campos a la vez no se puede escribir en un campo
  // suelto: va en el objeto. Esto se desarrolla en la clase 5.
  .refine(
    (aplicacion) =>
      aplicacion.proximaDosis === undefined || aplicacion.proximaDosis > aplicacion.fecha,
    {
      message: "La próxima dosis tiene que ser posterior a la fecha de aplicación",
      path: ["proximaDosis"],
    },
  );

export type RegistrarAplicacionInput = z.infer<typeof registrarAplicacionSchema>;
