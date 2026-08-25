/**
 * Acceso a datos de la entidad Mascota.
 *
 * Este archivo es el patrón que sigue todo el proyecto: ningún componente ni
 * Route Handler habla con Prisma directamente, todos pasan por un módulo de
 * `lib/db/`.
 *
 * Por qué: si mañana cambia la consulta, se cambia en un solo lugar; y cuando
 * algo anda lento, se sabe exactamente dónde mirar.
 */
import { prisma } from "@/lib/db/client";
import type { CrearMascotaInput } from "@/lib/schemas/mascota";

const LIMITE_POR_DEFECTO = 50;

/**
 * Las mascotas de un dueño. Es la consulta de la H1: "dado que el sistema
 * tiene mascotas de varios dueños, cuando uno entra a su listado, entonces ve
 * SOLO las suyas".
 *
 * El filtro por `duenoId` no es una comodidad de la pantalla: es la regla de
 * negocio, y por eso vive acá y no en el componente. El índice `@@index
 * ([duenoId])` del schema existe exactamente para esta consulta.
 */
export async function listarMascotasDeDueno(
  duenoId: string,
  limite: number = LIMITE_POR_DEFECTO,
) {
  // Toda consulta que devuelve listas lleva límite explícito.
  return prisma.mascota.findMany({
    where: { duenoId },
    take: limite,
    orderBy: { creadaEn: "desc" },
    select: {
      id: true,
      nombre: true,
      especie: true,
      fechaNacimiento: true,
      chip: true,
    },
  });
}

/**
 * Todas las mascotas del sistema, con su dueño.
 *
 * Vista de administración: NO la usen para las pantallas del dueño, que
 * tienen que filtrar. En la clase 6, cuando haya sesión y roles, esta consulta
 * queda restringida al rol ADMIN.
 *
 * El `select` anidado del dueño resuelve la relación en UNA consulta. Traer
 * las mascotas y después pedir el dueño de cada una en un bucle serían N+1
 * consultas, que es el error de performance más común con un ORM.
 */
export async function listarMascotas(limite: number = LIMITE_POR_DEFECTO) {
  return prisma.mascota.findMany({
    take: limite,
    orderBy: { creadaEn: "desc" },
    select: {
      id: true,
      nombre: true,
      especie: true,
      fechaNacimiento: true,
      dueno: { select: { id: true, nombre: true } },
    },
  });
}

export async function obtenerMascota(id: string) {
  return prisma.mascota.findUnique({ where: { id } });
}

export async function crearMascota(datos: CrearMascotaInput, duenoId: string) {
  // `duenoId` se recibe por parámetro y sale de la sesión del servidor,
  // nunca del body del request: el cliente no decide de quién es la mascota.
  return prisma.mascota.create({
    data: { ...datos, duenoId },
  });
}
