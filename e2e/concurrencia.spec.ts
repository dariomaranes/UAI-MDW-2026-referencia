/**
 * DOS PEDIDOS A LA VEZ.
 *
 * Todas las otras pruebas hacen una cosa por vez, como la hace una persona.
 * Esta hace lo que pasa en producción y nunca en una demo: el mismo pedido,
 * diez veces, al mismo tiempo. El doble clic de alguien apurado, el reintento
 * automático de un celular con mala señal, dos pestañas abiertas.
 *
 * La regla que se pone a prueba es la del ADR 0002: una sola solicitud
 * pendiente por mascota y motivo. Una sola, aunque lleguen diez juntas.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ENCONTRÓ LA PRIMERA VEZ QUE CORRIÓ
 * ---------------------------------------------------------------------------
 * La regla estaba escrita como CONSULTAR Y DESPUÉS CREAR: ¿hay una pendiente?
 * no → crear. Con un pedido por vez es impecable. Con diez a la vez, los diez
 * consultan antes de que ninguno haya creado nada, los diez ven "no hay", y
 * los diez crean. Ninguno se equivocó: cada uno leyó la verdad de ese
 * instante. El error está en el hueco entre leer y escribir.
 *
 * El arreglo está en `prisma/migrations/*_una_solicitud_pendiente/`: la regla
 * la hace cumplir la base, que es la única que ve los diez pedidos a la vez.
 * Ver `lib/db/certificados.ts`, función `solicitarCertificado`.
 */
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { SESION } from "./sesiones";

const PEDIDOS_A_LA_VEZ = 10;

test.use({ storageState: SESION.dueno });

/** Laika, del seed: al día, así que lo único que puede rechazar es la regla. */
let laikaId = "";

test.beforeEach(async () => {
  const prisma = new PrismaClient();
  try {
    const laika = await prisma.mascota.findFirstOrThrow({
      where: { nombre: "Laika", dueno: { email: "ana@ejemplo.com" } },
    });
    laikaId = laika.id;

    // Cada corrida —y cada reintento del CI— arranca sin solicitudes
    // pendientes de guardería para Laika.
    await prisma.certificado.deleteMany({
      where: { mascotaId: laikaId, motivo: "GUARDERIA", estado: "SOLICITADO" },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test(`${PEDIDOS_A_LA_VEZ} pedidos iguales al mismo tiempo dejan UNA solicitud pendiente`, async ({
  request,
}) => {
  const pedido = { mascotaId: laikaId, motivo: "GUARDERIA" };

  // `Promise.all` y no un `for` con `await`: salen todos juntos, sin esperar
  // la respuesta del anterior. Es la diferencia entre diez personas en fila
  // y diez personas empujando la misma puerta.
  const respuestas = await Promise.all(
    Array.from({ length: PEDIDOS_A_LA_VEZ }, () =>
      request.post("/api/certificados", { data: pedido }),
    ),
  );

  const status = respuestas.map((r) => r.status()).sort();

  // Uno entra; los demás reciben el 409 del ADR 0002, el mismo que si
  // hubieran llegado de a uno. Un 500 acá sería otra forma de fallar: la
  // regla se cumpliría, pero el usuario vería "error del servidor".
  expect(status).toEqual([201, ...Array(PEDIDOS_A_LA_VEZ - 1).fill(409)]);

  // Y lo que importa de verdad, que no es la respuesta sino lo que quedó en
  // la base: una sola fila.
  const prisma = new PrismaClient();
  try {
    const pendientes = await prisma.certificado.count({
      where: { mascotaId: laikaId, motivo: "GUARDERIA", estado: "SOLICITADO" },
    });
    expect(pendientes).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
});
