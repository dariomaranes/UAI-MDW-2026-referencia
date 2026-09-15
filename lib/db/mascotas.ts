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
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type {
  ActualizarMascotaInput,
  CrearMascotaInput,
} from "@/lib/schemas/mascota";

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
 * Las mascotas que este veterinario atendió: SUS PACIENTES.
 *
 * Es la contraparte de `listarMascotasDeDueno` para el otro rol. Un
 * veterinario no tiene mascotas propias, así que "las mías" para él significa
 * otra cosa: aquellas a las que alguna vez le aplicó una vacuna.
 *
 * El filtro atraviesa la relación con `some`: mascotas que tengan AL MENOS UNA
 * aplicación hecha por este veterinario. Sigue siendo una sola consulta, y
 * sigue llevando el id de la sesión adentro del WHERE, que es la regla de la
 * clase 6.
 *
 * Fijate que este vínculo no estaba modelado en ningún lado: no hay una
 * columna "veterinarioId" en Mascota ni una tabla de pacientes. Sale de los
 * hechos que ya se registraron, que es justamente lo que permite un modelo
 * bien relacionado.
 */
export async function listarMascotasAtendidasPor(
  veterinarioId: string,
  limite: number = LIMITE_POR_DEFECTO,
) {
  return prisma.mascota.findMany({
    where: { aplicaciones: { some: { veterinarioId } } },
    take: limite,
    orderBy: { creadaEn: "desc" },
    select: {
      id: true,
      nombre: true,
      especie: true,
      fechaNacimiento: true,
      // Al veterinario sí le corresponde saber de quién es cada paciente:
      // lo necesita para identificar al animal en la consulta.
      dueno: { select: { id: true, nombre: true } },
    },
  });
}

/**
 * Todas las mascotas del sistema, con su dueño.
 *
 * NO la usen para las pantallas del dueño ni para las del veterinario: cada
 * uno tiene la suya, filtrada por el id de la sesión. Esta no filtra nada, así
 * que solo puede vivir detrás de un rol que tenga derecho a ver todo.
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

/**
 * La mascota tal como la puede ver este usuario, según su rol.
 *
 * Es la única consulta del proyecto que a veces NO lleva el id de la sesión
 * en el WHERE, y la excepción es deliberada: un veterinario atiende animales
 * de cualquier dueño, así que filtrar por `duenoId` lo dejaría sin ver a
 * ninguno de sus pacientes. El permiso ya se verificó antes con
 * `requerirUsuario`; lo que decide acá el rol es QUÉ CONSULTA se hace, no si
 * se chequea después.
 *
 * Para el dueño, en cambio, sigue valiendo la regla de siempre: la mascota
 * del vecino no existe.
 */
export async function obtenerMascotaVisiblePara(
  id: string,
  usuarioId: string,
  rol: Rol,
) {
  if (rol === "DUENO") return obtenerMascotaDeDueno(id, usuarioId);

  return obtenerMascota(id);
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

/**
 * Una mascota concreta, verificando de paso que sea de quien la pide.
 *
 * El `duenoId` va en el WHERE, no en un `if` posterior: si la mascota es del
 * vecino, esta consulta devuelve `null` igual que si no existiera. Eso es
 * deliberado y es la decisión de `docs/api.md`: para este dueño, la mascota
 * del vecino NO existe. Responder 403 confirmaría que existe.
 */
export async function obtenerMascotaDeDueno(id: string, duenoId: string) {
  return prisma.mascota.findFirst({
    where: { id, duenoId },
    select: {
      id: true,
      nombre: true,
      especie: true,
      fechaNacimiento: true,
      chip: true,
      creadaEn: true,
    },
  });
}

/**
 * Corrige datos de una mascota del dueño.
 *
 * `updateMany` en vez de `update` por una razón concreta: `update` exige un
 * WHERE único —el id— y el dueño habría que chequearlo aparte. Con
 * `updateMany` los dos van juntos en el WHERE, así que una mascota ajena
 * simplemente no matchea y `count` vuelve en 0. No hay forma de olvidarse
 * el chequeo, porque es la misma consulta.
 *
 * Devuelve `null` cuando no se actualizó nada: el handler lo traduce a 404.
 */
export async function actualizarMascota(
  id: string,
  datos: ActualizarMascotaInput,
  duenoId: string,
) {
  const { count } = await prisma.mascota.updateMany({
    where: { id, duenoId },
    data: datos,
  });

  if (count === 0) return null;

  return obtenerMascotaDeDueno(id, duenoId);
}

/**
 * ¿Esta mascota tiene historial cargado?
 *
 * La spec dice que una mascota con aplicaciones o certificados no se borra:
 * la libreta existe para conservar historial. El `onDelete: Restrict` del
 * schema ya lo impide a nivel base, pero preguntarlo antes permite responder
 * un 409 con sentido en vez de dejar que Postgres tire un error de foreign
 * key que nadie atiende y termine en 500.
 *
 * Las dos cosas conviven: la verificación da el buen mensaje, la restricción
 * de la base es la garantía. Una regla de negocio que solo vive en el código
 * se saltea el día que alguien escribe un script.
 */
export async function mascotaTieneHistorial(id: string) {
  const [aplicaciones, certificados] = await Promise.all([
    prisma.aplicacion.count({ where: { mascotaId: id } }),
    prisma.certificado.count({ where: { mascotaId: id } }),
  ]);

  return aplicaciones + certificados > 0;
}

/** Borra una mascota del dueño. `false` si no era suya o no existe → 404. */
export async function borrarMascota(id: string, duenoId: string) {
  const { count } = await prisma.mascota.deleteMany({ where: { id, duenoId } });
  return count > 0;
}
