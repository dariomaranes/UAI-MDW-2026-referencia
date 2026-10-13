/**
 * La home del sistema: lo que te corresponde ver, apenas entrás.
 *
 * Es un Server Component: corre en el servidor, lee la sesión y la base
 * directamente, y nunca llega al navegador. Por eso puede llamar a
 * `obtenerUsuario` y a `lib/db/` sin pasar por un endpoint HTTP.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE FUE DE ESTE ARCHIVO EN LA CLASE 10, Y POR QUÉ
 * ---------------------------------------------------------------------------
 * Hasta la clase 8 esta página hacía cuatro cosas. Hoy hace una, y las otras
 * tres se mudaron a los archivos que Next.js ya tenía reservados para ellas:
 *
 *   el login de quien no tiene sesión   →  app/(public)/ingresar/page.tsx
 *   el "todavía está cargando"          →  app/(app)/loading.tsx
 *   el "la consulta falló"              →  app/(app)/error.tsx
 *
 * Fijate que desapareció el `try/catch` que envolvía la consulta. No es que
 * el error se dejó de manejar: se manejó MEJOR. Atrapado acá, cada página
 * tenía que acordarse de atraparlo —y la que se olvidara dejaba la pantalla en
 * blanco—. Dejándolo subir, `error.tsx` lo recibe una sola vez para toda la
 * sección, con un botón de reintentar que una página no puede ofrecer porque
 * no tiene estado.
 *
 * Es la misma idea de `requerirUsuario` en la clase 6: el error se va para el
 * lado seguro, y olvidarse rompe el request en vez de dejarlo pasar.
 *
 * ---------------------------------------------------------------------------
 * EL ROL CAMBIA LA CONSULTA, NO SOLO EL TÍTULO
 * ---------------------------------------------------------------------------
 * Un dueño ve sus mascotas; un veterinario, las que atendió. Son dos consultas
 * distintas en `lib/db/mascotas.ts`, las dos con el id de la sesión adentro.
 * La pantalla no filtra nada: recibe ya filtrado lo que le corresponde a quien
 * mira. Si el filtro estuviera acá, bastaría con mirar el HTML para ver el
 * resto.
 */
import { requerirUsuario } from "@/lib/auth";
import {
  listarMascotasAtendidasPor,
  listarMascotasDeDueno,
} from "@/lib/db/mascotas";
import { BuscadorMascotas, type Fila } from "@/components/buscador-mascotas";
import { SinDatos } from "@/components/sin-datos";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";

// Esta página lee datos que cambian, así que se renderiza en cada request.
// Sin esta línea, Next.js intentaría generarla una sola vez durante el build
// —cuando todavía no hay base de datos disponible— y el deploy fallaría.
// En la clase 12 vemos cuándo conviene lo contrario: cachear y revalidar.
export const dynamic = "force-dynamic";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function Home() {
  // Acá sí se usa la versión que LANZA, y no la que devuelve null. El layout
  // de este grupo ya redirigió a quien no tiene sesión, así que llegar hasta
  // esta línea sin usuario significa que algo se rompió, no que alguien está
  // de visita. Un error es la respuesta correcta a eso.
  const usuario = await requerirUsuario();
  const esVeterinario = usuario.rol === "VETERINARIO";

  /**
   * Las dos consultas devuelven campos distintos —al dueño no hay que
   * repetirle su propio nombre— así que la página las normaliza a una sola
   * forma antes de pintar. Es un Data Transfer Object hecho a mano: la vista
   * no debería tener que saber de qué consulta vino cada fila.
   *
   * La fecha y la especie viajan ya convertidas a texto. Traducir para la
   * pantalla es trabajo del servidor: acá se hace una vez, en el cliente se
   * haría en cada render y con la configuración regional de quien mira.
   */
  const mascotas: Fila[] = esVeterinario
    ? (await listarMascotasAtendidasPor(usuario.id)).map((m) => ({
        id: m.id,
        nombre: m.nombre,
        especie: NOMBRE_ESPECIE[m.especie],
        nacimiento: formatoFecha.format(m.fechaNacimiento),
        dueno: m.dueno.nombre,
      }))
    : (await listarMascotasDeDueno(usuario.id)).map((m) => ({
        id: m.id,
        nombre: m.nombre,
        especie: NOMBRE_ESPECIE[m.especie],
        nacimiento: formatoFecha.format(m.fechaNacimiento),
        dueno: null,
      }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {esVeterinario ? "Mis pacientes" : "Mis mascotas"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {esVeterinario
            ? "Las mascotas en las que registraste al menos una aplicación."
            : "Las mascotas que cargaste en el sistema."}
        </p>
      </div>

      {/*
        LOS DOS VACÍOS NO SON EL MISMO VACÍO, y esta es la distinción que la
        clase pide no perder:

          no hay NADA cargado          →  se resuelve acá, antes de pintar la
                                          lista, porque no tiene sentido
                                          mostrar un buscador de nada
          hay datos y la búsqueda      →  lo resuelve el buscador, que es el
          no coincide con ninguno         único que sabe qué se escribió

        Decirle "no hay mascotas" a alguien que buscó "fifi" y tiene ocho
        cargadas es mentirle sobre el estado de su sistema.
      */}
      {mascotas.length === 0 ? (
        <SinDatos
          titulo={
            esVeterinario
              ? "Todavía no atendiste ninguna mascota"
              : "Todavía no cargaste ninguna mascota"
          }
          detalle={
            esVeterinario
              ? "Cuando registres la aplicación de una vacuna, la mascota aparece en esta lista."
              : "Registrá tu primera mascota y después vas a poder ver su estado sanitario y pedir certificados."
          }
        />
      ) : (
        /*
          Un Server Component renderizando uno de cliente. La dirección
          importa: de acá para abajo es navegador, de acá para arriba es
          servidor. Lo único que cruza son estas props, ya convertidas a
          texto plano.
        */
        <BuscadorMascotas mascotas={mascotas} />
      )}
    </div>
  );
}
