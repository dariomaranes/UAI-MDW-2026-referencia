/**
 * El 404 de las pantallas con sesión: lo que se ve cuando una página llama a
 * `notFound()`.
 *
 * Es el MISMO criterio del 404 de la API en la clase 6, traducido a una
 * pantalla. La mascota de otro dueño y la mascota que no existe terminan las
 * dos acá, con este texto, porque decir "existe pero no es tuya" ya es
 * confirmarle a alguien que el registro existe.
 *
 * Por eso el texto evita la palabra "permiso". "No tenés permiso para ver esta
 * mascota" sería honesto y sería una filtración: cuenta que hay una mascota.
 *
 * Que esté acá adentro de `(app)` y no en la raíz importa: este 404 se dibuja
 * CON la barra de navegación, así que quien llegó por una URL vieja sigue
 * dentro del sistema y tiene a dónde ir. Un 404 que deja a la persona en una
 * página desnuda la obliga a apretar "atrás", que es la salida de emergencia,
 * no una opción de navegación.
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          No encontramos esta página
        </h1>
      </div>

      <p className="max-w-prose text-sm text-muted-foreground">
        Puede que el enlace esté viejo, que el registro se haya borrado o que no
        sea parte de lo que te corresponde ver.
      </p>

      {/*
        `render` y no un `<Link>` adentro: así el botón presta sus estilos a
        OTRO elemento en vez de envolverlo. Lo que se dibuja es un `<a>` —que
        navega, se puede abrir en otra pestaña y se copia con el click
        derecho— con la apariencia de un botón. Un `<button>` con un link
        adentro no hace ninguna de esas tres cosas.
      */}
      <Button
        render={<Link href="/" />}
        variant="outline"
        size="sm"
      >
        Volver al inicio
      </Button>
    </div>
  );
}
