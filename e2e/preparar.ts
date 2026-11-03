/**
 * Corre una vez antes de todas las pruebas: deja la base lista y arma una
 * sesión por cada persona que las pruebas necesitan.
 *
 * ---------------------------------------------------------------------------
 * LAS PRUEBAS NO PASAN POR GOOGLE
 * ---------------------------------------------------------------------------
 * No pueden: el login de Google pide una persona, una contraseña y a veces un
 * celular. Y tampoco hace falta, porque lo que se quiere probar es el sistema,
 * no a Google.
 *
 * Lo que hace Google, al final, es que Auth.js escriba una cookie cifrada con
 * el `AUTH_SECRET` (clase 6). Esto escribe LA MISMA cookie, con el mismo
 * secreto y la misma función —`encode`, de Auth.js—, y la guarda en un
 * archivo que el navegador de la prueba carga antes de entrar.
 *
 * Fijate lo que NO hay: ningún "modo prueba" en `lib/auth.ts`, ningún usuario
 * mágico, ningún `if (process.env.E2E)`. Una puerta trasera para los tests es
 * una puerta trasera, y tarde o temprano llega a producción. Acá el código de
 * la app es exactamente el que corre en Vercel; lo único distinto es el
 * secreto, que en producción nadie conoce.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, Rol } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { SESION } from "./sesiones";

/** El nombre de la cookie en http. En https Auth.js le agrega `__Secure-`. */
const COOKIE = "authjs.session-token";

async function guardarSesion(
  archivo: string,
  usuario: { id: string; email: string; nombre: string; rol: Rol },
) {
  // El contenido es el que arma el callback `jwt` de `lib/auth.ts`: el id de
  // NUESTRA base y el rol. Por eso el usuario tiene que existir en la base.
  const valor = await encode({
    token: {
      sub: usuario.id,
      email: usuario.email,
      name: usuario.nombre,
      usuarioId: usuario.id,
      rol: usuario.rol,
    },
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE,
  });

  mkdirSync(path.dirname(archivo), { recursive: true });
  writeFileSync(
    archivo,
    JSON.stringify({
      cookies: [
        {
          name: COOKIE,
          value: valor,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}

export default async function preparar() {
  // La base, al día con las migraciones y con los datos del seed. El seed
  // limpia y recrea lo de Laika, Mishi y Rocco, así que cada corrida arranca
  // del mismo punto: es la "línea de base" de la lectura de la clase 12.
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma db seed", { stdio: "inherit" });

  const prisma = new PrismaClient();

  try {
    const dueno = await prisma.usuario.findUniqueOrThrow({
      where: { email: "ana@ejemplo.com" },
    });
    const veterinario = await prisma.usuario.findUniqueOrThrow({
      where: { email: "bruno@ejemplo.com" },
    });

    // Una segunda dueña, que no está en el seed porque solo la necesitan las
    // pruebas: es la que intenta ver las mascotas de Ana.
    const otraDuena = await prisma.usuario.upsert({
      where: { email: "carla@ejemplo.com" },
      update: {},
      create: { email: "carla@ejemplo.com", nombre: "Carla Ríos", rol: Rol.DUENO },
    });

    await guardarSesion(SESION.dueno, dueno);
    await guardarSesion(SESION.veterinario, veterinario);
    await guardarSesion(SESION.otraDuena, otraDuena);
  } finally {
    await prisma.$disconnect();
  }
}
