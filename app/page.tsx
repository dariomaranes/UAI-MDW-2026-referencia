/**
 * Home del proyecto.
 *
 * Esto es un Server Component: corre en el servidor, puede leer de la base
 * directamente y nunca llega al navegador. Por eso puede llamar a
 * `listarMascotas` sin pasar por un endpoint HTTP.
 *
 * En la clase 9 se reemplaza por la portada real, con su diseño.
 */
import { listarMascotas } from "@/lib/db/mascotas";

// Esta página lee datos que cambian, así que se renderiza en cada request.
// Sin esta línea, Next.js intentaría generarla una sola vez durante el build
// —cuando todavía no hay base de datos disponible— y el deploy fallaría.
// En la clase 12 vemos cuándo conviene lo contrario: cachear y revalidar.
export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function Home() {
  // La primera vez que se levanta el proyecto todavía no hay base configurada.
  // En vez de reventar con un error de Prisma en la cara, se muestra qué falta.
  // Es el mismo criterio que van a aplicar en todo el sistema: un error
  // esperable no se propaga al usuario, se comunica.
  let mascotas: Awaited<ReturnType<typeof listarMascotas>> | null = null;

  try {
    mascotas = await listarMascotas();
  } catch {
    mascotas = null;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Libreta sanitaria</h1>
      <p className="mt-2 text-sm opacity-70">
        Proyecto de referencia de MDW 2026.
      </p>

      {mascotas === null ? (
        <section className="mt-8 rounded-lg border border-dashed p-6">
          <h2 className="text-lg font-semibold">Falta conectar la base de datos</h2>
          <p className="mt-2 text-sm opacity-80">
            El proyecto levanta, pero todavía no puede leer datos. Es lo esperable
            hasta que hagan el paso de base de datos de la clase 1:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm opacity-80">
            <li>Crear un proyecto en Supabase (o MongoDB Atlas).</li>
            <li>
              Copiar la connection string a <code>DATABASE_URL</code> en{" "}
              <code>.env.local</code>.
            </li>
            <li>
              Correr <code>npx prisma migrate dev</code> y{" "}
              <code>npm run db:seed</code>.
            </li>
          </ol>
        </section>
      ) : mascotas.length === 0 ? (
        <p className="mt-8 text-sm opacity-70">
          La base está conectada pero no hay datos. Corran <code>npm run db:seed</code>.
        </p>
      ) : (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Mascotas registradas</h2>
          <ul className="mt-4 space-y-3">
            {mascotas.map((mascota) => (
              <li key={mascota.id} className="rounded-lg border p-4">
                <h3 className="font-medium">{mascota.nombre}</h3>
                <p className="mt-1 text-sm opacity-80">
                  {mascota.especie === "PERRO" ? "Perro" : "Gato"} · nacida el{" "}
                  {formatoFecha.format(mascota.fechaNacimiento)}
                </p>
                <p className="mt-2 text-xs opacity-60">de {mascota.dueno.nombre}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
