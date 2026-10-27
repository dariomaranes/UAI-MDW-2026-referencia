/**
 * La Server Action que pide un certificado desde la ficha de la mascota (H4).
 *
 * Es el paso 3 del flujo, y el mapa de pantallas lo pone en la ficha y no en
 * una pantalla aparte: el dueño decide pedirlo mirando el estado sanitario,
 * así que el pedido va pegado a la información que lo motiva.
 *
 * Misma forma que la acción de las aplicaciones, y por la misma razón: las
 * reglas no están acá, están en `lib/casos/solicitar-certificado.ts`, que es
 * exactamente lo que llama `POST /api/certificados`. Lo único que cambia es la
 * traducción del rechazo:
 *
 *   el endpoint      motivo → 409 con `faltantes` en el body
 *   esta acción      motivo → mensaje arriba del formulario, con la lista
 *
 * El `mascotaId` llega por `.bind()` desde la ficha, no por un campo oculto:
 * la mascota ya está en la dirección.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { solicitarCertificadoDeMascota } from "@/lib/casos/solicitar-certificado";
import { solicitarCertificadoSchema } from "@/lib/schemas/certificado";
import type { EstadoDelFormulario } from "@/lib/formularios";

export async function solicitarCertificadoAction(
  mascotaId: string,
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // Pedir un certificado es del dueño. La pantalla ya no le muestra el
  // formulario a un veterinario; esta línea es la que impide que lo envíe.
  const dueno = await requerirUsuario("DUENO");

  const valores = {
    motivo: String(formData.get("motivo") ?? ""),
    detalle: String(formData.get("detalle") ?? ""),
  };

  const resultado = solicitarCertificadoSchema.safeParse({
    mascotaId,
    motivo: formData.get("motivo"),
    // Vacío es "sin detalle", no "un detalle inválido".
    detalle: formData.get("detalle") || undefined,
  });

  if (!resultado.success) {
    return {
      ok: false,
      errores: resultado.error.flatten().fieldErrors,
      valores,
    };
  }

  const solicitud = await solicitarCertificadoDeMascota(
    resultado.data,
    dueno.id,
  );

  if (!solicitud.ok) {
    // Los tres rechazos van arriba del formulario, y dos traen algo más que
    // el texto. TypeScript no deja leer `faltantes` sin preguntar antes por
    // el motivo: el tipo del resultado tiene un caso por cada uno.
    switch (solicitud.motivo) {
      case "VACUNAS_FALTANTES":
        return {
          ok: false,
          mensaje: `${solicitud.mensaje}. Le falta:`,
          detalles: solicitud.faltantes,
          valores,
        };
      case "SOLICITUD_PENDIENTE":
        return {
          ok: false,
          mensaje: solicitud.mensaje,
          enlace: {
            href: `/certificados/${solicitud.solicitudPendienteId}`,
            texto: "Ver la solicitud que está esperando",
          },
          valores,
        };
      case "MASCOTA_NO_ENCONTRADA":
        return { ok: false, mensaje: solicitud.mensaje, valores };
    }
  }

  // La ficha muestra la lista de certificados de la mascota, y la home del
  // veterinario la cola de pedidos: las dos quedaron viejas.
  revalidatePath(`/mascotas/${mascotaId}`);
  revalidatePath("/");

  // Al certificado recién pedido: es lo que la persona quiere ver ahora, y
  // ahí se entera de que falta que un veterinario lo emita.
  redirect(`/certificados/${solicitud.certificado.id}`);
}
