/**
 * El estado "falló", para todo el grupo `(app)`.
 *
 * Next.js monta esto cuando un Server Component de abajo lanza una excepción
 * que nadie atrapó: la base no responde, el pool está agotado, un timeout.
 * Reemplaza al `try/catch` que hasta la clase 8 vivía adentro de la home.
 *
 * ---------------------------------------------------------------------------
 * ES EL ÚNICO ARCHIVO DE ESTA CLASE QUE TIENE QUE SER DE CLIENTE
 * ---------------------------------------------------------------------------
 * Y no por capricho de Next.js: `reset()` vuelve a intentar el render SIN
 * recargar la página, y para eso tiene que haber JavaScript corriendo en el
 * navegador cuando la persona aprieta el botón. Un Server Component no puede
 * ofrecer "reintentar" porque ya terminó de existir.
 *
 * Es la regla de la clase 8 aplicada sin excepción: `"use client"` solo si hay
 * estado, eventos o APIs del navegador. Acá hay un evento.
 *
 * ---------------------------------------------------------------------------
 * QUÉ DICE Y QUÉ NO DICE
 * ---------------------------------------------------------------------------
 * No dice "Error: connect ECONNREFUSED 10.0.0.4:5432". Ese texto no le sirve a
 * nadie del otro lado y sí le sirve a alguien buscando cómo está armado el
 * sistema por dentro. Es la misma decisión del 500 de la clase 5: el detalle
 * va a `console.error`, que en Vercel termina en los logs del servidor.
 *
 * Lo que sí dice es las tres cosas que hacen falta: que el problema es del
 * sistema y no de quien mira, que no se perdió nada, y qué apretar.
 */
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // El detalle se registra, no se muestra. `digest` es el identificador que
  // Next.js le pone al error del servidor: es lo único que sirve para cruzar
  // "lo que vio la persona" con "lo que dice el log".
  useEffect(() => {
    console.error("Falló una pantalla de (app)", error);
  }, [error]);

  return (
    <Alert variant="destructive">
      <AlertTitle>No pudimos cargar esta pantalla</AlertTitle>
      <AlertDescription>
        <p>
          El problema es del sistema, no de lo que hiciste, y no se perdió
          ningún dato. Probá de nuevo; si sigue igual, avisanos.
        </p>

        {error.digest ? (
          <p className="text-xs">
            Código del error: <code>{error.digest}</code>
          </p>
        ) : null}

        <Button variant="outline" size="sm" onClick={() => reset()}>
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
