/**
 * El formulario de registro de una aplicación.
 *
 * Casi igual al de alta de mascota, y la diferencia es la que importa: este
 * puede recibir un rechazo del caso de uso —`estado.mensaje`— que no
 * corresponde a ningún campo, y lo muestra ARRIBA, en un `Alert`.
 *
 * Las vacunas llegan ya filtradas por especie desde el Server Component. El
 * cliente no las pide ni las filtra: recibe la lista que corresponde. Si el
 * filtro estuviera acá, el HTML tendría el catálogo entero y bastaría con
 * mirarlo para ver vacunas de otra especie.
 */
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registrarAplicacionAction } from "./acciones";
import { SIN_ENVIAR } from "@/lib/formularios";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type OpcionDeVacuna = {
  id: string;
  nombre: string;
  edadMinimaMeses: number;
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FormularioAplicacion({
  mascotaId,
  vacunas,
}: {
  mascotaId: string;
  vacunas: OpcionDeVacuna[];
}) {
  // `bind` deja la acción con la firma que `useActionState` espera, con el id
  // ya adentro. Es la forma de pasarle un dato del servidor a una acción sin
  // que ese dato pase por el formulario.
  const [estado, enviar, pendiente] = useActionState(
    registrarAplicacionAction.bind(null, mascotaId),
    SIN_ENVIAR,
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      {estado.mensaje ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo registrar</AlertTitle>
          <AlertDescription>
            <p>{estado.mensaje}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <Campo
        etiqueta="Vacuna"
        nombre="vacunaId"
        required
        errores={estado.errores?.vacunaId}
        ayuda="Solo se listan las del plan de esta especie."
        control={(props) => (
          <select
            {...props}
            required
            defaultValue={estado.valores?.vacunaId ?? ""}
            className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="" disabled>
              Elegí una vacuna
            </option>
            {vacunas.map((vacuna) => (
              <option key={vacuna.id} value={vacuna.id}>
                {vacuna.nombre}
                {vacuna.edadMinimaMeses > 0
                  ? ` · desde los ${vacuna.edadMinimaMeses} meses`
                  : ""}
              </option>
            ))}
          </select>
        )}
      />

      <Campo
        etiqueta="Fecha de aplicación"
        nombre="fecha"
        type="date"
        required
        max={hoyISO()}
        defaultValue={estado.valores?.fecha ?? hoyISO()}
        errores={estado.errores?.fecha}
        ayuda="Se registra algo que ya pasó: no puede ser futura."
      />

      <Campo
        etiqueta="Observaciones"
        nombre="observaciones"
        errores={estado.errores?.observaciones}
        ayuda="Opcional. Lote, reacción, lo que haga falta dejar asentado."
        control={(props) => (
          <textarea
            {...props}
            rows={3}
            maxLength={500}
            defaultValue={estado.valores?.observaciones}
            className="w-full rounded-lg border bg-background px-2.5 py-2 text-sm"
          />
        )}
      />

      <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
          {pendiente ? "Registrando…" : "Registrar aplicación"}
        </Button>
        <Button
          render={<Link href={`/mascotas/${mascotaId}`} />}
          nativeButton={false}
          variant="ghost"
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
