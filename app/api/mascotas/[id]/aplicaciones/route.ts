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
import {
  listarAplicacionesDeMascota,
  registrarAplicacion,
} from "@/lib/db/aplicaciones";
import { obtenerMascota, obtenerMascotaVisiblePara } from "@/lib/db/mascotas";
import { requerirUsuario } from "@/lib/auth";
import { responderError } from "@/lib/errores";
import { obtenerVacuna } from "@/lib/db/vacunas";
import {
  alcanzaLaEdadMinima,
  calcularProximaDosis,
} from "@/lib/estado-sanitario";

type Contexto = { params: Promise<{ id: string }> };

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

    // 2. AUTORIZAR. Acá el 403 corresponde y el 404 no: el problema es el
    //    ROL, no la pertenencia. Un dueño no registra aplicaciones aunque la
    //    mascota sea suya — la vacuna la aplica un profesional, y el
    //    certificado que sale de ahí vale porque lo firmó alguien habilitado.
    //
    //    `requerirUsuario("VETERINARIO")` hace las dos preguntas de una: si
    //    no hay sesión lanza NoAutenticado (401) y si el rol no alcanza,
    //    NoAutorizado (403).
    const veterinario = await requerirUsuario("VETERINARIO");

    // Un veterinario atiende mascotas de cualquier dueño, así que esta
    // consulta no lleva `duenoId`: el permiso ya se verificó arriba.
    const mascota = await obtenerMascota(datos.mascotaId);

    if (!mascota) {
      return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });
    }

    const vacuna = await obtenerVacuna(datos.vacunaId);

    if (!vacuna) {
      return NextResponse.json({ error: "Vacuna no encontrada" }, { status: 404 });
    }

    // 3. LAS REGLAS DE NEGOCIO. Todo lo de acá abajo necesitó dos consultas
    //    para poder opinar, y por eso ninguna de estas dos reglas podía vivir
    //    en el schema.

    // El catálogo tiene la misma vacuna para perro y para gato, con edades
    // mínimas distintas. Aplicar la versión felina a un perro no es un error
    // de formato: el body está perfecto y el id existe. Es un 409.
    if (vacuna.especie !== mascota.especie) {
      return NextResponse.json(
        {
          error: `${vacuna.nombre} del catálogo corresponde a ${vacuna.especie}, y ${mascota.nombre} es ${mascota.especie}`,
        },
        { status: 409 },
      );
    }

    // La edad se evalúa contra la FECHA DE LA APLICACIÓN, no contra hoy.
    // Registrar hoy una vacuna que se aplicó hace dos años tiene que
    // verificar la edad que la mascota tenía ese día, no la que tiene ahora.
    // Es la clase de detalle que solo se puede razonar si la fecha es un
    // parámetro de la regla y no un `new Date()` escondido adentro.
    if (
      !alcanzaLaEdadMinima(
        mascota.fechaNacimiento,
        vacuna.edadMinimaMeses,
        datos.fecha,
      )
    ) {
      return NextResponse.json(
        {
          error: `${vacuna.nombre} se aplica a partir de los ${vacuna.edadMinimaMeses} meses`,
          // El dato estructurado va aparte del mensaje: la pantalla lo usa
          // para mostrar desde cuándo, sin tener que parsear castellano.
          edadMinimaMeses: vacuna.edadMinimaMeses,
        },
        { status: 409 },
      );
    }

    // 4. DELEGAR. La próxima dosis la calcula el servidor con el plan de la
    //    vacuna: es un dato derivado y por eso salió del body en esta clase.
    const aplicacion = await registrarAplicacion(
      datos,
      // Quién aplicó la vacuna baja de la sesión, nunca del body. Es un
      // registro sanitario: dice quién se hizo responsable.
      veterinario.id,
      calcularProximaDosis(datos.fecha, vacuna.intervaloRefuerzoDias),
    );

    // 5. RESPONDER.
    return NextResponse.json(aplicacion, { status: 201 });
  } catch (error) {
    return responderError("POST /api/mascotas/:id/aplicaciones", error);
  }
}
