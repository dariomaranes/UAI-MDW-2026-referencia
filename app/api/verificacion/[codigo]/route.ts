/**
 * GET /api/verificacion/:codigo — la H6, y el ÚNICO endpoint público.
 *
 * Lo llama una aerolínea o una guardería que no tiene cuenta ni la va a
 * crear. Es público a propósito, y por eso mismo es el que más cuidado pide:
 * todo lo que devuelva está en internet para cualquiera que tenga un código.
 *
 * Tres decisiones que lo hacen distinto de todos los demás:
 *
 *  1. Devuelve lo MÍNIMO. `verificarCertificado` tiene su propio `select`,
 *     separado del de las pantallas propias, justamente para que nadie le
 *     agregue el dueño sin darse cuenta.
 *  2. El 404 no revela nada: "no encontrado" a secas, sin pistas sobre si el
 *     código estuvo cerca. Es el criterio de aceptación de la H6.
 *  3. Es cacheable y compartible por URL. Un GET bien hecho permite eso; una
 *     Server Action, no. Es el ejemplo de por qué el núcleo va por REST.
 */
import { NextResponse } from "next/server";
import { calcularVigencia, codigoVerificacionSchema } from "@/lib/schemas/certificado";
import { verificarCertificado } from "@/lib/db/certificados";

type Contexto = { params: Promise<{ codigo: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const { codigo } = await params;

  // 1. VALIDAR. Lo que viene por la URL es tan público como un body: se
  //    valida igual. El schema además normaliza a mayúsculas, así que el
  //    código funciona escrito como venga.
  const resultado = codigoVerificacionSchema.safeParse(codigo);

  // Un código con formato inválido se responde 404 y NO 400, que es la
  // excepción a la regla del resto de la API. Un 400 diría "ese código no
  // tiene la forma correcta", que es exactamente la pista que le sirve a
  // alguien probando códigos al azar.
  if (!resultado.success) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // 2. AUTORIZAR: nada. Es público, y está decidido en `docs/api.md`.

  // 3. DELEGAR.
  const certificado = await verificarCertificado(resultado.data);

  if (!certificado) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // 4. RESPONDER. La vigencia se calcula al leer, contra el reloj de ahora:
  //    un certificado emitido hace 40 días está VENCIDO aunque en la base
  //    siga diciendo EMITIDO. El estado guardado y la vigencia son dos cosas
  //    distintas, y esta es la diferencia entre lo que se guarda y lo que se
  //    calcula que se vio en la clase 3.
  return NextResponse.json({
    vigencia: calcularVigencia(certificado),
    mascota: certificado.mascota,
    emitidoEn: certificado.emitidoEn,
    vencimiento: certificado.vencimiento,
  });
}
