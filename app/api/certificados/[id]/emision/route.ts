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
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import {
  primerVencimientoObligatorio,
  vacunasFaltantes,
} from "@/lib/estado-sanitario";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Contexto) {
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

    const certificado = await obtenerCertificado(id);

    if (!certificado) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    // 3. LAS REGLAS. Acá vivía el otro `TODO (clase 5)`.
    //
    //    Es LA MISMA regla que en la solicitud, y se vuelve a evaluar a
    //    propósito: entre que el dueño solicitó y el veterinario emite pasa
    //    tiempo, y en ese tiempo una obligatoria pudo vencer. El criterio de
    //    aceptación de la H5 lo pide con todas las letras.
    //
    //    Es también la mejor justificación de por qué la regla no vive
    //    adentro de un handler: dos endpoints hacen la misma pregunta, y dos
    //    implementaciones distintas de la misma pregunta son un bug con fecha
    //    de vencimiento.
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
      return NextResponse.json(
        {
          error: "La mascota dejó de estar al día con las vacunas obligatorias",
          faltantes,
        },
        { status: 409 },
      );
    }

    // 4. DELEGAR.
    //
    // Y acá se completa la regla de vencimiento de la spec: "vence cuando
    // vence la primera de las vacunas obligatorias que lo respaldan, O a los
    // 30 días de emitido, lo que ocurra primero". El segundo término estaba
    // desde la clase 4; el primero es este segundo parámetro, que hasta hoy
    // iba en `null` puesto a mano.
    //
    // Se calcula UNA VEZ, al emitir, y se guarda. A diferencia del estado
    // sanitario —que se calcula al leerlo— esto es parte de lo que el
    // certificado AFIRMA: no puede cambiar retroactivamente porque después se
    // aplique otra vacuna.
    const vencimientoDeVacunas = primerVencimientoObligatorio(
      plan,
      aplicaciones,
      certificado.mascota.fechaNacimiento,
      hoy,
    );

    const emitido = await emitirCertificado(
      id,
      // El emisor baja de la sesión. Es lo que hace cumplir la regla de la
      // spec "solo el veterinario que lo emitió puede anularlo": si este dato
      // viniera del body, esa regla sería decorativa.
      veterinario.id,
      generarCodigoVerificacion(),
      calcularVencimiento(hoy, vencimientoDeVacunas),
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

    // 5. RESPONDER. 201: se creó la emisión, que es el recurso de esta ruta.
    return NextResponse.json(emitido, { status: 201 });
  } catch (error) {
    return responderError("POST /api/certificados/:id/emision", error);
  }
}
