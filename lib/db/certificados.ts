/**
 * Acceso a datos de la entidad Certificado.
 *
 * Acá vive la parte del dominio que NO es un ABM: solicitar, emitir y anular
 * son actos que alguien realiza, con reglas y permisos propios. Por eso cada
 * uno tiene su función y no son un `update` genérico del campo `estado`.
 */
import { prisma } from "@/lib/db/client";
import type { SolicitarCertificadoInput } from "@/lib/schemas/certificado";

const LIMITE_POR_DEFECTO = 50;

/**
 * Los campos que se devuelven de un certificado en las pantallas propias.
 *
 * Escrito una vez y reutilizado: si mañana hay que agregar un campo, se
 * agrega acá y no en cuatro consultas que fueron divergiendo.
 */
const CAMPOS_CERTIFICADO = {
  id: true,
  estado: true,
  motivo: true,
  detalle: true,
  solicitadoEn: true,
  emitidoEn: true,
  vencimiento: true,
  codigoVerificacion: true,
  mascota: { select: { id: true, nombre: true, especie: true } },
} as const;

/** Los certificados de las mascotas de un dueño. */
export async function listarCertificadosDeDueno(
  duenoId: string,
  limite: number = LIMITE_POR_DEFECTO,
) {
  return prisma.certificado.findMany({
    // El filtro atraviesa la relación: certificados cuya mascota es de este
    // dueño. Una consulta, no traer las mascotas y después iterar.
    where: { mascota: { duenoId } },
    take: limite,
    orderBy: { solicitadoEn: "desc" },
    select: CAMPOS_CERTIFICADO,
  });
}

export async function obtenerCertificado(id: string) {
  return prisma.certificado.findUnique({
    where: { id },
    select: CAMPOS_CERTIFICADO,
  });
}

/**
 * Solicita un certificado para una mascota del dueño.
 *
 * El `duenoId` viaja hasta el WHERE de la verificación: nadie pide un
 * certificado para la mascota de otro. Devuelve `null` si la mascota no es
 * suya o no existe, y el handler lo traduce a 404.
 */
export async function solicitarCertificado(
  datos: SolicitarCertificadoInput,
  duenoId: string,
) {
  const mascota = await prisma.mascota.findFirst({
    where: { id: datos.mascotaId, duenoId },
    select: { id: true },
  });

  if (!mascota) return null;

  // Nace en estado SOLICITADO —es el default del schema— y sin código ni
  // vencimiento: esos dos se asignan recién al emitir.
  return prisma.certificado.create({
    data: {
      mascotaId: datos.mascotaId,
      motivo: datos.motivo,
      detalle: datos.detalle,
    },
    select: CAMPOS_CERTIFICADO,
  });
}

/**
 * Emite un certificado solicitado.
 *
 * Esto es lo que un `PATCH { "estado": "EMITIDO" }` no puede hacer: no
 * escribe un campo, ejecuta una operación. Asigna el código, congela el
 * vencimiento y guarda quién lo emitió, todo junto o nada.
 *
 * El WHERE lleva `estado: "SOLICITADO"`: un certificado ya emitido no matchea
 * y `count` vuelve en 0. La transición válida está en la consulta, no en un
 * `if` que alguien puede olvidarse de escribir en el segundo lugar donde se
 * emite.
 */
export async function emitirCertificado(
  id: string,
  emisorId: string,
  codigoVerificacion: string,
  vencimiento: Date,
) {
  const { count } = await prisma.certificado.updateMany({
    where: { id, estado: "SOLICITADO" },
    data: {
      estado: "EMITIDO",
      emisorId,
      codigoVerificacion,
      vencimiento,
      emitidoEn: new Date(),
    },
  });

  if (count === 0) return null;

  return obtenerCertificado(id);
}

/**
 * Anula un certificado emitido.
 *
 * El `emisorId` va en el WHERE porque es una regla de negocio de la spec:
 * solo el veterinario que lo emitió puede anularlo. Otro veterinario no
 * matchea, aunque tenga el rol correcto.
 */
export async function anularCertificado(id: string, emisorId: string) {
  const { count } = await prisma.certificado.updateMany({
    where: { id, estado: "EMITIDO", emisorId },
    data: { estado: "ANULADO", anuladoEn: new Date() },
  });

  if (count === 0) return null;

  return obtenerCertificado(id);
}

/**
 * La consulta de la verificación pública (H6).
 *
 * Está separada de las demás A PROPÓSITO, y el `select` de acá es una medida
 * de seguridad, no una optimización: esta respuesta la lee un tercero sin
 * cuenta. Sale la mascota, las fechas y el estado. NO sale el dueño, ni su
 * email, ni el detalle del motivo, ni el id interno del certificado.
 *
 * Reusar `CAMPOS_CERTIFICADO` acá sería el bug: el día que alguien le agregue
 * un campo para las pantallas propias, ese campo se publicaría en internet
 * sin que nadie lo decida.
 */
export async function verificarCertificado(codigoVerificacion: string) {
  return prisma.certificado.findUnique({
    where: { codigoVerificacion },
    select: {
      estado: true,
      emitidoEn: true,
      vencimiento: true,
      mascota: { select: { nombre: true, especie: true } },
    },
  });
}
