/**
 * El caso de uso "registrar la aplicación de una vacuna" (H2), una sola vez.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE ARCHIVO APARECE EN LA CLASE 12 Y NO ANTES
 * ---------------------------------------------------------------------------
 * Hasta hoy estas reglas vivían adentro de `app/api/mascotas/[id]/aplicaciones/
 * route.ts`, y estaba bien: había UNA puerta. Hoy aparece la segunda —el
 * formulario, con su Server Action— y una regla escrita adentro de un handler
 * no se puede reusar desde otro lado sin copiarla.
 *
 * Copiarla es la opción que parece más rápida y es la que rompe el sistema: el
 * día que cambie la edad mínima, una de las dos copias va a quedar vieja y
 * nadie se va a enterar hasta que un cachorro reciba una vacuna que no le
 * correspondía. Es el mismo argumento de la clase 10 con `verificarCertificado`
 * y `calcularVigencia`, ahora del lado que escribe.
 *
 * ---------------------------------------------------------------------------
 * ESTE MÓDULO NO SABE QUE EXISTE HTTP, Y TAMPOCO QUE EXISTEN LOS FORMULARIOS
 * ---------------------------------------------------------------------------
 * No devuelve un `NextResponse` ni un status code, y no sabe qué es un campo
 * de formulario. Devuelve un resultado con un `motivo`, y CADA PUERTA TRADUCE:
 *
 *   el Route Handler   motivo → status code   (404, 409)
 *   la Server Action   motivo → mensaje para la persona, arriba del formulario
 *
 * Esa es la razón por la que el `motivo` es un string de un conjunto cerrado y
 * no un texto libre: un texto libre obligaría a comparar frases para decidir
 * un status code, y eso se rompe la primera vez que alguien corrige una falta
 * de ortografía.
 */
import {
  registrarAplicacion,
  type AplicacionCreada,
} from "@/lib/db/aplicaciones";
import { obtenerMascota } from "@/lib/db/mascotas";
import { obtenerVacuna } from "@/lib/db/vacunas";
import {
  alcanzaLaEdadMinima,
  calcularProximaDosis,
} from "@/lib/estado-sanitario";
import type { RegistrarAplicacionInput } from "@/lib/schemas/aplicacion";

/**
 * Los cuatro motivos por los que esto puede fallar sin que nada esté roto.
 *
 * No incluye "la base no respondió": eso no es un resultado del caso de uso,
 * es una excepción, y sube. La diferencia importa — un fallo previsto se le
 * explica a la persona; uno imprevisto va a `error.tsx` y a los logs.
 */
export type MotivoDeRechazo =
  | "MASCOTA_NO_ENCONTRADA"
  | "VACUNA_NO_ENCONTRADA"
  | "ESPECIE_NO_COINCIDE"
  | "EDAD_INSUFICIENTE";

export type ResultadoRegistro =
  | { ok: true; aplicacion: AplicacionCreada }
  | { ok: false; motivo: MotivoDeRechazo; mensaje: string };

export async function registrarAplicacionDeVacuna(
  datos: RegistrarAplicacionInput,
  veterinarioId: string,
): Promise<ResultadoRegistro> {
  const mascota = await obtenerMascota(datos.mascotaId);

  if (!mascota) {
    return {
      ok: false,
      motivo: "MASCOTA_NO_ENCONTRADA",
      mensaje: "No encontramos esa mascota.",
    };
  }

  const vacuna = await obtenerVacuna(datos.vacunaId);

  if (!vacuna) {
    return {
      ok: false,
      motivo: "VACUNA_NO_ENCONTRADA",
      mensaje: "No encontramos esa vacuna en el catálogo.",
    };
  }

  // Una vacuna de gatos no se le aplica a un perro. La regla no está en Zod
  // porque para decidirla hay que mirar la base: es una regla del sistema, no
  // del dato.
  if (vacuna.especie !== mascota.especie) {
    return {
      ok: false,
      motivo: "ESPECIE_NO_COINCIDE",
      mensaje: `${vacuna.nombre} corresponde a ${vacuna.especie.toLowerCase()}, y ${mascota.nombre} es ${mascota.especie.toLowerCase()}.`,
    };
  }

  if (
    !alcanzaLaEdadMinima(
      mascota.fechaNacimiento,
      vacuna.edadMinimaMeses,
      datos.fecha,
    )
  ) {
    return {
      ok: false,
      motivo: "EDAD_INSUFICIENTE",
      mensaje: `${vacuna.nombre} se aplica a partir de los ${vacuna.edadMinimaMeses} meses, y a esa fecha ${mascota.nombre} no los tenía.`,
    };
  }

  const aplicacion = await registrarAplicacion(
    datos,
    veterinarioId,
    calcularProximaDosis(datos.fecha, vacuna.intervaloRefuerzoDias),
  );

  return { ok: true, aplicacion };
}
