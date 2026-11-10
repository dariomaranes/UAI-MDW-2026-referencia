/**
 * Las demos de la clase 14 tocan la base a propósito: sacan un índice,
 * mandan pedidos duplicados, cargan 250.000 filas. Todo eso, en la base de
 * Docker de las pruebas y nunca en otra.
 *
 * Por eso no leen `.env.local` —que apunta a Supabase— sino `.env.e2e`, y
 * se niegan a arrancar si la base no es local. Es el mismo cinturón que
 * `playwright.config.ts`.
 */
import path from "node:path";
import { config as cargarEnv } from "dotenv";

/**
 * Deja `DATABASE_URL` apuntando a la base local de Docker. Con `nombre`, a
 * otra base del mismo contenedor (la de carga, por ejemplo).
 *
 * Se llama ANTES de importar Prisma: el cliente lee la variable al crearse.
 */
export function usarBaseLocal(nombre?: string): URL {
  cargarEnv({ path: path.join(__dirname, "..", ".env.e2e"), quiet: true, override: true });

  const url = new URL(process.env.DATABASE_URL ?? "postgresql://sin-definir");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`Esto solo corre contra una base local, y DATABASE_URL apunta a ${url.hostname}.`);
  }

  if (nombre) url.pathname = `/${nombre}`;
  process.env.DATABASE_URL = url.toString();
  process.env.DIRECT_URL = url.toString();
  return url;
}

/** Espera un Enter, para que la demo vaya al ritmo de quien la cuenta. */
export async function pausa(texto = "Enter para seguir…"): Promise<void> {
  if (!process.stdin.isTTY) return;
  process.stdout.write(`\n   \x1b[2m${texto}\x1b[0m`);
  // `resume` antes de escuchar: después del primer Enter la entrada queda
  // pausada, y sin esto el segundo Enter nunca llega.
  process.stdin.resume();
  await new Promise<void>((listo) => {
    process.stdin.once("data", () => listo());
  });
  process.stdin.pause();
}
