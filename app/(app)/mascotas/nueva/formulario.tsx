/**
 * El formulario de alta de una mascota.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE ARCHIVO SÍ ES DE CLIENTE, Y QUÉ PASARÍA SI NO LO FUERA
 * ---------------------------------------------------------------------------
 * Un formulario puede ser un Server Component: `<form action={miServerAction}>`
 * funciona sin una línea de JavaScript, y se envía igual con el JS deshabilitado.
 * Vale la pena saberlo, porque es el piso sobre el que se construye todo lo
 * demás.
 *
 * Lo que NO se puede sin cliente es lo que hace este archivo:
 *
 *   - mostrar los errores devueltos sin perder lo que la persona escribió;
 *   - deshabilitar el botón mientras se guarda, para que no se envíe dos veces.
 *
 * Las dos cosas necesitan estado entre un render y el siguiente, y estado es
 * exactamente el criterio de la clase 8 para cruzar la frontera.
 *
 * ---------------------------------------------------------------------------
 * `useActionState`: UN ESTADO QUE LO MANEJA EL SERVIDOR
 * ---------------------------------------------------------------------------
 *   const [estado, enviar, pendiente] = useActionState(accion, inicial);
 *
 *   estado     lo último que DEVOLVIÓ la acción. Acá viven los errores.
 *   enviar     lo que se le pasa al `action` del <form>.
 *   pendiente  true mientras la acción está corriendo.
 *
 * Fíjense en lo que NO hay en este archivo: no hay `useState` por campo, no
 * hay `onChange`, no hay `fetch`, no hay `event.preventDefault()`. El estado
 * del formulario es el valor que devolvió el servidor, y los valores de los
 * campos los sigue guardando el navegador, que es su trabajo desde 1995.
 *
 * ---------------------------------------------------------------------------
 * `pendiente` NO ES UN LUJO
 * ---------------------------------------------------------------------------
 * Sin él, quien no ve respuesta en un segundo aprieta otra vez, y se crean dos
 * mascotas. Deshabilitar el botón es la mitad de la defensa —la otra mitad es
 * del servidor, porque el botón deshabilitado no impide un POST— pero es la
 * mitad que evita el 99% de los casos, que no son ataques sino impaciencia.
 */
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearMascotaAction } from "./acciones";
import { SIN_ENVIAR } from "@/lib/formularios";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";

// El `max` del campo de fecha: hoy. Se calcula en el cliente a propósito —es
// la fecha de QUIEN CARGA, y es solo una ayuda del navegador—. La regla de
// verdad, la que decide, está en el schema de Zod y corre en el servidor.
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FormularioMascota() {
  const [estado, enviar, pendiente] = useActionState(
    crearMascotaAction,
    SIN_ENVIAR,
  );

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <Campo
        etiqueta="Nombre"
        nombre="nombre"
        required
        maxLength={60}
        defaultValue={estado.valores?.nombre}
        errores={estado.errores?.nombre}
        // Sin esto, el navegador ofrece el nombre de la persona. El de la
        // mascota no es un dato que el navegador conozca.
        autoComplete="off"
      />

      <Campo
        etiqueta="Especie"
        nombre="especie"
        errores={estado.errores?.especie}
        required
        control={(props) => (
          // Un `<select>` nativo y no un menú propio: en un teléfono abre el
          // selector del sistema operativo, que ya sabe ser accesible y que
          // la persona ya sabe usar. Un menú hecho a mano tiene que reimplementar
          // teclado, foco y lector de pantalla para quedar igual de bien.
          <select
            {...props}
            required
            defaultValue={estado.valores?.especie ?? ""}
            className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="" disabled>
              Elegí una especie
            </option>
            {Object.entries(NOMBRE_ESPECIE).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        )}
      />

      <Campo
        etiqueta="Fecha de nacimiento"
        nombre="fechaNacimiento"
        type="date"
        required
        max={hoyISO()}
        defaultValue={estado.valores?.fechaNacimiento}
        errores={estado.errores?.fechaNacimiento}
        ayuda="Define qué vacunas le corresponden y desde cuándo."
      />

      <Campo
        etiqueta="Chip"
        nombre="chip"
        // `inputMode="numeric"` abre el teclado numérico en el teléfono sin
        // impedir pegar el número desde otro lado, que es lo que haría
        // `type="number"` —y además le pondría flechitas de incremento a algo
        // que no es una cantidad—.
        inputMode="numeric"
        maxLength={15}
        defaultValue={estado.valores?.chip}
        errores={estado.errores?.chip}
        ayuda="Opcional. Son 15 dígitos, sin espacios ni guiones."
      />

      {/* En el teléfono los botones van apilados y a lo ancho: un botón de
          ancho completo es imposible de errar con el pulgar. A partir de
          `sm:` vuelven a la fila. Mobile-first es escribir primero el caso
          angosto y agregar el ancho después, no al revés. */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">
          {pendiente ? "Guardando…" : "Registrar mascota"}
        </Button>
        <Button
          render={<Link href="/" />}
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
