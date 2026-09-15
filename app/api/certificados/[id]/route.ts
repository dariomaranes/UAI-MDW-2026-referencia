/**
 * GET /api/certificados/:id — el detalle de un certificado.
 *
 * Existe porque está en el contrato de `docs/api.md`, y una fila del contrato
 * sin código ni TODO es exactamente lo que el proyecto no quiere: una
 * decisión que nadie tomó. Es el hermano tranquilo de `emision/route.ts`.
 *
 * Ojo con la diferencia entre este endpoint y el público: los dos leen el
 * mismo certificado y devuelven cosas distintas a propósito. Este responde a
 * quien tiene sesión y muestra el detalle completo; el de
 * `/api/verificacion/:codigo` responde a una aerolínea y muestra lo mínimo.
 * Son dos `select` separados en `lib/db/certificados.ts` justamente para que
 * agregar un campo acá no lo publique allá.
 */
import { NextResponse } from "next/server";
import { obtenerCertificadoVisiblePara } from "@/lib/db/certificados";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    const usuario = await requerirUsuario();

    // La pertenencia viaja adentro de la consulta: para un dueño, el
    // certificado de la mascota del vecino no existe, y el 404 sale solo.
    const certificado = await obtenerCertificadoVisiblePara(
      id,
      usuario.id,
      usuario.rol,
    );

    if (!certificado) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(certificado);
  } catch (error) {
    return responderError("GET /api/certificados/:id", error);
  }
}
