/**
 * POST /api/certificados/:id/anulacion
 *
 * EL ENDPOINT QUE NO SE PODÍA ESCRIBIR HASTA HOY.
 *
 * Está en `docs/api.md` desde la clase 4 y fue la única fila del contrato que
 * quedó sin código durante tres clases. No por falta de tiempo: su regla de
 * negocio no es un cálculo ni una validación, es QUIÉN la ejecuta —"solo el
 * veterinario que lo emitió puede anularlo"—, y eso necesita sesión.
 *
 * Mirá cuántos permisos distintos conviven acá, que es la razón por la que
 * anular tiene su propio endpoint en vez de ser un `PATCH { estado }`:
 *
 *   ¿hay sesión?              → 401   requerirUsuario()
 *   ¿es veterinario?          → 403   requerirUsuario("VETERINARIO")
 *   ¿es EL que lo emitió?     → 409   el emisorId en el WHERE de la consulta
 *
 * Los dos primeros los contesta la sesión; el tercero, la base. Un
 * veterinario distinto del emisor TIENE el rol correcto y aun así no puede:
 * `requerirUsuario` lo deja pasar y la consulta lo frena.
 */
import { NextResponse } from "next/server";
import { anularCertificado } from "@/lib/db/certificados";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // 1 y 2. Este endpoint no lleva body: todo lo que necesita está en la URL
    //        y en la sesión. Cuanto menos decide el cliente, menos hay que
    //        desconfiar.
    const veterinario = await requerirUsuario("VETERINARIO");

    // 3. DELEGAR. `anularCertificado` lleva tres condiciones juntas en el
    //    WHERE: el id, que esté EMITIDO y que el emisor sea este veterinario.
    const anulado = await anularCertificado(id, veterinario.id);

    // Vuelve null por tres motivos distintos —no existe, no está emitido, o
    // lo emitió otro— y los tres se responden igual A PROPÓSITO: quien no lo
    // emitió no tiene por qué enterarse de en qué estado está el certificado
    // de otra persona.
    if (!anulado) {
      return NextResponse.json(
        { error: "El certificado no está emitido" },
        { status: 409 },
      );
    }

    // 200 y no 201: la anulación no crea un recurso consultable, cambia el
    // estado del certificado. Se devuelve el certificado ya anulado.
    return NextResponse.json(anulado);
  } catch (error) {
    return responderError("POST /api/certificados/:id/anulacion", error);
  }
}
