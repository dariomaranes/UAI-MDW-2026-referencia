/**
 * Schemas de la entidad Aplicacion: que ESTA vacuna se le dio a ESTA mascota
 * ESTE día.
 *
 * Sale de la historia H2 de `docs/spec.md`, y cada regla de acá es un criterio
 * de aceptación de esa historia convertido en código. Ese es el recorrido
 * completo de la clase 2: spec → tipo → validación.
 *
 * ---------------------------------------------------------------------------
 * QUÉ CAMBIÓ EN LA CLASE 5, Y POR QUÉ
 * ---------------------------------------------------------------------------
 * Este schema tenía un campo `proximaDosis` que el cliente mandaba en el
 * body, con una regla de dos campos —"el refuerzo tiene que ser posterior a
 * la aplicación"— escrita con un `.refine()` sobre el objeto.
 *
 * Al modelar el catálogo (clase 3) apareció `intervaloRefuerzoDias`, y con él
 * la respuesta correcta: la próxima dosis NO es un dato de entrada, es un
 * dato DERIVADO. La H2 lo venía diciendo desde el principio —"el sistema
 * calcula la fecha de la próxima dosis y la muestra"— y el schema pedía que
 * la calculara el cliente.
 *
 * Es la misma regla que el `duenoId` de la clase 4, una vuelta más arriba:
 * **el cliente no manda lo que el servidor sabe.** Un campo derivado que
 * llega del body es un campo que alguien puede mandar mal a propósito. Hoy
 * lo calcula `calcularProximaDosis` en `lib/estado-sanitario.ts`, con el plan
 * de la vacuna, y el `.refine()` de dos campos se volvió innecesario: si el
 * servidor suma días a la fecha de aplicación, el resultado es posterior por
 * construcción.
 *
 * Y una regla de la H2 que sigue sin estar acá, a propósito: "la mascota
 * tiene que alcanzar la edad mínima de esa vacuna". Esa NO la puede chequear
 * un schema, porque necesita la fecha de nacimiento de la mascota y la edad
 * mínima del catálogo — dos consultas. Es una regla de negocio, vive en
 * `lib/estado-sanitario.ts` y se responde con 409, no con 400.
 */
// Traduce al castellano los mensajes que arma Zod solo. Se importa por su
// efecto, no exporta nada: sin esta línea, "Required" llega al usuario.
import "./mensajes";
import { z } from "zod";
import { fechaNoFutura, idSchema } from "./comunes";

export const registrarAplicacionSchema = z.object({
  // Llega por la URL —`/api/mascotas/:id/aplicaciones`— y el handler lo
  // inyecta antes de validar. Está en el schema porque es parte del dato que
  // se guarda; no está en el body porque la ruta ya lo dice.
  mascotaId: idSchema("Falta indicar la mascota"),

  vacunaId: idSchema("Falta indicar la vacuna"),

  // Registrar una aplicación es anotar algo que YA pasó. Esta regla de
  // negocio sí es de Zod: se decide mirando el body y el calendario, sin
  // preguntarle nada al sistema.
  fecha: fechaNoFutura("Una vacuna no se puede aplicar en el futuro"),

  observaciones: z
    .string()
    .trim()
    .max(500, "Las observaciones no pueden superar los 500 caracteres")
    .optional(),
});

export type RegistrarAplicacionInput = z.infer<typeof registrarAplicacionSchema>;
