/**
 * Home del proyecto.
 *
 * Esto es un Server Component: corre en el servidor, puede leer la sesión y la
 * base directamente, y nunca llega al navegador. Por eso puede llamar a
 * `obtenerUsuario` y a `lib/db/` sin pasar por un endpoint HTTP.
 *
 * Desde la clase 6 tiene dos estados, y el de arriba es el importante:
 *
 *   sin sesión  →  un botón para entrar, y NADA de datos
 *   con sesión  →  quién sos, con qué rol, y lo que te corresponde ver
 *
 * Hasta ayer esta página listaba todas las mascotas del sistema con el nombre
 * de cada dueño, sin preguntar nada. Era andamio para verificar que la base
 * estuviera conectada, y mientras no había sesión no había alternativa. Hoy sí
 * la hay, y dejarlo así sería el ejemplo perfecto de lo que la clase dice que
 * no se hace: una pantalla pública que muestra datos de todo el mundo.
 *
 * En la clase 9 se reemplaza por la portada real, con su diseño.
 */
import type { Especie } from "@prisma/client";
import { obtenerUsuario, signIn, signOut } from "@/lib/auth";
import {
  listarMascotasAtendidasPor,
  listarMascotasDeDueno,
} from "@/lib/db/mascotas";

// Esta página lee datos que cambian, así que se renderiza en cada request.
// Sin esta línea, Next.js intentaría generarla una sola vez durante el build
// —cuando todavía no hay base de datos disponible— y el deploy fallaría.
// En la clase 12 vemos cuándo conviene lo contrario: cachear y revalidar.
export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/**
 * Las dos consultas devuelven campos distintos —al dueño no hay que repetirle
 * su propio nombre— así que la página las normaliza a una sola forma antes de
 * pintar. Es un Data Transfer Object hecho a mano: la vista no debería tener
 * que saber de qué consulta vino cada fila.
 */
type Fila = {
  id: string;
  nombre: string;
  especie: Especie;
  fechaNacimiento: Date;
  dueno: string | null;
};

export default async function Home() {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Libreta sanitaria</h1>
        <p className="mt-2 text-sm opacity-70">
          Proyecto de referencia de MDW 2026.
        </p>

        <section className="mt-8 rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Iniciá sesión para continuar</h2>
          <p className="mt-2 text-sm opacity-80">
            El sistema no muestra ningún dato sin saber quién lo pide.
          </p>

          {/*
            El formulario invoca una Server Action: la función corre en el
            servidor y el navegador solo manda un POST. Es el mismo mecanismo
            de la clase 4 —el stub y el control remoto—, ahora con Auth.js del
            otro lado.
          */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mt-4 rounded-md border px-4 py-2 text-sm font-medium"
            >
              Entrar con Google
            </button>
          </form>
        </section>
      </main>
    );
  }

  const esVeterinario = usuario.rol === "VETERINARIO";

  // La primera vez que se levanta el proyecto todavía no hay base configurada.
  // En vez de reventar con un error de Prisma en la cara, se muestra qué falta.
  // Es el mismo criterio que van a aplicar en todo el sistema: un error
  // esperable no se propaga al usuario, se comunica.
  let mascotas: Fila[] | null = null;

  try {
    mascotas = esVeterinario
      ? (await listarMascotasAtendidasPor(usuario.id)).map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          fechaNacimiento: m.fechaNacimiento,
          dueno: m.dueno.nombre,
        }))
      : (await listarMascotasDeDueno(usuario.id)).map((m) => ({
          id: m.id,
          nombre: m.nombre,
          especie: m.especie,
          fechaNacimiento: m.fechaNacimiento,
          dueno: null,
        }));
  } catch {
    mascotas = null;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Libreta sanitaria</h1>
          <p className="mt-2 text-sm opacity-70">
            {usuario.nombre} · {esVeterinario ? "Veterinario" : "Dueño"}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="rounded-md border px-3 py-1.5 text-sm">
            Salir
          </button>
        </form>
      </div>

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
          {esVeterinario
            ? "Todavía no atendiste ninguna mascota. Registrá una aplicación y va a aparecer acá."
            : "Todavía no cargaste ninguna mascota."}
        </p>
      ) : (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            {esVeterinario ? "Mis pacientes" : "Mis mascotas"}
          </h2>
          <ul className="mt-4 space-y-3">
            {mascotas.map((mascota) => (
              <li key={mascota.id} className="rounded-lg border p-4">
                <h3 className="font-medium">{mascota.nombre}</h3>
                <p className="mt-1 text-sm opacity-80">
                  {mascota.especie === "PERRO" ? "Perro" : "Gato"} · nacida el{" "}
                  {formatoFecha.format(mascota.fechaNacimiento)}
                </p>
                {mascota.dueno && (
                  <p className="mt-2 text-xs opacity-60">de {mascota.dueno}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
