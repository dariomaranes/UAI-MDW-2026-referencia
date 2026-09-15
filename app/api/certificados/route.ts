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
import {
  listarCertificadosDeDueno,
  solicitarCertificado,
  solicitudPendiente,
} from "@/lib/db/certificados";
import { obtenerMascotaDeDueno } from "@/lib/db/mascotas";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import { vacunasFaltantes } from "@/lib/estado-sanitario";

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

    // 2. AUTORIZAR.
    const usuario = await requerirUsuario();

    // La mascota se busca ANTES de la regla porque la regla la necesita: sin
    // su especie y su fecha de nacimiento no hay plan de vacunación que
    // evaluar. Y de paso resuelve el 404 — el `duenoId` va en el WHERE, así
    // que la mascota del vecino no existe para este dueño.
    const mascota = await obtenerMascotaDeDueno(resultado.data.mascotaId, usuario.id);

    if (!mascota) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    // 3. LAS REGLAS.
    //
    //    La primera es la más barata y la más específica: si ya pidió esto
    //    mismo y todavía está esperando, no hace falta evaluar nada más.
    //    Sale del ADR 0002 — apareció probando la API, no de una historia
    //    original, y por eso primero se escribió en la spec.
    const pendiente = await solicitudPendiente(mascota.id, resultado.data.motivo);

    if (pendiente) {
      return NextResponse.json(
        {
          error: `Ya hay una solicitud pendiente de emisión para ${mascota.nombre} con ese motivo`,
          // El id, para que la pantalla pueda llevar al dueño hasta ella en
          // vez de dejarlo adivinando cuál de todas era.
          solicitudPendienteId: pendiente.id,
        },
        { status: 409 },
      );
    }

    //    La segunda es la de la clase 5. Acá vivía el `TODO (clase 5)`.
    //
    //    Tres líneas y ningún `if` con fechas adentro: leer, preguntar,
    //    traducir. Todo el razonamiento —qué vacuna corresponde a esta edad,
    //    cuál venció, cuál nunca se aplicó— está en `lib/estado-sanitario.ts`,
    //    que se prueba con `npm test` sin levantar nada.
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
      // 409 y no 400: el body está perfecto. Es el ESTADO del sistema el que
      // no permite la operación, y se arregla vacunando al animal, no
      // mandando el request distinto.
      //
      // Y `faltantes` va en su propio campo, no embutido en el mensaje: el
      // criterio de aceptación de la H4 pide que la respuesta ENUMERE cuáles
      // faltan, así que ese array es el criterio, no un adorno. El mensaje es
      // para la persona; el array, para la pantalla que lo va a mostrar.
      return NextResponse.json(
        {
          error: "La mascota no está al día con las vacunas obligatorias",
          faltantes,
        },
        { status: 409 },
      );
    }

    // 4. DELEGAR.
    const certificado = await solicitarCertificado(resultado.data, usuario.id);

    if (!certificado) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    // 5. RESPONDER.
    return NextResponse.json(certificado, { status: 201 });
  } catch (error) {
    // Acá llega lo que NO se previó —la base caída, un bug— y, desde la clase
    // 6, también el 401 y el 403 que lanza `requerirUsuario`. Los distingue
    // `responderError`; los errores esperados —400, 404, 409— siguen saliendo
    // por `return` mucho antes.
    return responderError("POST /api/certificados", error);
  }
}
