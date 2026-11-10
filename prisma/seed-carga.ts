/**
 * MUCHOS DATOS, PARA MEDIR (clase 14).
 *
 *   npm run db:carga
 *
 * El seed normal deja tres mascotas, y con tres mascotas todo es instantáneo,
 * hasta lo que está mal. Esto arma lo que tendría el sistema después de un
 * par de años andando —5.000 dueños, 50.000 mascotas, 150.000 aplicaciones,
 * 50.000 certificados— para medir qué consultas se ponen lentas
 * (`npm run demo:indices`).
 *
 * Va en una base APARTE, `libreta_carga`, dentro del mismo contenedor de
 * Docker de las pruebas: con 5.000 solicitudes esperando, la mascota que
 * registra la prueba del flujo principal no entraría en la lista del
 * veterinario, y la prueba fallaría por los datos y no por el código. La crea
 * sola si no existe, y como las pruebas, se niega a correr si no es local.
 *
 * Los datos se generan en la base con `generate_series` y no con un `for` de
 * `create`: 250.000 filas de a una son 250.000 viajes de red. Así son cuatro.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { usarBaseLocal } from "../scripts/base-local";

const BASE_DE_CARGA = "libreta_carga";

const DUENOS = 5_000;
const VETERINARIOS = 20;
const MASCOTAS = 50_000;

async function crearLaBase() {
  // Para crear una base hay que estar conectado a OTRA: la `postgres`, que
  // viene con todo servidor.
  const admin = new PrismaClient({
    datasources: { db: { url: usarBaseLocal("postgres").toString() } },
  });
  try {
    const existe = await admin.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${BASE_DE_CARGA}`;
    if (existe.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${BASE_DE_CARGA}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  // Las mismas tablas y el mismo seed que cualquier otra base del proyecto.
  usarBaseLocal(BASE_DE_CARGA);
  execSync("npx prisma migrate deploy", { stdio: "ignore" });
  execSync("npx prisma db seed", { stdio: "ignore" });
}

let prisma: PrismaClient;

async function main() {
  await crearLaBase();
  prisma = new PrismaClient();

  // Se puede correr dos veces: primero borra lo que dejó la anterior.
  await prisma.$executeRaw`DELETE FROM "Certificado" WHERE "mascotaId" LIKE 'carga-%'`;
  await prisma.$executeRaw`DELETE FROM "Aplicacion" WHERE "mascotaId" LIKE 'carga-%'`;
  await prisma.$executeRaw`DELETE FROM "Mascota" WHERE id LIKE 'carga-%'`;
  await prisma.$executeRaw`DELETE FROM "Usuario" WHERE id LIKE 'carga-%'`;

  await prisma.$executeRaw`
    INSERT INTO "Usuario" (id, email, nombre, rol)
    SELECT 'carga-dueno-' || i, 'dueno' || i || '@carga.test', 'Dueño ' || i, 'DUENO'::"Rol"
    FROM generate_series(1, ${DUENOS}) i
    UNION ALL
    SELECT 'carga-vet-' || i, 'vet' || i || '@carga.test', 'Veterinario ' || i, 'VETERINARIO'::"Rol"
    FROM generate_series(1, ${VETERINARIOS}) i`;

  // Repartidas en dos años, para que "las más nuevas primero" tenga sentido.
  await prisma.$executeRaw`
    INSERT INTO "Mascota" (id, nombre, especie, "fechaNacimiento", "duenoId", "creadaEn", "actualizadaEn")
    SELECT 'carga-' || i,
           'Mascota ' || i,
           (CASE WHEN i % 3 = 0 THEN 'GATO' ELSE 'PERRO' END)::"Especie",
           now() - (365 + i % 3000) * interval '1 day',
           'carga-dueno-' || (1 + i % ${DUENOS}),
           now() - (i % 730) * interval '1 day' - (i % 1440) * interval '1 minute',
           now()
    FROM generate_series(1, ${MASCOTAS}) i`;

  // Tres aplicaciones por mascota. Una de cada 25 mascotas la atendió Bruno
  // —el veterinario del seed—, así que su pantalla de inicio tiene 2.000.
  await prisma.$executeRaw`
    INSERT INTO "Aplicacion" (id, fecha, "mascotaId", "vacunaId", "veterinarioId")
    SELECT 'carga-' || i || '-' || n,
           now() - (n * 120 + i % 100) * interval '1 day',
           'carga-' || i,
           CASE WHEN i % 3 = 0 THEN 'antirrabica-gato' ELSE 'antirrabica-perro' END,
           CASE WHEN i % 25 = 0
                THEN (SELECT id FROM "Usuario" WHERE email = 'bruno@ejemplo.com')
                ELSE 'carga-vet-' || (1 + i % ${VETERINARIOS}) END
    FROM generate_series(1, ${MASCOTAS}) i, generate_series(1, 3) n`;

  // Un certificado por mascota: uno de cada diez sigue esperando.
  await prisma.$executeRaw`
    INSERT INTO "Certificado" (id, "mascotaId", motivo, estado, "solicitadoEn",
                               "emitidoEn", vencimiento, "codigoVerificacion", "emisorId")
    SELECT 'carga-' || i,
           'carga-' || i,
           'VIAJE'::"MotivoCertificado",
           (CASE WHEN i % 10 = 0 THEN 'SOLICITADO' ELSE 'EMITIDO' END)::"EstadoCertificado",
           now() - (i % 700) * interval '1 day',
           CASE WHEN i % 10 = 0 THEN NULL ELSE now() - (i % 700) * interval '1 day' END,
           CASE WHEN i % 10 = 0 THEN NULL ELSE now() - (i % 700 - 30) * interval '1 day' END,
           CASE WHEN i % 10 = 0 THEN NULL ELSE upper(substr(md5('carga-' || i), 1, 12)) END,
           CASE WHEN i % 10 = 0 THEN NULL ELSE 'carga-vet-' || (1 + i % ${VETERINARIOS}) END
    FROM generate_series(1, ${MASCOTAS}) i`;

  // Que el planificador de Postgres sepa cuántas filas hay ahora. Sin esto,
  // los primeros EXPLAIN mienten.
  await prisma.$executeRaw`ANALYZE`;

  console.log(
    `Carga lista: ${DUENOS} dueños, ${VETERINARIOS} veterinarios, ${MASCOTAS} mascotas, ` +
      `${MASCOTAS * 3} aplicaciones, ${MASCOTAS} certificados (${MASCOTAS / 10} esperando).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma?.$disconnect());
