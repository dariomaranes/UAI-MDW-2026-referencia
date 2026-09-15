/**
 * Endpoint de ejemplo: muestra el patrón que sigue toda la API del proyecto.
 *
 *   1. Se valida la entrada con un schema de Zod.        → 400
 *   2. Se verifica quién es el usuario.                  → 401 / 403
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
 * Desde la clase 6 el paso 2 es real: `requerirUsuario` corta el request si
 * no hay sesión, y el `duenoId` baja de ahí y no del body.
 */
import { NextResponse } from "next/server";
import { crearMascotaSchema } from "@/lib/schemas/mascota";
import {
  crearMascota,
  listarMascotasAtendidasPor,
  listarMascotasDeDueno,
} from "@/lib/db/mascotas";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";

export async function GET() {
  try {
    // 1. ¿HAY SESIÓN? Es la primera línea del try, siempre: primero quién,
    //    después qué. Un error de negocio respondido a un desconocido le
    //    estaría contando datos de otra persona.
    const usuario = await requerirUsuario();

    // 2. LA PERTENENCIA VA EN EL WHERE, no en un `if` posterior. Ninguna de
    //    las dos consultas puede devolver la mascota de otro: no es que se
    //    rechace después, es que no existe para esta llamada.
    //
    //    Y "las mías" significa cosas distintas según el rol: el dueño tiene
    //    mascotas, el veterinario tiene PACIENTES —las que atendió—. Mismo
    //    endpoint, misma pregunta, dos consultas.
    const mascotas =
      usuario.rol === "VETERINARIO"
        ? await listarMascotasAtendidasPor(usuario.id)
        : await listarMascotasDeDueno(usuario.id);

    return NextResponse.json(mascotas);
  } catch (error) {
    return responderError("GET /api/mascotas", error);
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
    //    Es la misma línea que en la clase 4 evitaba el `data: body`, ahora
    //    con un usuario de verdad.
    const usuario = await requerirUsuario();

    // 3. Delegar el acceso a datos.
    const mascota = await crearMascota(resultado.data, usuario.id);

    // 4. 201 = se creó un recurso nuevo.
    return NextResponse.json(mascota, { status: 201 });
  } catch (error) {
    // El `console.error` con el nombre del endpoint adelante no se perdió:
    // ahora vive adentro de `responderError`, que además distingue el 401 y
    // el 403 del 500 genérico.
    return responderError("POST /api/mascotas", error);
  }
}
