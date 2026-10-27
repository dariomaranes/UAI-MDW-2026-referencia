/**
 * El botón de emitir: un formulario sin campos.
 *
 * Es de cliente por una sola razón, la de siempre: tiene que acordarse de lo
 * que contestó el servidor —el rechazo, si venció una vacuna en el medio— y
 * de si todavía está emitiendo, para no emitir dos veces.
 *
 * Igual, el doble clic no podría emitir dos certificados: `emitirCertificado`
 * lleva `estado: "SOLICITADO"` en el WHERE, y la segunda vez no encuentra
 * nada. El botón deshabilitado es la mitad que cubre la impaciencia; la
 * consulta, la mitad que cubre todo lo demás.
 */
"use client";

import { useActionState } from "react";
import { emitirCertificadoAction } from "./acciones";
import { SIN_ENVIAR } from "@/lib/formularios";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EmitirCertificado({ certificadoId }: { certificadoId: string }) {
  const [estado, enviar, pendiente] = useActionState(
    emitirCertificadoAction.bind(null, certificadoId),
    SIN_ENVIAR,
  );

  return (
    <form action={enviar} className="space-y-4">
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo emitir</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
            {estado.detalles?.length ? (
              <ul className="mt-1 list-disc pl-5">
                {estado.detalles.map((detalle) => (
                  <li key={detalle}>{detalle}</li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
        {pendiente ? "Emitiendo…" : "Emitir certificado"}
      </Button>
    </form>
  );
}
