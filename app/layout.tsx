/**
 * El layout raíz: lo único que envuelve absolutamente a TODAS las pantallas.
 *
 * Acá adentro va lo que no puede cambiar nunca —el idioma del documento, la
 * tipografía, el `<body>`— y NADA más. La barra de navegación con el nombre de
 * quien está logueado NO va acá, aunque sea tentador: la página de verificación
 * la abre una aerolínea que no tiene cuenta, y una barra que dice "Salir" en
 * una pantalla sin sesión es una promesa que el sistema no puede cumplir.
 *
 * Por eso desde esta clase hay DOS layouts más abajo, uno por grupo de ruta:
 *
 *   app/(app)/layout.tsx       con sesión    → navegación, rol, salir
 *   app/(public)/layout.tsx    sin sesión    → el encabezado y nada más
 *
 * ---------------------------------------------------------------------------
 * LA TIPOGRAFÍA SE CARGA, NO SE PIDE
 * ---------------------------------------------------------------------------
 * `next/font` descarga la fuente en el build y la sirve desde nuestro propio
 * dominio, con el `font-display` ya puesto. La alternativa —un `<link>` a
 * Google Fonts— agrega una conexión a un servidor de terceros en el camino
 * crítico de cada visita, y hace que el texto salte cuando la fuente llega
 * tarde. Es la primera decisión de performance del proyecto, y no se vuelve a
 * tocar.
 */
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  // La variable CSS la consume `--font-sans` en `globals.css`, así que el
  // resto del proyecto escribe `font-sans` y no conoce el nombre de la fuente.
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Libreta sanitaria",
  description: "Sistema desarrollado en Metodologías de Desarrollo Web — UAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
