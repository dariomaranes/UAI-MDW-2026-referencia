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
 * quién lo emitió. Cuatro cosas, todas juntas o ninguna.
 *
 * Y cada transición tiene su propio permiso: emitir lo hace cualquier
 * veterinario, anular solo el que emitió. Mezclados en un PATCH, esos dos
 * permisos distintos conviven en el mismo bloque de código.
 */
import { NextResponse } from "next/server";
import {
  calcularVencimiento,
  generarCodigoVerificacion,
} from "@/lib/certificados";
import { emitirCertificado, obtenerCertificado } from "@/lib/db/certificados";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Contexto) {
  const { id } = await params;

  // 1. VALIDAR. Este endpoint no lleva body: todo lo que necesita está en la
  //    URL y en la sesión. No hay nada que parsear, y eso es una buena señal
  //    — cuanto menos decide el cliente, menos hay que desconfiar.

  // 2. AUTORIZAR.
  // TODO (clase 6): el emisor sale de la sesión, 401 si no hay sesión y 403
  // si el rol no es VETERINARIO. Acá el 403 SÍ corresponde —a diferencia del
  // 404 de las mascotas ajenas— porque el problema es el rol, no la
  // pertenencia: el certificado existe y quien pide sabe que existe.
  // El criterio de aceptación de la H5 lo pide explícitamente: "si quien
  // intenta emitirlo no es veterinario, el sistema responde 403 aunque la
  // llamada no venga de la interfaz".
  const emisorId = "veterinario-de-ejemplo";

  const certificado = await obtenerCertificado(id);

  if (!certificado) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // TODO (clase 5): verificar que las vacunas obligatorias de la especie y la
  // edad de esa mascota SIGAN al día. Entre la solicitud y la emisión puede
  // haber vencido alguna, y el criterio de la H5 pide informar cuál. Eso es
  // un 409 con la lista, no un 400. Cuando exista, de ahí sale también el
  // primer término del vencimiento, que hoy va en null.

  // 3. DELEGAR.
  const emitidoEn = new Date();

  const emitido = await emitirCertificado(
    id,
    emisorId,
    generarCodigoVerificacion(),
    calcularVencimiento(emitidoEn),
  );

  // `emitirCertificado` lleva `estado: "SOLICITADO"` en el WHERE: si vuelve
  // null es porque el certificado ya estaba emitido o anulado. El cliente no
  // mandó nada mal —por eso no es 400— es el estado actual el que choca.
  if (!emitido) {
    return NextResponse.json(
      { error: `El certificado no está pendiente de emisión (${certificado.estado})` },
      { status: 409 },
    );
  }

  // 4. RESPONDER. 201: se creó la emisión, que es el recurso de esta ruta.
  return NextResponse.json(emitido, { status: 201 });
}
