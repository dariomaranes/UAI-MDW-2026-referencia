/**
 * Schemas de la entidad Certificado.
 *
 * Sale de las historias H4, H5 y H6 de `docs/spec.md`. Es el flujo principal
 * del sistema: tiene estados que cambian, y por eso el estado se modela como
 * unión literal y no como texto libre.
 */
// Traduce al castellano los mensajes que arma Zod solo. Se importa por su
// efecto, no exporta nada: sin esta línea, "Required" llega al usuario.
import "./mensajes";
import { z } from "zod";
import { idSchema } from "./comunes";

/**
 * Los tres estados que se GUARDAN, y no hay un cuarto. Con `string` alguien
 * escribiría "emitido", "Emitido" y "EMITIDO" y serían tres estados distintos.
 *
 * En la clase 2 este enum tenía además VENCIDO, y estaba mal: un certificado
 * se vence solo, el día que pasa su fecha, sin que nadie toque el sistema.
 * Guardarlo como estado obligaría a un proceso que recorra la tabla
 * corrigiéndolo, y hasta que ese proceso corra la columna estaría mintiendo.
 *
 * La regla que lo decide: si el dato puede cambiar sin que nadie toque el
 * sistema, se calcula; si es un acto que alguien realizó, se guarda.
 * Solicitar, emitir y anular son actos. Vencer, no.
 */
export const estadoCertificadoSchema = z.enum([
  "SOLICITADO",
  "EMITIDO",
  "ANULADO",
]);

export type EstadoCertificado = z.infer<typeof estadoCertificadoSchema>;

/**
 * Lo que ve un tercero en la página pública (H6). Es lo que el estado
 * guardado y la fecha de vencimiento dicen JUNTOS, y se calcula al leer.
 */
export type VigenciaCertificado = "VIGENTE" | "VENCIDO" | "ANULADO" | "PENDIENTE";

export function calcularVigencia(certificado: {
  estado: EstadoCertificado;
  vencimiento: Date | null;
}): VigenciaCertificado {
  if (certificado.estado === "ANULADO") return "ANULADO";
  if (certificado.estado === "SOLICITADO") return "PENDIENTE";
  // Emitido: vigente o vencido según el reloj, no según la base.
  if (certificado.vencimiento !== null && certificado.vencimiento <= new Date()) {
    return "VENCIDO";
  }
  return "VIGENTE";
}

/** Para qué se pide el certificado. Cambia qué vacunas exige el destino. */
export const motivoCertificadoSchema = z.enum([
  "VIAJE",
  "GUARDERIA",
  "CONCURSO",
  "OTRO",
]);

export const solicitarCertificadoSchema = z.object({
  mascotaId: idSchema("Falta indicar la mascota"),
  motivo: motivoCertificadoSchema,
  detalle: z
    .string()
    .trim()
    .max(200, "El detalle no puede superar los 200 caracteres")
    .optional(),
});

export type SolicitarCertificadoInput = z.infer<typeof solicitarCertificadoSchema>;

/**
 * El código que verifica un tercero sin cuenta (H6).
 *
 * Es público, así que tiene que ser IMPOSIBLE DE ADIVINAR: 12 caracteres
 * alfanuméricos en mayúscula. Un id autoincremental no serviría — con
 * probar 1, 2, 3 se listarían todos los certificados del sistema.
 */
export const codigoVerificacionSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{12}$/, "El código son 12 caracteres alfanuméricos");

export type CodigoVerificacion = z.infer<typeof codigoVerificacionSchema>;
