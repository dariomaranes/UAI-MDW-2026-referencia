/**
 * El formulario para pedir un certificado, adentro de la ficha.
 *
 * Es el formulario donde más se nota la diferencia entre los dos errores. Un
 * motivo sin elegir es un error de campo, debajo del `<select>`. Que a la
 * mascota le falte la antirrábica NO es un error de campo: no se arregla
 * eligiendo otro motivo, se arregla llevándola al veterinario. Va arriba, y
 * con la lista de lo que falta, porque eso es lo que pide la H4.
 */
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarCertificadoAction } from "./acciones";
import { SIN_ENVIAR } from "@/lib/formularios";
import { NOMBRE_MOTIVO } from "@/lib/etiquetas";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PedirCertificado({ mascotaId }: { mascotaId: string }) {
  const [estado, enviar, pendiente] = useActionState(
    solicitarCertificadoAction.bind(null, mascotaId),
    SIN_ENVIAR,
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo pedir el certificado</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
            {estado.detalles?.length ? (
              <ul className="mt-1 list-disc pl-5">
                {estado.detalles.map((detalle) => (
                  <li key={detalle}>{detalle}</li>
                ))}
              </ul>
            ) : null}
            {estado.enlace ? (
              <Link href={estado.enlace.href} className="mt-1 inline-block underline">
                {estado.enlace.texto}
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Campo
        etiqueta="Para qué lo necesitás"
        nombre="motivo"
        required
        errores={estado.errores?.motivo}
        ayuda="Se puede tener uno por cada motivo a la vez."
        control={(props) => (
          <select
            {...props}
            required
            defaultValue={estado.valores?.motivo ?? ""}
            className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="" disabled>
              Elegí un motivo
            </option>
            {Object.entries(NOMBRE_MOTIVO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        )}
      />

      <Campo
        etiqueta="Detalle"
        nombre="detalle"
        maxLength={200}
        defaultValue={estado.valores?.detalle}
        errores={estado.errores?.detalle}
        ayuda="Opcional. El destino del viaje, el nombre de la guardería."
        autoComplete="off"
      />

      <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
        {pendiente ? "Pidiendo…" : "Pedir certificado"}
      </Button>
    </form>
  );
}
