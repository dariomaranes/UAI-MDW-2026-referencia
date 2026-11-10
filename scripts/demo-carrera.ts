/**
 * DEMO DE LA CLASE 14: DIEZ PEDIDOS AL MISMO TIEMPO.
 *
 *   npm run demo:carrera
 *
 * Llama diez veces a la vez al MISMO caso de uso que usan la pantalla y la
 * API (`lib/casos/solicitar-certificado.ts`): Ana pide un certificado de
 * guardería para Laika. Primero sin la regla en la base, después con ella, y
 * cuenta lo que quedó guardado.
 *
 * Corre contra la base local de Docker (`.env.e2e`), nunca otra. Y al
 * terminar, pase lo que pase, la base queda como estaba: con el índice.
 */
import { pausa, usarBaseLocal } from "./base-local";

usarBaseLocal();

const PEDIDOS = 10;

const INDICE = "Certificado_una_solicitud_pendiente";
const CREAR_INDICE = `CREATE UNIQUE INDEX IF NOT EXISTS "${INDICE}"
  ON "Certificado" ("mascotaId", "motivo") WHERE "estado" = 'SOLICITADO'`;

const gris = (t: string) => `\x1b[2m${t}\x1b[0m`;
const rojo = (t: string) => `\x1b[31m${t}\x1b[0m`;
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;
const negrita = (t: string) => `\x1b[1m${t}\x1b[0m`;

async function main() {
  const { prisma } = await import("@/lib/db/client");
  const { solicitarCertificadoDeMascota } = await import("@/lib/casos/solicitar-certificado");

  const ana = await prisma.usuario.findUniqueOrThrow({ where: { email: "ana@ejemplo.com" } });
  const laika = await prisma.mascota.findFirstOrThrow({ where: { nombre: "Laika", duenoId: ana.id } });

  const pendientes = () =>
    prisma.certificado.findMany({
      where: { mascotaId: laika.id, motivo: "GUARDERIA", estado: "SOLICITADO" },
      orderBy: { solicitadoEn: "asc" },
      select: { solicitadoEn: true },
    });
  const limpiar = () =>
    prisma.certificado.deleteMany({
      where: { mascotaId: laika.id, motivo: "GUARDERIA", estado: "SOLICITADO" },
    });

  /** Los diez pedidos, juntos. Devuelve cuántos entraron y cuántos rebotaron. */
  async function diezALaVez() {
    const resultados = await Promise.all(
      Array.from({ length: PEDIDOS }, () =>
        solicitarCertificadoDeMascota({ mascotaId: laika.id, motivo: "GUARDERIA" }, ana.id),
      ),
    );
    return {
      aceptados: resultados.filter((r) => r.ok).length,
      rechazados: resultados.filter((r) => !r.ok).length,
    };
  }

  function mostrarFilas(filas: { solicitadoEn: Date }[]) {
    for (const f of filas) {
      console.log(gris(`     Laika · GUARDERÍA · pendiente · ${f.solicitadoEn.toISOString().slice(11, 23)}`));
    }
  }

  try {
    console.log(negrita(`\n Ana pide un certificado de guardería para Laika, ${PEDIDOS} veces al mismo tiempo.`));
    console.log(" La regla dice: una sola solicitud pendiente por mascota y motivo.");

    // ---- 1. Solo con el `if` del código --------------------------------
    await pausa("Enter: primero, con la regla SOLO en el código…");
    await limpiar();
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${INDICE}"`);

    const sinRegla = await diezALaVez();
    const filasSinRegla = await pendientes();

    console.log(negrita("\n\n 1. La regla solo en el código (un if antes de guardar)\n"));
    console.log(`   aceptados: ${sinRegla.aceptados}   rechazados: ${sinRegla.rechazados}`);
    console.log(`   guardadas en la base: ${rojo(negrita(String(filasSinRegla.length)))}\n`);
    mostrarFilas(filasSinRegla);
    console.log(
      rojo(`\n   ✘ Tendría que haber 1. Preguntaron "¿hay una pendiente?" antes de que alguno la creara.`),
    );

    // ---- 2. Con el índice único ----------------------------------------
    await pausa("Enter: ahora, con la regla en la base…");
    await limpiar();
    await prisma.$executeRawUnsafe(CREAR_INDICE);

    const conRegla = await diezALaVez();
    const filasConRegla = await pendientes();

    console.log(negrita("\n\n 2. La regla en la base (un índice único)\n"));
    console.log(`   aceptados: ${conRegla.aceptados}   rechazados: ${conRegla.rechazados}  ${gris("(409: ya hay una pendiente)")}`);
    console.log(`   guardadas en la base: ${verde(negrita(String(filasConRegla.length)))}\n`);
    mostrarFilas(filasConRegla);
    console.log(verde("\n   ✔ Mismo código, mismos pedidos. La base dejó pasar al primero y rechazó al resto.\n"));
  } finally {
    // La base queda como estaba, aunque la demo se corte en el medio.
    await limpiar();
    await prisma.$executeRawUnsafe(CREAR_INDICE);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
