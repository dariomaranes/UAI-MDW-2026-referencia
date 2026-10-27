/**
 * /api/mascotas/:id/aplicaciones — el historial sanitario (H2 y H3).
 *
 * Está ANIDADO bajo la mascota porque una aplicación no tiene sentido sin
 * ella: no existe "la aplicación 12" suelta, existe "una vacuna que se le dio
 * a Laika". Un solo nivel de anidamiento, nunca dos.
 *
 * El POST de este archivo es el mejor ejemplo de la clase 5, porque las tres
 * reglas de la H2 caen en tres capas distintas:
 *
 *   "la fecha no puede ser futura"        → Zod, mirando solo el body  → 400
 *   "la vacuna es de otra especie"        → hay que ir a buscarla      → 409
 *   "no llega a la edad mínima"           → hacen falta dos consultas  → 409
 *
 * Las tres son reglas de negocio de la spec. Lo que las separa no es su
 * importancia: es CON QUÉ INFORMACIÓN alcanza para decidirlas.
 */
import { NextResponse } from "next/server";
import { registrarAplicacionSchema } from "@/lib/schemas/aplicacion";
import { listarAplicacionesDeMascota } from "@/lib/db/aplicaciones";
import { obtenerMascotaVisiblePara } from "@/lib/db/mascotas";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import {
  registrarAplicacionDeVacuna,
  type MotivoDeRechazo,
} from "@/lib/casos/registrar-aplicacion";

type Contexto = { params: Promise<{ id: string }> };

/**
 * La traducción de este handler: motivo del dominio → status code.
 *
 * `Record<MotivoDeRechazo, number>` y no un `switch`: el día que el caso de
 * uso agregue un motivo nuevo, esto deja de compilar hasta que alguien decida
 * con qué número se responde. Con un `switch` sin `default`, el motivo nuevo
 * saldría como 500 y parecería un bug del servidor.
 *
 * 404 cuando el recurso no existe; 409 cuando existe pero el estado del
 * sistema no admite la operación. Es la tabla de la clase 5.
 */
const STATUS_POR_MOTIVO: Record<MotivoDeRechazo, number> = {
  MASCOTA_NO_ENCONTRADA: 404,
  VACUNA_NO_ENCONTRADA: 404,
  ESPECIE_NO_COINCIDE: 409,
  EDAD_INSUFICIENTE: 409,
};

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // El historial lo leen los dos roles: el dueño el de sus mascotas, el
    // veterinario el de cualquiera. Lo dice la columna "Rol" de `docs/api.md`.
    const usuario = await requerirUsuario();

    const mascota = await obtenerMascotaVisiblePara(id, usuario.id, usuario.rol);

    if (!mascota) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json(await listarAplicacionesDeMascota(mascota.id));
  } catch (error) {
    return responderError("GET /api/mascotas/:id/aplicaciones", error);
  }
}

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    // 1. VALIDAR. La mascota sale de la URL y se inyecta antes de parsear:
    //    si el body trae otro `mascotaId`, este lo pisa. Es el mismo criterio
    //    del `duenoId` de la clase 4 — la identidad de un recurso no se
    //    negocia con el cliente.
    const body: unknown = await request.json();
    const resultado = registrarAplicacionSchema.safeParse({
      ...(body as object),
      mascotaId: id,
    });

    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const datos = resultado.data;

    // 2. AUTORIZAR. Solo el veterinario registra aplicaciones.
    const veterinario = await requerirUsuario("VETERINARIO");

    // 3. EJECUTAR EL CASO DE USO. Las reglas —especie, edad mínima, próxima
    //    dosis— ya no están acá: viven en `lib/casos/`, porque desde la clase
    //    12 las usa también el formulario. Este handler quedó con lo único que
    //    es suyo: traducir el resultado a HTTP.
    const registro = await registrarAplicacionDeVacuna(datos, veterinario.id);

    if (!registro.ok) {
      return NextResponse.json(
        { error: registro.mensaje },
        { status: STATUS_POR_MOTIVO[registro.motivo] },
      );
    }

    return NextResponse.json(registro.aplicacion, { status: 201 });
  } catch (error) {
    return responderError("POST /api/mascotas/:id/aplicaciones", error);
  }
}
