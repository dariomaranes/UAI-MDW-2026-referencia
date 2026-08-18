/**
 * Endpoint de ejemplo: muestra el patrón que sigue toda la API del proyecto.
 *
 *   1. Se valida la entrada con un schema de Yup.
 *   2. Se verifica quién es el usuario (clase 6).
 *   3. Se delega el acceso a datos a `lib/db/`.
 *   4. Se responde con el status code correcto.
 *
 * Se completa en las clases 4, 5 y 6.
 */
import { NextResponse } from "next/server";
import * as yup from "yup";
import { crearNotaSchema } from "@/lib/schemas/nota";
import { crearNota, listarNotas } from "@/lib/db/notas";

export async function GET() {
  const notas = await listarNotas();
  return NextResponse.json(notas);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  try {
    // 1. Validar. Nunca confiar en el body: puede venir de cualquier lado,
    //    no solo del formulario propio.
    const datos = await crearNotaSchema.validate(body, {
      abortEarly: false, // junta todos los errores, no solo el primero
      stripUnknown: true, // descarta campos que no están en el schema
    });

    // 2. Autorizar. El autor sale de la sesión del servidor, NUNCA del body.
    //    TODO (clase 6): reemplazar por el usuario real de la sesión y
    //    devolver 401 si no hay sesión.
    const autorId = "usuario-de-ejemplo";

    // 3. Delegar el acceso a datos.
    const nota = await crearNota(datos, autorId);

    // 4. 201 = se creó un recurso nuevo.
    return NextResponse.json(nota, { status: 201 });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.errors },
        { status: 400 }, // 400 = el cliente mandó algo mal
      );
    }
    throw error; // cualquier otra cosa no es un problema de validación
  }
}
