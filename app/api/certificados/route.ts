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
} from "@/lib/db/certificados";
import { obtenerMascotaDeDueno } from "@/lib/db/mascotas";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import { vacunasFaltantes } from "@/lib/estado-sanitario";

export async function GET() {
  try {
    // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
    const duenoId = "duena-de-ejemplo";

    const certificados = await listarCertificadosDeDueno(duenoId);
    return NextResponse.json(certificados);
  } catch (error) {
    console.error("GET /api/certificados", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
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
    // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
    const duenoId = "duena-de-ejemplo";

    // La mascota se busca ANTES de la regla porque la regla la necesita: sin
    // su especie y su fecha de nacimiento no hay plan de vacunación que
    // evaluar. Y de paso resuelve el 404 — el `duenoId` va en el WHERE, así
    // que la mascota del vecino no existe para este dueño.
    const mascota = await obtenerMascotaDeDueno(resultado.data.mascotaId, duenoId);

    if (!mascota) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    // 3. LAS REGLAS. Acá vivía el `TODO (clase 5)`.
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
    const certificado = await solicitarCertificado(resultado.data, duenoId);

    if (!certificado) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    // 5. RESPONDER.
    return NextResponse.json(certificado, { status: 201 });
  } catch (error) {
    // Acá solo llega lo que NO se previó: la base caída, un bug. Los errores
    // esperados —400, 404, 409— salieron por `return` mucho antes.
    //
    // El detalle va al log, que es de ustedes. La respuesta, que la lee un
    // desconocido, no cuenta nada: el mensaje de una excepción de Prisma
    // revela nombres de tablas y a veces el SQL.
    console.error("POST /api/certificados", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
