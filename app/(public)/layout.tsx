/**
 * El layout de lo PÚBLICO: las pantallas que funcionan sin sesión.
 *
 * Son dos, y las dos existen desde la especificación:
 *
 *   /ingresar                  la puerta de entrada (nadie logueado, todavía)
 *   /verificacion/:codigo      la H6: una aerolínea comprobando un certificado
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN GRUPO DE RUTA Y NO UNA CARPETA COMÚN
 * ---------------------------------------------------------------------------
 * El paréntesis del nombre —`(public)`— hace que la carpeta NO aparezca en la
 * URL. La página de adentro sigue siendo `/ingresar`, no `/public/ingresar`.
 *
 * Entonces, ¿para qué sirve? Para que haya un layout propio. Un grupo de ruta
 * es la forma de decir "estas pantallas comparten un envoltorio" sin que eso
 * se filtre a la dirección que la gente copia y pega.
 *
 * Y el envoltorio acá es casi nada, a propósito: sin barra de navegación, sin
 * nombre de usuario, sin botón de salir. No es que "no hace falta": es que
 * mostrar un menú del sistema a alguien que no tiene cuenta es ofrecerle
 * lugares a los que no puede ir.
 */
export default function LayoutPublico({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="border-b pb-4">
        <p className="text-sm font-semibold tracking-tight">Libreta sanitaria</p>
        <p className="text-xs text-muted-foreground">
          Universidad Abierta Interamericana · MDW 2026
        </p>
      </header>

      <main className="flex-1 py-8">{children}</main>

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Proyecto de referencia de la materia.
      </footer>
    </div>
  );
}
