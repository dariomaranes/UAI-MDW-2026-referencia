/**
 * /api/certificados — la colección.
 *
 * Mismo patrón de cuatro pasos que mascotas. Lo que cambia es que acá el
 * recurso no es un ABM del todo: el POST no "crea un certificado", inicia un
 * trámite que después alguien más tiene que emitir.
 */
import { NextResponse } from "next/server";
import { solicitarCertificadoSchema } from "@/lib/schemas/certificado";
import {
  listarCertificadosDeDueno,
  solicitarCertificado,
} from "@/lib/db/certificados";

export async function GET() {
  // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
  const duenoId = "duena-de-ejemplo";

  const certificados = await listarCertificadosDeDueno(duenoId);
  return NextResponse.json(certificados);
}

export async function POST(request: Request) {
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

  // TODO (clase 5): antes de crear la solicitud hay que verificar que la
  // mascota esté al día con las vacunas OBLIGATORIAS de su especie y edad.
  // Si le falta alguna, esto es un 409 que ENUMERA cuáles faltan — así lo
  // pide el criterio de aceptación de la H4. Hoy la solicitud se crea
  // siempre: la regla existe en la spec y todavía no en el código.

  // 3. DELEGAR.
  const certificado = await solicitarCertificado(resultado.data, duenoId);

  // La mascota no existe o no es de quien pide: 404, no 403.
  if (!certificado) {
    return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
  }

  // 4. RESPONDER.
  return NextResponse.json(certificado, { status: 201 });
}
