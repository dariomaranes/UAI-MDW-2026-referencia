/**
 * El layout de lo que PIDE SESIÓN: todo lo que está detrás del login.
 *
 * Igual que `(public)`, el paréntesis no se ve en la URL: la home sigue siendo
 * `/` y el detalle sigue siendo `/mascotas/:id`. Lo que cambia es que ahora
 * las dos comparten una barra de navegación, y que esa barra sabe quién sos.
 *
 * ---------------------------------------------------------------------------
 * LA REDIRECCIÓN DE ACÁ NO ES UNA MEDIDA DE SEGURIDAD
 * ---------------------------------------------------------------------------
 * Esto es lo más importante del archivo y lo más fácil de malentender. El
 * `redirect("/ingresar")` de abajo evita que alguien sin sesión vea una
 * pantalla vacía y rota. Eso es experiencia de uso, no autorización.
 *
 * Un layout de Next.js no se vuelve a ejecutar en cada navegación del lado del
 * cliente: una vez montado, moverse entre dos páginas del grupo puede no
 * volver a pasar por acá. Si la única verificación del sistema estuviera en
 * este archivo, habría un agujero.
 *
 * Por eso cada página de abajo SIGUE preguntando quién es quien mira, y cada
 * consulta sigue llevando el id de la sesión adentro —como desde la clase 6—.
 * La regla de la materia no cambió ni un poco:
 *
 *   la UI decide qué MOSTRAR;  el servidor decide qué PERMITIR
 *
 * Esconder un botón es cortesía. La autorización vive en `lib/db/`.
 */
import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth";
import { Navegacion } from "@/components/navegacion";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuario();

  if (!usuario) redirect("/ingresar");

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 sm:px-6">
      <Navegacion usuario={usuario} />

      {/*
        `id="contenido"` es el destino del salto que agrega `Navegacion`. Un
        teclado que entra a esta pantalla no tiene que recorrer el menú entero
        en cada página para llegar a lo que vino a leer.
      */}
      <main id="contenido" className="flex-1 py-8">
        {children}
      </main>

      <footer className="border-t py-4 text-xs text-muted-foreground">
        Libreta sanitaria · proyecto de referencia de MDW 2026
      </footer>
    </div>
  );
}
