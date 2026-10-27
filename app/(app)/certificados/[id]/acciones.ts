/**
 * La Server Action que emite un certificado (H5).
 *
 * El formulario de esta acción no tiene un solo campo, y es a propósito:
 * todo lo que la emisión necesita está en la URL —qué certificado— y en la
 * sesión —quién lo emite—. Es lo mismo que el endpoint, que tampoco lleva
 * body: cuanto menos decide el cliente, menos hay que desconfiar.
 *
 * Las reglas y la operación están en `lib/casos/emitir-certificado.ts`, que
 * es lo que llama `POST /api/certificados/:id/emision`.
 */
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { emitirCertificadoSolicitado } from "@/lib/casos/emitir-certificado";
import type { EstadoDelFormulario } from "@/lib/formularios";

/**
 * La URL de verificación que va impresa en el PDF.
 *
 * El endpoint la saca del request; una Server Action no recibe el request,
 * pero sí puede leer sus encabezados. En Vercel el host original llega en
 * `x-forwarded-host`, y el protocolo en `x-forwarded-proto`.
 */
async function urlDeVerificacion(): Promise<string> {
  const encabezados = await headers();
  const host = encabezados.get("x-forwarded-host") ?? encabezados.get("host");
  const protocolo =
    encabezados.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return new URL("/api/verificacion", `${protocolo}://${host}`).toString();
}

// `useActionState` le pasa a la acción el estado previo y el `FormData`, y
// esta no usa ninguno de los dos: no hay campos que leer. Por eso la firma
// termina en el id que ata el `.bind()` de la pantalla.
export async function emitirCertificadoAction(
  certificadoId: string,
): Promise<EstadoDelFormulario> {
  // El criterio de la H5: "si quien intenta emitirlo no es veterinario, el
  // sistema responde 403 aunque la llamada no venga de la interfaz". Esta
  // acción ES una llamada que puede no venir de la interfaz.
  const veterinario = await requerirUsuario("VETERINARIO");

  const emision = await emitirCertificadoSolicitado(
    certificadoId,
    veterinario.id,
    await urlDeVerificacion(),
  );

  if (!emision.ok) {
    return {
      ok: false,
      mensaje:
        emision.motivo === "VACUNAS_FALTANTES"
          ? `${emision.mensaje}. Venció o falta:`
          : emision.mensaje,
      detalles:
        emision.motivo === "VACUNAS_FALTANTES" ? emision.faltantes : undefined,
    };
  }

  // Tres pantallas quedaron viejas: este certificado, que ahora tiene código;
  // la ficha de la mascota, que lo lista con su estado; y la home del
  // veterinario, de cuya cola de pendientes acaba de salir.
  revalidatePath(`/certificados/${certificadoId}`);
  revalidatePath(`/mascotas/${emision.certificado.mascota.id}`);
  revalidatePath("/");

  // A la misma pantalla, que ahora muestra el código y el PDF. El redirect
  // fuerza a leerla de nuevo desde el servidor.
  redirect(`/certificados/${certificadoId}`);
}
