/**
 * Schemas de la entidad Veterinaria: la clínica donde atiende un veterinario.
 *
 * Existe para sostener la relación N-N del modelo —un veterinario atiende en
 * varias veterinarias y una veterinaria tiene varios veterinarios—, que es uno
 * de los requisitos del núcleo obligatorio del proyecto.
 */
import { z } from "zod";

export const crearVeterinariaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "El nombre necesita al menos 3 caracteres")
    .max(80, "El nombre no puede superar los 80 caracteres"),

  direccion: z
    .string()
    .trim()
    .min(5, "La dirección necesita al menos 5 caracteres")
    .max(160, "La dirección no puede superar los 160 caracteres"),

  // Opcional a propósito: hay clínicas que solo atienden por WhatsApp y no
  // publican un fijo. Si fuera obligatorio, no podrían cargarse.
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, "El teléfono tiene un formato inválido")
    .optional(),
});

export type CrearVeterinariaInput = z.infer<typeof crearVeterinariaSchema>;
