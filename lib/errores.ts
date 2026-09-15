/**
 * La traducción de un error a una respuesta HTTP. UN SOLO LUGAR.
 *
 * En la clase 5 cada handler terminaba con un `catch` que logueaba y
 * devolvía 500. Eso ya no alcanza: desde hoy `requerirUsuario` lanza, y si
 * ese error cae en el 500 genérico el usuario ve "error interno" cuando lo
 * que pasaba es que no había iniciado sesión.
 *
 * Los mensajes no se inventan acá: están escritos en el catálogo de errores
 * de `docs/api.md` desde la clase 5, en las dos filas que decían
 * "requerirUsuario — clase 6".
 */
import { NextResponse } from "next/server";
import { NoAutenticado, NoAutorizado } from "@/lib/auth";

/**
 * `endpoint` entra por parámetro para no perder lo que ya teníamos: el
 * `console.error` de cada handler lleva adelante el nombre de la ruta, que es
 * lo que hace utilizable un log de Vercel a las once de la noche.
 */
export function responderError(endpoint: string, error: unknown) {
  if (error instanceof NoAutenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (error instanceof NoAutorizado) {
    return NextResponse.json(
      { error: "No podés realizar esta operación" },
      { status: 403 },
    );
  }

  // Acá solo llega lo que NO se previó. El detalle va al log, que es
  // nuestro; la respuesta, que la lee un desconocido, no cuenta nada.
  console.error(endpoint, error);

  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
