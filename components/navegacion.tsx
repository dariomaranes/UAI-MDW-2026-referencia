/**
 * La barra de navegación de las pantallas con sesión.
 *
 * Contesta las tres preguntas que una persona se hace al entrar a un sistema
 * que no conoce, y que hasta la clase pasada el nuestro no contestaba:
 *
 *   ¿dónde estoy?     el nombre del sistema, y es un link a la home
 *   ¿quién soy acá?   el nombre y EL ROL, que es lo que explica lo que ve
 *   ¿cómo me voy?     un solo botón, siempre en el mismo lugar
 *
 * ---------------------------------------------------------------------------
 * EL ROL SE MUESTRA PORQUE EXPLICA LA PANTALLA
 * ---------------------------------------------------------------------------
 * No está de adorno. Un veterinario y un dueño abren la misma URL y ven
 * listas distintas: uno sus pacientes, el otro sus mascotas. Sin el rol a la
 * vista, "me faltan mascotas" es un bug reportado; con el rol a la vista, es
 * una explicación.
 *
 * Y sigue valiendo lo de siempre: esto es un cartel, no un permiso. Quien
 * cambie el rol con las herramientas del navegador va a ver otra palabra en
 * esta barra y exactamente los mismos datos, porque la consulta la decide
 * `lib/db/` con el rol de la SESIÓN, que vive en una cookie cifrada.
 *
 * Es un Server Component: no tiene estado ni eventos. El único botón manda un
 * POST a una Server Action, que es un formulario y no un `onClick`. Por eso
 * esta barra no viaja al navegador.
 */
import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { UsuarioSesion } from "@/lib/auth";
import { NOMBRE_ROL } from "@/lib/etiquetas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Navegacion({ usuario }: { usuario: UsuarioSesion }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
      {/*
        El salto al contenido. Está primero en el orden del DOM y escondido
        hasta que recibe el foco: para el mouse no existe, para el teclado es
        lo primero que aparece al tabular. Es el requisito de accesibilidad de
        la clase 2 —"todo se puede operar con el teclado"— aplicado al único
        lugar donde se nota.
      */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <div className="min-w-0">
        <Link href="/" className="text-sm font-semibold tracking-tight hover:underline">
          Libreta sanitaria
        </Link>
        <p className="truncate text-xs text-muted-foreground">{usuario.nombre}</p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{NOMBRE_ROL[usuario.rol]}</Badge>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/ingresar" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
