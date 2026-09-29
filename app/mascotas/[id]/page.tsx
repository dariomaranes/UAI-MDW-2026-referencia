/**
 * /mascotas/:id — la primera pantalla de detalle del proyecto.
 *
 * EL ARCHIVO QUE NO TIENE UN SOLO `fetch`, Y ESE ES EL TEMA DE LA CLASE.
 *
 * Ustedes ya tienen `GET /api/mascotas/:id` funcionando. El reflejo es usarlo:
 * la página le pide los datos a la API con `fetch` y los pinta. Ese reflejo
 * viene de la lectura de hoy —AJAX: el navegador le pide datos al servidor sin
 * recargar la página— y tenía todo el sentido del mundo cuando el componente
 * corría en el navegador.
 *
 * Este componente NO corre en el navegador. Corre en el servidor, que es donde
 * vive la base. Pedirse los datos a sí mismo por HTTP sería salir por la puerta
 * para volver a entrar por la ventana:
 *
 *   con fetch     página (servidor) → red → su propia API → base
 *   sin fetch     página (servidor) ─────────────────────→ base
 *
 * El viaje de red del medio no agrega nada: no hay nadie del otro lado que no
 * sea ustedes mismos. Y además habría que reenviar la cookie a mano, porque un
 * `fetch` que sale del servidor no lleva las del navegador.
 *
 * ¿Y entonces para qué queda la API? Para quien NO es esta página: la
 * aerolínea que verifica un certificado, Postman, la app móvil que quizás
 * exista. Un endpoint público y un Server Component son dos consumidores del
 * mismo modelo, no dos capas apiladas.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth";
import { obtenerMascotaVisiblePara } from "@/lib/db/mascotas";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";

// La página lee datos que cambian, así que se renderiza en cada request.
export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

/**
 * En Next.js 15 los parámetros de la ruta llegan como Promise y hay que
 * esperarlos. Es la misma firma que ya vieron en los Route Handlers.
 */
type Props = { params: Promise<{ id: string }> };

export default async function DetalleMascota({ params }: Props) {
  const { id } = await params;

  // La misma pregunta que abre los treinta endpoints —¿quién sos?— con la
  // MISMA respuesta y distinta traducción. Un endpoint contesta 401 y corta;
  // una pantalla manda al login, porque del otro lado hay una persona y no un
  // programa. Por eso acá no se usa `requerirUsuario`, que lanza: una excepción
  // sin atrapar en un Server Component es una pantalla de error, no un login.
  //
  // Que sea una pantalla no la hace más segura. Si alguien escribe la URL a
  // mano, estas dos líneas son lo único que hay en el medio.
  const usuario = await obtenerUsuario();

  if (!usuario) redirect("/");

  // LA FUNCIÓN ES LA MISMA que usa `GET /api/mascotas/:id`. No se copió la
  // regla ni se volvió a escribir: la autorización nunca vivió en el endpoint,
  // vive en `lib/db/`, y por eso esta página la hereda completa. Para un dueño,
  // la mascota del vecino devuelve null exactamente igual que en la API.
  const mascota = await obtenerMascotaVisiblePara(id, usuario.id, usuario.rol);

  // `notFound()` es el 404 de la clase 6 del lado de la pantalla: corta el
  // render y muestra la página de no encontrado. Fijate que es el MISMO
  // resultado para "no existe" y para "no es tuya" — la decisión de no revelar
  // la existencia del recurso no era del endpoint, era del sistema.
  if (!mascota) notFound();

  return (
    <main className="mx-auto max-w-2xl p-8">
      {/*
        <Link> y no <a>: navega sin recargar la página entera. Next.js trae lo
        que falta y reemplaza solo lo que cambió. Es lo que AJAX quería y lo
        que acá viene resuelto de fábrica.
      */}
      <Link href="/" className="text-sm opacity-70 hover:opacity-100">
        ← Volver
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{mascota.nombre}</h1>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex gap-2">
          <dt className="w-40 opacity-60">Especie</dt>
          <dd>{NOMBRE_ESPECIE[mascota.especie]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-40 opacity-60">Fecha de nacimiento</dt>
          <dd>{formatoFecha.format(mascota.fechaNacimiento)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-40 opacity-60">Microchip</dt>
          {/* El chip es opcional en el schema, así que la vista contempla que
              no esté. Un `null` que llega a la pantalla como "null" es el bug
              más barato de evitar y el más fácil de dejar pasar. */}
          <dd>{mascota.chip ?? <span className="opacity-50">sin chip</span>}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-40 opacity-60">En el sistema desde</dt>
          <dd>{formatoFecha.format(mascota.creadaEn)}</dd>
        </div>
      </dl>
    </main>
  );
}
