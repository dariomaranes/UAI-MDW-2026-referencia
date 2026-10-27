/**
 * La Server Action que registra la aplicación de una vacuna (H2).
 *
 * ---------------------------------------------------------------------------
 * LA MISMA REGLA QUE EL ENDPOINT, PORQUE ES LA MISMA FUNCIÓN
 * ---------------------------------------------------------------------------
 * Esta acción no decide nada sobre vacunas. Llama a
 * `registrarAplicacionDeVacuna`, que es exactamente lo que llama
 * `POST /api/mascotas/:id/aplicaciones`. Comparen los dos archivos: tienen la
 * misma forma y se diferencian en una sola cosa, que es lo que hacen con el
 * rechazo.
 *
 *   el endpoint        motivo → status code      409
 *   esta acción        motivo → mensaje arriba del formulario
 *
 * Si mañana cambia la edad mínima de una vacuna, cambia en `lib/casos/` y las
 * dos puertas quedan bien. Esa es toda la idea de la clase.
 *
 * ---------------------------------------------------------------------------
 * EL `mascotaId` NO VIAJA EN EL FORMULARIO
 * ---------------------------------------------------------------------------
 * Viene de la URL y se ata a la acción con `.bind()` en la pantalla. Podría
 * ir en un `<input type="hidden">` y funcionaría, pero un campo oculto es un
 * campo: se edita con el inspector en diez segundos. La regla general es la
 * de la clase 4 — **lo que el cliente no necesita elegir, el cliente no lo
 * manda** — y acá se cumple sola, porque la mascota ya está en la dirección.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { registrarAplicacionDeVacuna } from "@/lib/casos/registrar-aplicacion";
import { registrarAplicacionSchema } from "@/lib/schemas/aplicacion";
import type { EstadoDelFormulario } from "@/lib/formularios";

export async function registrarAplicacionAction(
  mascotaId: string,
  _estadoPrevio: EstadoDelFormulario,
  formData: FormData,
): Promise<EstadoDelFormulario> {
  // Registrar una aplicación es un acto profesional: lo hace el veterinario.
  // Un dueño no puede anotar que vacunó a su propia mascota, porque entonces
  // el certificado no valdría nada.
  const veterinario = await requerirUsuario("VETERINARIO");

  const resultado = registrarAplicacionSchema.safeParse({
    mascotaId,
    vacunaId: formData.get("vacunaId"),
    fecha: formData.get("fecha"),
    observaciones: formData.get("observaciones") || undefined,
  });

  if (!resultado.success) {
    return {
      ok: false,
      errores: resultado.error.flatten().fieldErrors,
      valores: {
        vacunaId: String(formData.get("vacunaId") ?? ""),
        fecha: String(formData.get("fecha") ?? ""),
        observaciones: String(formData.get("observaciones") ?? ""),
      },
    };
  }

  const registro = await registrarAplicacionDeVacuna(
    resultado.data,
    veterinario.id,
  );

  if (!registro.ok) {
    // Acá está la diferencia que vale la pena mirar dos veces. Esto NO es un
    // error de campo: los datos eran válidos —la vacuna existe, la fecha es
    // una fecha— y aun así la operación no procede. Ponerlo debajo del
    // `<select>` sugeriría que eligiendo otra cosa se arregla, y a veces no
    // se arregla: hay que esperar a que el animal tenga la edad.
    //
    // Es el 400 contra el 409 de la clase 5, dibujado.
    return {
      ok: false,
      mensaje: registro.mensaje,
      valores: {
        vacunaId: resultado.data.vacunaId,
        fecha: formData.get("fecha") ? String(formData.get("fecha")) : "",
        observaciones: resultado.data.observaciones ?? "",
      },
    };
  }

  // Dos pantallas quedaron viejas con esta escritura, y las dos se invalidan:
  // el detalle muestra el estado sanitario y el historial, y la home muestra
  // la fecha de la última aplicación en cada fila.
  revalidatePath(`/mascotas/${mascotaId}`);
  revalidatePath("/");

  redirect(`/mascotas/${mascotaId}`);
}
