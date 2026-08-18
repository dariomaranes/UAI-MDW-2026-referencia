/**
 * Schemas de la entidad Certificado.
 *
 * Sale de las historias H4, H5 y H6 de `docs/spec.md`. Es el flujo principal
 * del sistema: tiene estados que cambian, y por eso el estado se modela como
 * unión literal y no como texto libre.
 */
import { z } from "zod";
import { idSchema } from "./comunes";

/**
 * Los cuatro estados posibles, y no hay un quinto. Con `string` alguien
 * escribiría "emitido", "Emitido" y "EMITIDO" y serían tres estados distintos.
 */
export const estadoCertificadoSchema = z.enum([
  "SOLICITADO",
  "EMITIDO",
  "VENCIDO",
  "ANULADO",
]);

export type EstadoCertificado = z.infer<typeof estadoCertificadoSchema>;

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
