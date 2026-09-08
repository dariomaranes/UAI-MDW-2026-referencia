/**
 * Endpoint de ejemplo: muestra el patrón que sigue toda la API del proyecto.
 *
 *   1. Se valida la entrada con un schema de Zod.        → 400
 *   2. Se verifica quién es el usuario (clase 6).        → 401 / 403
 *   3. Se evalúan las reglas de negocio (clase 5).       → 409
 *   4. Se delega el acceso a datos a `lib/db/`.          → 404 si no existe
 *   5. Se responde con el status code correcto.
 *
 * Todo envuelto en un `try/catch` que traduce a 500 lo que NO se previó. Los
 * errores esperados no pasan por ahí: salen por `return` mucho antes.
 *
 * Este archivo no tiene paso 3, y es un buen ejemplo de que no siempre hace
 * falta: las dos reglas de la H1 —el formato del chip y que la fecha de
 * nacimiento no sea futura— se deciden mirando el body y el calendario, sin
 * preguntarle nada al sistema. Por eso viven en `crearMascotaSchema` y son un
 * 400. Las reglas que necesitan ir a buscar algo están en
 * `app/api/certificados/` y en `app/api/mascotas/[id]/aplicaciones/`.
 *
 * Se completa en la clase 6.
 */
import { NextResponse } from "next/server";
import { crearMascotaSchema } from "@/lib/schemas/mascota";
import { crearMascota, listarMascotas } from "@/lib/db/mascotas";

export async function GET() {
  try {
    // TODO (clase 6): listar solo las mascotas del dueño de la sesión con
    // `listarMascotasDeDueno`. Hasta que haya sesión no hay a quién filtrar.
    const mascotas = await listarMascotas();
    return NextResponse.json(mascotas);
  } catch (error) {
    console.error("GET /api/mascotas", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    // Un `console.error` con el nombre del endpoint adelante: cuando esto
    // aparezca en los logs de Vercel a las once de la noche, esa línea es la
    // diferencia entre saber dónde mirar y no saberlo.
    console.error("POST /api/mascotas", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
