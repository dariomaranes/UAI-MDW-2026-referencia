/**
 * Acceso a datos del catálogo de vacunas — el "plan de vacunación".
 *
 * Vacuna es el CATÁLOGO (qué vacunas existen y cómo funciona cada una), no lo
 * que se le dio a una mascota: eso es Aplicacion. De acá salen la edad mínima
 * y el intervalo de refuerzo con los que `lib/estado-sanitario.ts` calcula
 * qué le falta a cada mascota.
 */
import { prisma } from "@/lib/db/client";
import type { Especie } from "@/lib/schemas/comunes";
import type { AplicacionCargada, VacunaDelPlan } from "@/lib/estado-sanitario";

/**
 * El `select` es exactamente el tipo `VacunaDelPlan` que pide la regla.
 *
 * No es una optimización: es lo que mantiene honesta la separación. La
 * función de reglas declara qué necesita, esta consulta trae eso y nada más,
 * y si mañana la regla necesita un campo más, TypeScript avisa acá.
 */
const CAMPOS_DEL_PLAN = {
  id: true,
  nombre: true,
  edadMinimaMeses: true,
  intervaloRefuerzoDias: true,
  obligatoria: true,
} as const;

/** El plan completo de una especie: todas sus vacunas, obligatorias o no. */
export async function planDeVacunacion(especie: Especie): Promise<VacunaDelPlan[]> {
  return prisma.vacuna.findMany({
    where: { especie },
    orderBy: { nombre: "asc" },
    select: CAMPOS_DEL_PLAN,
  });
}

/** Una vacuna del catálogo. `null` si el id no existe → el handler responde 404. */
export async function obtenerVacuna(id: string) {
  return prisma.vacuna.findUnique({
    where: { id },
    select: { ...CAMPOS_DEL_PLAN, especie: true },
  });
}

/**
 * Los dos insumos del estado sanitario, en una sola función y en paralelo.
 *
 * Existe para que los tres handlers que preguntan por el estado sanitario no
 * repitan las mismas dos consultas. Ojo con lo que NO hace: no calcula nada y
 * no lee el reloj. Trae los datos; decidir es de `lib/estado-sanitario.ts` y
 * el `hoy` lo pone el handler.
 *
 * `Promise.all` y no dos `await` seguidos: las consultas no dependen una de
 * la otra, así que esperarlas en serie duplica el tiempo del endpoint sin
 * ninguna razón.
 */
export async function datosDelEstadoSanitario(
  especie: Especie,
  mascotaId: string,
): Promise<{ plan: VacunaDelPlan[]; aplicaciones: AplicacionCargada[] }> {
  const [plan, aplicaciones] = await Promise.all([
    planDeVacunacion(especie),
    prisma.aplicacion.findMany({
      where: { mascotaId },
      // Los tres campos del tipo `AplicacionCargada`, ni uno más: la regla no
      // necesita saber quién aplicó la vacuna ni qué observó.
      select: { vacunaId: true, fecha: true, proximaDosis: true },
    }),
  ]);

  return { plan, aplicaciones };
}
