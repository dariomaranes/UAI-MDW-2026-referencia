import path from "node:path";
import { config as cargarEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Configuración de Prisma (reemplaza a la clave `prisma` del package.json,
// que quedó deprecada).
//
// Cuando existe este archivo, Prisma deja de leer los .env por su cuenta:
// hay que cargarlos a mano. Usamos .env.local porque es el archivo que
// también usa Next.js en desarrollo, así hay un solo lugar con las variables.
//
// Las rutas se arman desde la ubicación de ESTE archivo y no relativas al
// directorio actual: el CLI corre desde la raíz del proyecto, pero otras
// herramientas que leen esta configuración no necesariamente, y con rutas
// relativas se quedaban sin variables de entorno.
const raiz = import.meta.dirname;

cargarEnv({ path: path.join(raiz, ".env.local"), quiet: true });
cargarEnv({ path: path.join(raiz, ".env"), quiet: true });

export default defineConfig({
  schema: path.join(raiz, "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
