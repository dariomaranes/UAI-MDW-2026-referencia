/**
 * Endpoint de ejemplo: muestra el patrón que sigue toda la API del proyecto.
 *
 *   1. Se valida la entrada con un schema de Zod.
 *   2. Se verifica quién es el usuario (clase 6).
 *   3. Se delega el acceso a datos a `lib/db/`.
 *   4. Se responde con el status code correcto.
 *
 * Se completa en las clases 4, 5 y 6.
 */
import { NextResponse } from "next/server";
import { crearMascotaSchema } from "@/lib/schemas/mascota";
import { crearMascota, listarMascotas } from "@/lib/db/mascotas";

export async function GET() {
  // TODO (clase 6): listar solo las mascotas del dueño de la sesión con
  // `listarMascotasDeDueno`. Hasta que haya sesión no hay a quién filtrar.
  const mascotas = await listarMascotas();
  return NextResponse.json(mascotas);
}

export async function POST(request: Request) {
  // 1. Validar. Nunca confiar en el body: puede venir de cualquier lado,
  //    no solo del formulario propio.
  const body: unknown = await request.json();
  const resultado = crearMascotaSchema.safeParse(body);

  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 }, // 400 = el cliente mandó algo mal
    );
  }

  // 2. Autorizar. El dueño sale de la sesión del servidor, NUNCA del body.
  //    TODO (clase 6): reemplazar por el usuario real de la sesión y
  //    devolver 401 si no hay sesión.
  const duenoId = "duena-de-ejemplo";

  // 3. Delegar el acceso a datos.
  const mascota = await crearMascota(resultado.data, duenoId);

  // 4. 201 = se creó un recurso nuevo.
  return NextResponse.json(mascota, { status: 201 });
}
