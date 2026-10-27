/**
 * POST /api/certificados/:id/emision
 *
 * LA OPERACIÓN QUE NO ES UN ABM. Es el endpoint más importante del proyecto
 * y el que conviene mirar primero cuando se quiere entender el dominio.
 *
 * Fijate en la URL: `emision` es un SUSTANTIVO, no un verbo. El recurso es
 * "la emisión de este certificado", y el POST la crea. La regla de REST se
 * mantiene: sustantivos en la ruta, verbos en el método.
 *
 * ------------------------------------------------------------------------
 * POR QUÉ ESTO Y NO `PATCH /api/certificados/12` con { estado: "EMITIDO" }
 * ------------------------------------------------------------------------
 * Con el PATCH, es el CLIENTE el que decide la transición y el servidor
 * obedece: nada impide mandar { "estado": "ANULADO" } o saltarse la
 * solicitud. Con el sub-recurso, el cliente PIDE QUE OCURRA la operación y el
 * servidor decide si corresponde.
 *
 * Además, emitir no es escribir un campo. Es: verificar que las obligatorias
 * sigan al día, generar un código único, congelar el vencimiento y registrar
 * quién lo emitió. Cuatro cosas, todas juntas o ninguna. Desde la clase 5 las
 * cuatro están implementadas — hasta ayer, la primera era un TODO.
 *
 * Desde la clase 12 las reglas de la emisión viven en
 * `lib/casos/emitir-certificado.ts`, porque las usa también el botón "Emitir"
 * de la pantalla del certificado. Este handler quedó con lo que es suyo:
 * autorizar y traducir el resultado a HTTP.
 *
 * Y cada transición tiene su propio permiso: emitir lo hace cualquier
 * veterinario, anular solo el que emitió. Mezclados en un PATCH, esos dos
 * permisos distintos conviven en el mismo bloque de código.
 */
import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import {
  emitirCertificadoSolicitado,
  type MotivoDeRechazoEmision,
} from "@/lib/casos/emitir-certificado";

type Contexto = { params: Promise<{ id: string }> };

/**
 * 404 si no existe; 409 si existe y el estado no admite emitirlo — porque
 * venció una obligatoria o porque ya estaba emitido. El cliente no mandó nada
 * mal en ninguno de los dos casos: por eso no es 400.
 */
const STATUS_POR_MOTIVO: Record<MotivoDeRechazoEmision, number> = {
  CERTIFICADO_NO_ENCONTRADO: 404,
  VACUNAS_FALTANTES: 409,
  NO_PENDIENTE: 409,
};

/**
 * La dirección donde un tercero verifica este certificado, impresa en el PDF.
 *
 * Sale del request y no de una constante porque el mismo código corre en
 * localhost y en producción: hardcodearla haría que los PDF emitidos en
 * desarrollo apunten al sistema de verdad, o al revés.
 */
function urlDeVerificacion(request: Request): string {
  return new URL("/api/verificacion", request.url).toString();
}

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // 1. VALIDAR. Este endpoint no lleva body: todo lo que necesita está en la
    //    URL y en la sesión. No hay nada que parsear, y eso es una buena señal
    //    — cuanto menos decide el cliente, menos hay que desconfiar.

    // 2. AUTORIZAR. Acá el 403 SÍ corresponde —a diferencia del 404 de las
    //    mascotas ajenas— porque el problema es el rol, no la pertenencia: el
    //    certificado existe y quien pide sabe que existe.
    //
    //    El criterio de aceptación de la H5 lo pide explícitamente: "si quien
    //    intenta emitirlo no es veterinario, el sistema responde 403 aunque la
    //    llamada no venga de la interfaz". Esa última frase es la clase 6
    //    entera: la verificación va en el servidor, no en la pantalla.
    const veterinario = await requerirUsuario("VETERINARIO");

    // 3. LAS REGLAS Y LA OPERACIÓN, en el caso de uso.
    const emision = await emitirCertificadoSolicitado(
      id,
      veterinario.id,
      urlDeVerificacion(request),
    );

    if (!emision.ok) {
      return NextResponse.json(
        {
          error: emision.mensaje,
          ...(emision.motivo === "VACUNAS_FALTANTES"
            ? { faltantes: emision.faltantes }
            : {}),
        },
        { status: STATUS_POR_MOTIVO[emision.motivo] },
      );
    }

    // 4. RESPONDER. 201 con PDF o sin PDF: la emisión ocurrió. `urlPdf` en
    //    null le dice a la pantalla que lo muestre como "en preparación", no
    //    como un error.
    return NextResponse.json(emision.certificado, { status: 201 });
  } catch (error) {
    return responderError("POST /api/certificados/:id/emision", error);
  }
}
