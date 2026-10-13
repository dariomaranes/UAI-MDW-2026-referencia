/**
 * /mascotas/:id — la pantalla de detalle.
 *
 * EL ARCHIVO QUE NO TIENE UN SOLO `fetch`, Y ESE FUE EL TEMA DE LA CLASE 8.
 *
 * Ustedes ya tienen `GET /api/mascotas/:id` funcionando. El reflejo es usarlo:
 * la página le pide los datos a la API con `fetch` y los pinta. Ese reflejo
 * viene de AJAX —el navegador le pide datos al servidor sin recargar la
 * página— y tenía todo el sentido del mundo cuando el componente corría en el
 * navegador.
 *
 * Este componente NO corre en el navegador. Corre en el servidor, que es donde
 * vive la base. Pedirse los datos a sí mismo por HTTP sería salir por la puerta
 * para volver a entrar por la ventana:
 *
 *   con fetch     página (servidor) → red → su propia API → base
 *   sin fetch     página (servidor) ─────────────────────→ base
 *
 * ¿Y entonces para qué queda la API? Para quien NO es esta página: la
 * aerolínea que verifica un certificado, Postman, la app móvil que quizás
 * exista. Un endpoint público y un Server Component son dos consumidores del
 * mismo modelo, no dos capas apiladas. Y esta clase lo deja a la vista: la
 * pantalla de `/verificacion/:codigo` lee exactamente lo mismo que el endpoint
 * `/api/verificacion/:codigo`, cada uno desde `lib/db/`.
 *
 * ---------------------------------------------------------------------------
 * QUÉ AGREGA LA CLASE 10
 * ---------------------------------------------------------------------------
 * El estado sanitario y el historial. No es un dato más en la lista: es LA
 * PANTALLA del sistema, la que contesta la pregunta por la que alguien abre
 * una libreta sanitaria. Hasta hoy el cálculo existía —con sus tests, desde la
 * clase 5— y solo lo podía ver quien supiera usar Postman.
 *
 * Y las dos consultas nuevas van en `Promise.all`: no dependen una de la otra,
 * así que esperarlas en serie duplicaría el tiempo de la pantalla sin ninguna
 * razón. Es la misma decisión que ya está en `datosDelEstadoSanitario`.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuario } from "@/lib/auth";
import { obtenerMascotaVisiblePara } from "@/lib/db/mascotas";
import { listarAplicacionesDeMascota } from "@/lib/db/aplicaciones";
import { datosDelEstadoSanitario } from "@/lib/db/vacunas";
import { estadoSanitario } from "@/lib/estado-sanitario";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";
import { EstadoSanitario } from "@/components/estado-sanitario";
import { SinDatos } from "@/components/sin-datos";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// La página lee datos que cambian, así que se renderiza en cada request.
export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const formatoCorto = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/**
 * En Next.js 15 los parámetros de la ruta llegan como Promise y hay que
 * esperarlos. Es la misma firma que ya vieron en los Route Handlers.
 */
type Props = { params: Promise<{ id: string }> };

export default async function DetalleMascota({ params }: Props) {
  const { id } = await params;

  // La misma pregunta que abre los treinta endpoints: ¿quién sos? Desde la
  // clase 10 esta línea puede usar `requerirUsuario`, que lanza, porque el
  // layout del grupo `(app)` ya mandó al login a quien no tiene sesión. Antes
  // había que escribir el `redirect` acá mismo.
  //
  // Que el layout redirija no la hace prescindible: un layout no se vuelve a
  // ejecutar en cada navegación del cliente, así que estas dos líneas siguen
  // siendo lo único que hay en el medio si alguien escribe la URL a mano.
  const usuario = await requerirUsuario();

  // LA FUNCIÓN ES LA MISMA que usa `GET /api/mascotas/:id`. No se copió la
  // regla ni se volvió a escribir: la autorización nunca vivió en el endpoint,
  // vive en `lib/db/`, y por eso esta página la hereda completa. Para un dueño,
  // la mascota del vecino devuelve null exactamente igual que en la API.
  const mascota = await obtenerMascotaVisiblePara(id, usuario.id, usuario.rol);

  // `notFound()` es el 404 de la clase 6 del lado de la pantalla: corta el
  // render y muestra `app/(app)/not-found.tsx`. Fijate que es el MISMO
  // resultado para "no existe" y para "no es tuya" — la decisión de no revelar
  // la existencia del recurso no era del endpoint, era del sistema.
  if (!mascota) notFound();

  const [{ plan, aplicaciones }, historial] = await Promise.all([
    datosDelEstadoSanitario(mascota.especie, mascota.id),
    listarAplicacionesDeMascota(mascota.id),
  ]);

  // El `hoy` lo pone la pantalla, igual que lo pone el handler: la función de
  // dominio no lee el reloj, y por eso se puede testear sin congelar el
  // tiempo. Es la decisión de la clase 5, intacta.
  const items = estadoSanitario(plan, aplicaciones, mascota.fechaNacimiento, new Date());

  return (
    <div className="space-y-8">
      <div>
        {/*
          <Link> y no <a>: navega sin recargar la página entera. Next.js trae
          lo que falta y reemplaza solo lo que cambió. Es lo que AJAX quería y
          lo que acá viene resuelto de fábrica.

          Y dice a DÓNDE vuelve, no "← Volver": en una pantalla a la que se
          puede llegar desde un link pegado en un chat, "volver" no significa
          nada.
        */}
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← {usuario.rol === "VETERINARIO" ? "Mis pacientes" : "Mis mascotas"}
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {mascota.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {NOMBRE_ESPECIE[mascota.especie]} · nacida el{" "}
          {formatoFecha.format(mascota.fechaNacimiento)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la mascota</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Especie</dt>
            <dd>{NOMBRE_ESPECIE[mascota.especie]}</dd>

            <dt className="text-muted-foreground">Fecha de nacimiento</dt>
            <dd>{formatoFecha.format(mascota.fechaNacimiento)}</dd>

            <dt className="text-muted-foreground">Microchip</dt>
            {/* El chip es opcional en el schema, así que la vista contempla
                que no esté. Un `null` que llega a la pantalla como "null" es
                el bug más barato de evitar y el más fácil de dejar pasar. */}
            <dd>
              {mascota.chip ?? (
                <span className="text-muted-foreground">sin chip</span>
              )}
            </dd>

            <dt className="text-muted-foreground">En el sistema desde</dt>
            <dd>{formatoFecha.format(mascota.creadaEn)}</dd>
          </dl>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Estado sanitario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El plan de vacunación de un{" "}
            {NOMBRE_ESPECIE[mascota.especie].toLowerCase()}, con lo que le falta
            a {mascota.nombre} al día de hoy.
          </p>
        </div>

        {/*
          Un plan vacío no es un error ni es "esta mascota está sana": es que
          nadie cargó el catálogo de vacunas de esa especie. Son dos problemas
          distintos y un sistema que los confunde dice que todo está al día
          cuando en realidad no sabe nada.
        */}
        {items.length === 0 ? (
          <SinDatos
            titulo="No hay un plan de vacunación cargado para esta especie"
            detalle="El estado sanitario se calcula contra el catálogo de vacunas. Sin catálogo no hay nada que comparar: no significa que la mascota esté al día."
          />
        ) : (
          <EstadoSanitario items={items} />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Historial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Las aplicaciones registradas, de la más reciente a la más vieja.
          </p>
        </div>

        {historial.length === 0 ? (
          <SinDatos
            titulo="Todavía no hay aplicaciones registradas"
            detalle={
              usuario.rol === "VETERINARIO"
                ? "Cuando registres una aplicación va a quedar acá, y ya no se puede editar ni borrar: la libreta existe para conservar el hecho."
                : "Las aplicaciones las registra el veterinario en la consulta. Una vez registradas no se editan ni se borran."
            }
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {historial.map((aplicacion) => (
              <li key={aplicacion.id} className="px-4 py-3">
                <p className="text-sm font-medium">{aplicacion.vacuna.nombre}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatoCorto.format(aplicacion.fecha)} ·{" "}
                  {aplicacion.veterinario.nombre}
                  {aplicacion.proximaDosis
                    ? ` · próxima: ${formatoCorto.format(aplicacion.proximaDosis)}`
                    : " · dosis única"}
                </p>
                {aplicacion.observaciones ? (
                  <p className="mt-2 text-sm">{aplicacion.observaciones}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        Lo que NO está en esta pantalla, y es a propósito: no hay un botón de
        "registrar aplicación" para el veterinario ni uno de "pedir
        certificado" para el dueño. Las dos cosas son formularios que escriben
        en la base, y eso es la clase 11.

        Dejar el botón puesto y que no haga nada sería peor que no tenerlo: una
        interfaz que promete una acción que no existe enseña a desconfiar del
        resto de la pantalla.
      */}
    </div>
  );
}
