/**
 * Schemas de la entidad Vacuna.
 *
 * Vacuna es el CATÁLOGO: qué vacunas existen y cómo funciona cada una. No es
 * lo que se le dio a una mascota —eso es Aplicacion—. Distinguir esas dos
 * cosas es la decisión de modelado más importante de este dominio.
 *
 * De acá sale el "plan de vacunación": con la especie, la edad mínima y el
 * intervalo de refuerzo, el sistema puede calcular solo qué le falta a cada
 * mascota.
 */
import { z } from "zod";
import { especieSchema } from "./comunes";

export const crearVacunaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre necesita al menos 3 caracteres")
    .max(80, "El nombre no puede superar los 80 caracteres"),

  especie: especieSchema,

  // A partir de qué edad se puede aplicar. 0 = desde el nacimiento.
  // El tope de 240 meses (20 años) no es un capricho: evita que un error de
  // tipeo cargue una vacuna que ninguna mascota va a alcanzar nunca.
  edadMinimaMeses: z
    .number()
    .int("La edad mínima se expresa en meses enteros")
    .min(0, "La edad mínima no puede ser negativa")
    .max(240, "La edad mínima no puede superar los 240 meses"),

  // Cada cuánto se repite. Si no viene, la vacuna NO tiene refuerzo:
  // es dosis única. Por eso es opcional y no un 0.
  intervaloRefuerzoDias: z
    .number()
    .int("El intervalo se expresa en días enteros")
    .positive("El intervalo tiene que ser mayor a cero")
    .optional(),

  // Si es obligatoria, su falta bloquea la emisión de un certificado.
  obligatoria: z.boolean(),
});

export type CrearVacunaInput = z.infer<typeof crearVacunaSchema>;
