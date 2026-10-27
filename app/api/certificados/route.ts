/**
 * /api/certificados — la colección.
 *
 * Mismo patrón de cuatro pasos que mascotas, más el paso que se agrega en la
 * clase 5: LAS REGLAS. Acá el POST no "crea un certificado", inicia un
 * trámite que después alguien más tiene que emitir — y que el sistema puede
 * rechazar aunque el body esté impecable.
 */
import { NextResponse } from "next/server";
import { solicitarCertificadoSchema } from "@/lib/schemas/certificado";
import { listarCertificadosDeDueno } from "@/lib/db/certificados";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import {
  solicitarCertificadoDeMascota,
  type MotivoDeRechazoSolicitud,
} from "@/lib/casos/solicitar-certificado";

/**
 * Motivo del dominio → status code. Un `Record` y no un `switch`, por lo mismo
 * que en las aplicaciones: un motivo nuevo en el caso de uso rompe la
 * compilación acá hasta que alguien decida con qué número se responde.
 *
 * 409 y no 400 en los dos rechazos: el body está perfecto. Es el ESTADO del
 * sistema el que no permite la operación, y se arregla vacunando al animal o
 * esperando la emisión, no mandando el request distinto.
 */
const STATUS_POR_MOTIVO: Record<MotivoDeRechazoSolicitud, number> = {
  MASCOTA_NO_ENCONTRADA: 404,
  SOLICITUD_PENDIENTE: 409,
  VACUNAS_FALTANTES: 409,
};

export async function GET() {
  try {
    const usuario = await requerirUsuario();

    const certificados = await listarCertificadosDeDueno(usuario.id);
    return NextResponse.json(certificados);
  } catch (error) {
    return responderError("GET /api/certificados", error);
  }
}

export async function POST(request: Request) {
  try {
    // 1. VALIDAR.
    const body: unknown = await request.json();
    const resultado = solicitarCertificadoSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }

    // 2. AUTORIZAR. Sin rol: la pertenencia la resuelve el caso de uso, con
    //    el `duenoId` en el WHERE. Para un veterinario, ninguna mascota es
    //    "suya", y la respuesta es el mismo 404.
    const usuario = await requerirUsuario();

    // 3. LAS REGLAS, que desde la clase 12 viven en `lib/casos/` porque las
    //    usa también el pedido desde la ficha de la mascota. Acá quedó lo
    //    único que es de este handler: traducir el resultado a HTTP.
    const solicitud = await solicitarCertificadoDeMascota(
      resultado.data,
      usuario.id,
    );

    if (!solicitud.ok) {
      // Lo que cada rechazo trae además del mensaje viaja en la respuesta:
      // `faltantes` es el criterio de aceptación de la H4, y
      // `solicitudPendienteId` le dice al cliente cuál es la que espera.
      const datos =
        solicitud.motivo === "VACUNAS_FALTANTES"
          ? { faltantes: solicitud.faltantes }
          : solicitud.motivo === "SOLICITUD_PENDIENTE"
            ? { solicitudPendienteId: solicitud.solicitudPendienteId }
            : {};

      return NextResponse.json(
        { error: solicitud.mensaje, ...datos },
        { status: STATUS_POR_MOTIVO[solicitud.motivo] },
      );
    }

    // 4. RESPONDER.
    return NextResponse.json(solicitud.certificado, { status: 201 });
  } catch (error) {
    // Acá llega lo que NO se previó —la base caída, un bug— y, desde la clase
    // 6, también el 401 y el 403 que lanza `requerirUsuario`. Los distingue
    // `responderError`; los errores esperados —400, 404, 409— siguen saliendo
    // por `return` mucho antes.
    return responderError("POST /api/certificados", error);
  }
}
