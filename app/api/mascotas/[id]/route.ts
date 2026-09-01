/**
 * La parte variable de la URL: /api/mascotas/:id
 *
 * Mismo patrón de cuatro pasos que el archivo de la colección. Lo nuevo acá
 * es `params`, y una decisión de diseño que se explica en `docs/api.md`:
 * cuando la mascota existe pero es de otro dueño, se responde 404 y no 403.
 * Un 403 confirmaría que existe. Para este dueño, la del vecino no existe.
 */
import { NextResponse } from "next/server";
import { actualizarMascotaSchema } from "@/lib/schemas/mascota";
import {
  actualizarMascota,
  borrarMascota,
  mascotaTieneHistorial,
  obtenerMascotaDeDueno,
} from "@/lib/db/mascotas";

/**
 * En Next 15 `params` es una PROMESA y hay que esperarla.
 *
 * Es el error de compilación más común de la clase: en Next 14 era un objeto
 * común, así que cualquier ejemplo viejo —o cualquier respuesta de IA
 * entrenada con código de Next 14— lo escribe sin el `await` y no compila.
 */
type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;

  // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
  const duenoId = "duena-de-ejemplo";

  const mascota = await obtenerMascotaDeDueno(id, duenoId);

  // Un id que no existe no es un error del servidor: es un 404.
  if (!mascota) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json(mascota);
}

export async function PATCH(request: Request, { params }: Contexto) {
  const { id } = await params;

  // 1. VALIDAR. `actualizarMascotaSchema` es el de crear con `.partial()`:
  //    PATCH lleva solo los campos que cambian, no el objeto entero.
  const body: unknown = await request.json();
  const resultado = actualizarMascotaSchema.safeParse(body);

  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 },
    );
  }

  // 2. AUTORIZAR.
  // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
  const duenoId = "duena-de-ejemplo";

  // 3. DELEGAR. El dueño viaja hasta el WHERE de la consulta: una mascota
  //    ajena no matchea y vuelve null.
  const mascota = await actualizarMascota(id, resultado.data, duenoId);

  if (!mascota) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // 4. RESPONDER. 200 y no 201: no se creó nada nuevo.
  return NextResponse.json(mascota);
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;

  // TODO (clase 6): el dueño sale de la sesión y 401 si no hay.
  const duenoId = "duena-de-ejemplo";

  const mascota = await obtenerMascotaDeDueno(id, duenoId);

  if (!mascota) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Regla de negocio de la spec: la libreta conserva historial, así que una
  // mascota con aplicaciones o certificados no se borra. 409 y no 400: el
  // cliente no mandó nada mal, es el estado actual el que choca.
  if (await mascotaTieneHistorial(id)) {
    return NextResponse.json(
      {
        error: "La mascota tiene historial sanitario cargado y no se puede borrar",
      },
      { status: 409 },
    );
  }

  await borrarMascota(id, duenoId);

  // 204 = salió bien y no hay nada que devolver. Un DELETE no devuelve body.
  return new NextResponse(null, { status: 204 });
}
