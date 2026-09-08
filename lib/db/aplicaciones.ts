/**
 * Acceso a datos de la entidad Aplicacion: el historial sanitario.
 *
 * Una aplicación es un HECHO que ocurrió —esta vacuna, a esta mascota, este
 * día, aplicada por este veterinario— y por eso nunca se corrige ni se borra:
 * la libreta existe para conservarlo.
 */
import { prisma } from "@/lib/db/client";
import type { RegistrarAplicacionInput } from "@/lib/schemas/aplicacion";

const LIMITE_POR_DEFECTO = 50;

/**
 * El historial de una mascota, para mostrarlo (H2 y H3).
 *
 * Es más rico que el `select` de `datosDelEstadoSanitario`, y son dos
 * consultas distintas a propósito: esta la lee una persona —quiere el nombre
 * de la vacuna y el del profesional—, la otra la lee una función que solo
 * necesita tres campos. Un solo `select` "que sirva para todo" termina
 * trayendo de más para un caso y de menos para el otro.
 */
export async function listarAplicacionesDeMascota(
  mascotaId: string,
  limite: number = LIMITE_POR_DEFECTO,
) {
  return prisma.aplicacion.findMany({
    where: { mascotaId },
    take: limite,
    orderBy: { fecha: "desc" },
    select: {
      id: true,
      fecha: true,
      proximaDosis: true,
      observaciones: true,
      vacuna: { select: { id: true, nombre: true, obligatoria: true } },
      // El nombre del profesional, no su email: quien mira el historial de su
      // mascota no necesita el dato de contacto de nadie.
      veterinario: { select: { id: true, nombre: true } },
    },
  });
}

/**
 * Registra una aplicación.
 *
 * Los tres datos que NO salen del body van por parámetro, y es el mismo
 * patrón de `crearMascota` con su `duenoId`:
 *
 *   - `mascotaId` sale de la URL, no del body.
 *   - `veterinarioId` sale de la sesión (clase 6), nunca del cliente: si
 *     viniera en el body, cualquiera podría firmar una vacuna con el nombre
 *     de otro profesional.
 *   - `proximaDosis` la calcula el servidor con el plan de la vacuna. Es un
 *     dato derivado y por eso dejó de ser un campo de entrada en la clase 5.
 */
export async function registrarAplicacion(
  datos: RegistrarAplicacionInput,
  veterinarioId: string,
  proximaDosis: Date | null,
) {
  return prisma.aplicacion.create({
    data: {
      mascotaId: datos.mascotaId,
      vacunaId: datos.vacunaId,
      fecha: datos.fecha,
      observaciones: datos.observaciones,
      veterinarioId,
      proximaDosis,
    },
    select: {
      id: true,
      fecha: true,
      proximaDosis: true,
      observaciones: true,
      vacuna: { select: { id: true, nombre: true } },
      veterinario: { select: { id: true, nombre: true } },
    },
  });
}
