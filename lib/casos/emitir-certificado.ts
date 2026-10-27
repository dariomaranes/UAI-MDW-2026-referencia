/**
 * El caso de uso "emitir un certificado" (H5), una sola vez.
 *
 * Es la operación más importante del proyecto, y hasta la clase 12 vivía
 * entera adentro de `POST /api/certificados/:id/emision`. Desde hoy la usa
 * también el botón "Emitir" de la pantalla del certificado, así que se muda
 * acá por la razón de siempre: dos puertas, una regla.
 *
 * Emitir no es escribir un campo. Son cuatro cosas, todas juntas o ninguna:
 * verificar que las obligatorias sigan al día, generar un código único,
 * congelar el vencimiento y registrar quién lo emitió. Y después, una quinta
 * que NO es parte de la operación: el PDF.
 *
 * ---------------------------------------------------------------------------
 * LA URL DE VERIFICACIÓN ENTRA POR PARÁMETRO
 * ---------------------------------------------------------------------------
 * Va impresa en el PDF, y depende de dónde corre el sistema: localhost o
 * producción. El caso de uso no tiene un request para mirarlo —no sabe que
 * existe HTTP—, así que se la pasa cada puerta: el endpoint la saca del
 * request, la Server Action de los encabezados.
 */
import {
  calcularVencimiento,
  generarCodigoVerificacion,
} from "@/lib/certificados";
import {
  emitirCertificado,
  guardarUrlPdf,
  obtenerCertificado,
} from "@/lib/db/certificados";
import { generarPdfCertificado } from "@/lib/certificados-pdf";
import { subirPdf } from "@/lib/servicios/storage";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import {
  primerVencimientoObligatorio,
  vacunasFaltantes,
} from "@/lib/estado-sanitario";

type CertificadoEmitido = NonNullable<
  Awaited<ReturnType<typeof emitirCertificado>>
>;

export type MotivoDeRechazoEmision =
  | "CERTIFICADO_NO_ENCONTRADO"
  | "VACUNAS_FALTANTES"
  | "NO_PENDIENTE";

export type ResultadoEmision =
  | { ok: true; certificado: CertificadoEmitido & { urlPdf: string | null } }
  | {
      ok: false;
      motivo: "CERTIFICADO_NO_ENCONTRADO" | "NO_PENDIENTE";
      mensaje: string;
    }
  | {
      ok: false;
      motivo: "VACUNAS_FALTANTES";
      mensaje: string;
      faltantes: string[];
    };

export async function emitirCertificadoSolicitado(
  id: string,
  veterinarioId: string,
  urlDeVerificacion: string,
): Promise<ResultadoEmision> {
  const certificado = await obtenerCertificado(id);

  if (!certificado) {
    return {
      ok: false,
      motivo: "CERTIFICADO_NO_ENCONTRADO",
      mensaje: "No encontrado",
    };
  }

  // LA MISMA regla que en la solicitud, y se vuelve a evaluar a propósito:
  // entre que el dueño pidió y el veterinario emite pasa tiempo, y en ese
  // tiempo una obligatoria pudo vencer. El criterio de aceptación de la H5 lo
  // pide con todas las letras.
  const hoy = new Date();

  const { plan, aplicaciones } = await datosDelEstadoSanitario(
    certificado.mascota.especie,
    certificado.mascota.id,
  );

  const faltantes = vacunasFaltantes(
    plan,
    aplicaciones,
    certificado.mascota.fechaNacimiento,
    hoy,
  );

  if (faltantes.length > 0) {
    return {
      ok: false,
      motivo: "VACUNAS_FALTANTES",
      mensaje: "La mascota dejó de estar al día con las vacunas obligatorias",
      faltantes,
    };
  }

  // La regla de vencimiento de la spec: "vence cuando vence la primera de las
  // vacunas obligatorias que lo respaldan, O a los 30 días de emitido, lo que
  // ocurra primero". Se calcula UNA VEZ, al emitir, y se guarda: es parte de
  // lo que el certificado AFIRMA, y no puede cambiar retroactivamente porque
  // después se aplique otra vacuna.
  const vencimientoDeVacunas = primerVencimientoObligatorio(
    plan,
    aplicaciones,
    certificado.mascota.fechaNacimiento,
    hoy,
  );

  const emitido = await emitirCertificado(
    id,
    // El emisor baja de la sesión, por parámetro. Es lo que hace cumplir la
    // regla "solo el veterinario que lo emitió puede anularlo": si este dato
    // viniera del cliente, esa regla sería decorativa.
    veterinarioId,
    generarCodigoVerificacion(),
    calcularVencimiento(hoy, vencimientoDeVacunas),
  );

  // `emitirCertificado` lleva `estado: "SOLICITADO"` en el WHERE: si vuelve
  // null es porque ya estaba emitido o anulado. Es también lo que frena el
  // doble clic de dos veterinarios a la vez: el segundo `updateMany` no
  // encuentra nada que actualizar.
  if (!emitido) {
    return {
      ok: false,
      motivo: "NO_PENDIENTE",
      mensaje: `El certificado no está pendiente de emisión (${certificado.estado})`,
    };
  }

  // ---------------------------------------------------------------------
  // A PARTIR DE ACÁ EL CERTIFICADO YA ESTÁ EMITIDO.
  //
  // Nada de lo que sigue puede deshacer la emisión. El PDF es un servicio
  // ACCESORIO —la spec lo decidió en la clase 2: "lo que vale es el registro,
  // no el archivo"—, así que si el storage no responde, `subirPdf` devuelve
  // null y la emisión sigue en pie.
  // ---------------------------------------------------------------------
  const pdf = await generarPdfCertificado(emitido, urlDeVerificacion);
  const urlPdf = await subirPdf(`${emitido.codigoVerificacion}.pdf`, pdf);

  if (urlPdf) {
    await guardarUrlPdf(emitido.id, urlPdf);
  }

  return { ok: true, certificado: { ...emitido, urlPdf } };
}
