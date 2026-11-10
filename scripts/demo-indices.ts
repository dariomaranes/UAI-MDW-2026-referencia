/**
 * DEMO DE LA CLASE 14: PARA QUÉ SIRVE UN ÍNDICE.
 *
 *   npm run db:carga        (una vez: 50.000 mascotas en una base aparte)
 *   npm run demo:indices
 *
 * Hace tres búsquedas que hace la app de verdad, cada una dos veces: sin su
 * índice y con él. Para cada una muestra cuánto tardó y cuántas filas tuvo
 * que revisar la base para encontrar lo que buscaba.
 *
 * El "sin índice" se arma adentro de una transacción que borra el índice,
 * mide y se deshace: la base queda exactamente como estaba.
 *
 * Por debajo es `EXPLAIN ANALYZE`, lo mismo que se puede escribir a mano en
 * `psql` (ver "Medir con muchos datos" en el README).
 */
import { pausa, usarBaseLocal } from "./base-local";

usarBaseLocal("libreta_carga");

/** Cada medición se repite y se queda con la mejor: la primera paga el disco. */
const REPETICIONES = 5;

const BUSQUEDAS = [
  {
    titulo: "Las mascotas de una dueña",
    dondeSeUsa: "la pantalla de inicio del dueño",
    sql: `SELECT * FROM "Mascota" WHERE "duenoId" = 'carga-dueno-17'`,
    indices: ["Mascota_duenoId_idx"],
  },
  {
    titulo: "Un certificado por su código de verificación",
    dondeSeUsa: "la página pública de verificación",
    sql: `SELECT * FROM "Certificado" WHERE "codigoVerificacion" = upper(substr(md5('carga-777'), 1, 12))`,
    indices: ["Certificado_codigoVerificacion_key"],
  },
  {
    titulo: "Las 20 solicitudes pendientes más viejas",
    dondeSeUsa: "la pantalla de inicio del veterinario",
    sql: `SELECT * FROM "Certificado" WHERE estado = 'SOLICITADO' ORDER BY "solicitadoEn" LIMIT 20`,
    indices: ["Certificado_estado_solicitadoEn_idx", "Certificado_una_solicitud_pendiente"],
  },
];

type Nodo = {
  "Node Type": string;
  "Actual Rows": number;
  "Actual Loops": number;
  "Rows Removed by Filter"?: number;
  Plans?: Nodo[];
};
type Plan = { Plan: Nodo; "Execution Time": number };

/** Cuántas filas tocó la base: las que devolvió cada lectura más las que descartó. */
function filasRevisadas(nodo: Nodo): number {
  const propias =
    nodo["Node Type"].endsWith("Scan") && nodo["Node Type"] !== "Bitmap Index Scan"
      ? (nodo["Actual Rows"] + (nodo["Rows Removed by Filter"] ?? 0)) * nodo["Actual Loops"]
      : 0;
  return propias + (nodo.Plans ?? []).reduce((suma, hijo) => suma + filasRevisadas(hijo), 0);
}

const miles = new Intl.NumberFormat("es-AR");
const filas = (n: number) => `${miles.format(n).padStart(6)} ${n === 1 ? "fila " : "filas"}`;
const ms = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gris = (t: string) => `\x1b[2m${t}\x1b[0m`;
const rojo = (t: string) => `\x1b[31m${t}\x1b[0m`;
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;
const negrita = (t: string) => `\x1b[1m${t}\x1b[0m`;

class Deshacer extends Error {}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const mascotas = await prisma.mascota.count();
    if (mascotas < 10_000) {
      console.log("\n La base de carga está vacía. Primero: npm run db:carga\n");
      return;
    }

    type Cliente = Pick<typeof prisma, "$queryRawUnsafe">;

    async function medir(db: Cliente, sql: string) {
      let mejor: Plan | undefined;
      for (let i = 0; i < REPETICIONES; i++) {
        const [fila] = await db.$queryRawUnsafe<{ "QUERY PLAN": Plan[] }[]>(
          `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`,
        );
        const plan = fila!["QUERY PLAN"][0]!;
        if (!mejor || plan["Execution Time"] < mejor["Execution Time"]) mejor = plan;
      }
      return { tiempo: mejor!["Execution Time"], filas: filasRevisadas(mejor!.Plan) };
    }

    async function medirSinIndice(sql: string, indices: string[]) {
      let resultado: Awaited<ReturnType<typeof medir>> | undefined;
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const indice of indices) await tx.$executeRawUnsafe(`DROP INDEX "${indice}"`);
            resultado = await medir(tx, sql);
            throw new Deshacer(); // el índice vuelve: nada de esto se guarda
          },
          { timeout: 60_000 },
        );
      } catch (error) {
        if (!(error instanceof Deshacer)) throw error;
      }
      return resultado!;
    }

    console.log(negrita(`\n Buscar en una base con ${miles.format(mascotas)} mascotas y sus certificados.`));
    console.log(" Cada búsqueda, sin índice y con índice.");

    for (const [n, busqueda] of BUSQUEDAS.entries()) {
      await pausa();
      const sin = await medirSinIndice(busqueda.sql, busqueda.indices);
      const con = await medir(prisma, busqueda.sql);
      const veces = Math.round(sin.tiempo / con.tiempo);

      console.log(negrita(`\n\n ${n + 1}. ${busqueda.titulo}`) + gris(`  (${busqueda.dondeSeUsa})\n`));
      console.log(
        `    sin índice   ${rojo(ms.format(sin.tiempo).padStart(6) + " ms")}   revisó ${rojo(filas(sin.filas))}`,
      );
      console.log(
        `    con índice   ${verde(ms.format(con.tiempo).padStart(6) + " ms")}   revisó ${verde(filas(con.filas))}` +
          negrita(`   → ${miles.format(veces)} veces más rápido`),
      );
    }
    console.log(
      gris("\n\n Sin índice, la base lee la tabla entera para encontrar lo que busca. Con índice, va directo.\n"),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
