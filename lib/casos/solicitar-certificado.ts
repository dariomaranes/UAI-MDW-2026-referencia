/**
 * El caso de uso "solicitar un certificado" (H4), una sola vez.
 *
 * Mismo motivo que `registrar-aplicacion.ts`: hasta la clase 12 estas reglas
 * vivían adentro de `POST /api/certificados`, y hoy aparece la segunda puerta
 * —el pedido desde la ficha de la mascota—. Dos puertas con la regla copiada
 * son dos reglas, y la primera vez que cambie una la otra va a quedar vieja.
 *
 * Como el otro caso de uso, no sabe que existe HTTP ni que existen los
 * formularios: devuelve un `motivo` de un conjunto cerrado y cada puerta
 * traduce.
 *
 *   el Route Handler   motivo → status code   (404, 409)
 *   la Server Action   motivo → mensaje arriba del formulario
 *
 * ---------------------------------------------------------------------------
 * EL RECHAZO TRAE DATOS, NO SOLO UN MENSAJE
 * ---------------------------------------------------------------------------
 * Dos de los tres rechazos llevan algo más que el texto, porque la spec lo
 * pide: la H4 dice que el sistema ENUMERA las vacunas que faltan, y que
 * informa CUÁL es la solicitud que ya está esperando. Por eso el resultado es
 * una unión con un caso por motivo, y TypeScript no deja leer `faltantes`
 * sin haber preguntado antes si el motivo era `VACUNAS_FALTANTES`.
 */
import {
  solicitarCertificado,
  solicitudPendiente,
} from "@/lib/db/certificados";
import { obtenerMascotaDeDueno } from "@/lib/db/mascotas";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import { vacunasFaltantes } from "@/lib/estado-sanitario";
import type { SolicitarCertificadoInput } from "@/lib/schemas/certificado";

type CertificadoSolicitado = NonNullable<
  Awaited<ReturnType<typeof solicitarCertificado>>
>;

export type MotivoDeRechazoSolicitud =
  | "MASCOTA_NO_ENCONTRADA"
  | "SOLICITUD_PENDIENTE"
  | "VACUNAS_FALTANTES";

export type ResultadoSolicitud =
  | { ok: true; certificado: CertificadoSolicitado }
  | { ok: false; motivo: "MASCOTA_NO_ENCONTRADA"; mensaje: string }
  | {
      ok: false;
      motivo: "SOLICITUD_PENDIENTE";
      mensaje: string;
      solicitudPendienteId: string;
    }
  | {
      ok: false;
      motivo: "VACUNAS_FALTANTES";
      mensaje: string;
      faltantes: string[];
    };

export async function solicitarCertificadoDeMascota(
  datos: SolicitarCertificadoInput,
  duenoId: string,
): Promise<ResultadoSolicitud> {
  // La mascota se busca ANTES de las reglas porque las reglas la necesitan:
  // sin su especie y su fecha de nacimiento no hay plan de vacunación que
  // evaluar. Y de paso resuelve la pertenencia — el `duenoId` va en el WHERE,
  // así que la mascota del vecino no existe para este dueño.
  const mascota = await obtenerMascotaDeDueno(datos.mascotaId, duenoId);

  if (!mascota) {
    return {
      ok: false,
      motivo: "MASCOTA_NO_ENCONTRADA",
      mensaje: "Mascota no encontrada",
    };
  }

  // La primera regla es la más barata y la más específica: si ya pidió esto
  // mismo y todavía está esperando, no hace falta evaluar nada más. Sale del
  // ADR 0002 — apareció probando la API, no de una historia original, y por
  // eso primero se escribió en la spec.
  const pendiente = await solicitudPendiente(mascota.id, datos.motivo);

  if (pendiente) {
    return {
      ok: false,
      motivo: "SOLICITUD_PENDIENTE",
      mensaje: `Ya hay una solicitud pendiente de emisión para ${mascota.nombre} con ese motivo`,
      // El id, para que la pantalla pueda llevar al dueño hasta ella en vez
      // de dejarlo adivinando cuál de todas era.
      solicitudPendienteId: pendiente.id,
    };
  }

  // La segunda es la de la clase 5. Tres líneas y ningún `if` con fechas
  // adentro: leer, preguntar, traducir. Todo el razonamiento —qué vacuna
  // corresponde a esta edad, cuál venció, cuál nunca se aplicó— está en
  // `lib/estado-sanitario.ts`, que se prueba con `npm test` sin levantar nada.
  const { plan, aplicaciones } = await datosDelEstadoSanitario(
    mascota.especie,
    mascota.id,
  );

  const faltantes = vacunasFaltantes(
    plan,
    aplicaciones,
    mascota.fechaNacimiento,
    new Date(),
  );

  if (faltantes.length > 0) {
    // `faltantes` va en su propio campo, no embutido en el mensaje: el
    // criterio de aceptación de la H4 pide ENUMERAR cuáles faltan, así que ese
    // array es el criterio, no un adorno. El mensaje es para la persona; el
    // array, para la pantalla o el programa que lo va a mostrar.
    return {
      ok: false,
      motivo: "VACUNAS_FALTANTES",
      mensaje: "La mascota no está al día con las vacunas obligatorias",
      faltantes,
    };
  }

  const certificado = await solicitarCertificado(datos, duenoId);

  // Ya se verificó la pertenencia arriba; esto solo puede pasar si la mascota
  // se borró en el medio. Se responde lo mismo que si no existiera.
  if (!certificado) {
    return {
      ok: false,
      motivo: "MASCOTA_NO_ENCONTRADA",
      mensaje: "Mascota no encontrada",
    };
  }

  return { ok: true, certificado };
}
