/**
 * /ingresar — la puerta de entrada.
 *
 * Hasta la clase pasada esto era un `if` adentro de la home: la misma URL
 * mostraba el login o el listado según hubiera sesión o no. Funcionaba, y
 * tenía dos problemas que recién se ven cuando el sistema tiene diseño:
 *
 *  1. La home cargaba con la responsabilidad de ser dos pantallas distintas,
 *     y el archivo arrancaba con un `return` largo que no tenía nada que ver
 *     con listar mascotas.
 *  2. No había ninguna dirección que signifique "entrá". Un mail de "te
 *     invitaron al sistema" no tenía a dónde apuntar.
 *
 * Ahora son dos pantallas, cada una en su grupo de ruta, y la que pide sesión
 * manda acá cuando no la hay.
 */
import { redirect } from "next/navigation";
import { obtenerUsuario, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Ingresar() {
  // Si ya hay sesión, esta pantalla no tiene nada que ofrecer. Sin esto,
  // alguien logueado que escribe /ingresar a mano ve un botón de "entrar" que
  // lo va a devolver al mismo lugar donde ya estaba.
  const usuario = await obtenerUsuario();

  if (usuario) redirect("/");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciá sesión para continuar</CardTitle>
        <CardDescription>
          El sistema no muestra ningún dato sin saber quién lo pide.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/*
          El formulario invoca una Server Action: la función corre en el
          servidor y el navegador solo manda un POST. Es el mismo mecanismo de
          la clase 4 —el stub y el control remoto—, con Auth.js del otro lado.

          Que sea un `<form>` y no un `<button onClick>` tiene una consecuencia
          concreta: esto funciona con JavaScript deshabilitado y es operable
          con la tecla Enter sin que nadie escriba un manejador de teclado.
        */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit">Entrar con Google</Button>
        </form>
      </CardContent>
    </Card>
  );
}
