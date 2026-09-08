/**
 * GET /api/mascotas/:id/estado-sanitario — la H3.
 *
 * EL ENDPOINT QUE NO LEE UNA COLUMNA. En la base no existe ningún campo
 * `estado`: cada vacuna del plan se clasifica al momento de consultarla,
 * comparando las aplicaciones cargadas contra el reloj de ahora.
 *
 * Por qué se calcula y no se guarda (decidido en la clase 3, y hoy se ve
 * funcionando): una vacuna se vence SOLA, el día que pasa su fecha, sin que
 * nadie toque el sistema. Una columna `estado` estaría mintiendo desde ese
 * día hasta que algún proceso la corrija.
 *
 * Fijate en el reparto de tareas, que es el tema de la clase 5:
 *
 *   lib/db/vacunas.ts        trae el plan y las aplicaciones (sabe leer)
 *   lib/estado-sanitario.ts  decide el estado de cada una    (sabe decidir)
 *   este archivo             elige el status y responde      (sabe responder)
 *
 * Y el `new Date()` está acá, en el borde, y viaja hacia adentro por
 * parámetro. Esa es la razón por la que la regla se puede testear.
 */
import { NextResponse } from "next/server";
import { obtenerMascotaDeDueno } from "@/lib/db/mascotas";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import { estadoSanitario } from "@/lib/estado-sanitario";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // TODO (clase 6): el dueño sale de la sesión y 401 si no hay. Además, un
    // VETERINARIO puede ver el estado sanitario de cualquier mascota que
    // atiende: son dos caminos distintos hacia la misma respuesta.
    const duenoId = "duena-de-ejemplo";

    const mascota = await obtenerMascotaDeDueno(id, duenoId);

    if (!mascota) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const { plan, aplicaciones } = await datosDelEstadoSanitario(
      mascota.especie,
      mascota.id,
    );

    return NextResponse.json({
      mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
      vacunas: estadoSanitario(
        plan,
        aplicaciones,
        mascota.fechaNacimiento,
        new Date(),
      ),
    });
  } catch (error) {
    console.error("GET /api/mascotas/:id/estado-sanitario", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
