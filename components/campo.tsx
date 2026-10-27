/**
 * Un campo de formulario completo: etiqueta, control, ayuda y error.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ES UN `<input>` SUELTO CON UN `<label>` AL LADO
 * ---------------------------------------------------------------------------
 * Porque las cuatro piezas tienen que estar CONECTADAS, y conectarlas a mano
 * en cada campo es garantía de que el tercero salga mal:
 *
 *   label  ──htmlFor/id──>  control
 *   control ──aria-describedby──>  ayuda y error
 *   control ──aria-invalid──>  "este campo está mal"
 *
 * Sin la primera conexión, tocar la etiqueta no enfoca el campo y el lector de
 * pantalla anuncia "campo de texto" sin decir cuál. Sin la segunda, el error
 * existe en la pantalla pero no se lee: alguien que usa lector escucha "campo
 * inválido" y nunca se entera de por qué.
 *
 * Los ids se generan con `useId()` y no con el nombre del campo: dos
 * formularios en la misma página —o el mismo componente usado dos veces—
 * producirían ids repetidos, y un id repetido rompe justamente la conexión
 * que vinimos a hacer.
 *
 * ---------------------------------------------------------------------------
 * EL ERROR NO SE COMUNICA SOLO CON COLOR, NI SOLO CON UN BORDE
 * ---------------------------------------------------------------------------
 * El borde rojo es una ayuda para quien lo ve. La información es el texto, y
 * va con `role="alert"` para que se anuncie cuando aparece, sin que la persona
 * tenga que ir a buscarlo.
 */
"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CampoProps = {
  etiqueta: string;
  nombre: string;
  /** El texto de ayuda que explica el formato ANTES de que alguien se equivoque. */
  ayuda?: string;
  errores?: string[];
  /**
   * Para los campos que no son un `<input>` —un `<select>`, por ejemplo—.
   * Recibe los atributos ya calculados en vez de dejar que cada pantalla los
   * vuelva a armar: si el `<select>` se olvidara el `id`, la etiqueta dejaría
   * de funcionar y no lo notaría nadie que use el mouse.
   */
  control?: (props: {
    id: string;
    name: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
} & Omit<React.ComponentProps<"input">, "name" | "id">;

export function Campo({
  etiqueta,
  nombre,
  ayuda,
  errores,
  control,
  className,
  ...props
}: CampoProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const tieneError = Boolean(errores?.length);
  const descripto =
    [ayuda ? idAyuda : null, tieneError ? idError : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {etiqueta}
        {/* `required` ya viaja en el control para el navegador y el lector de
            pantalla; esto es para el ojo. "Opcional" en los que no lo son
            sería más honesto todavía, pero en un formulario donde casi todo
            es obligatorio agrega ruido. */}
        {props.required ? (
          <span className="ml-1 text-muted-foreground" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {control ? (
        control({
          id,
          name: nombre,
          "aria-invalid": tieneError || undefined,
          "aria-describedby": descripto,
        })
      ) : (
        <Input
          id={id}
          name={nombre}
          aria-invalid={tieneError || undefined}
          aria-describedby={descripto}
          className={cn(tieneError && "border-destructive", className)}
          {...props}
        />
      )}

      {ayuda ? (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}

      {tieneError ? (
        <p id={idError} role="alert" className="text-xs text-destructive">
          {errores![0]}
        </p>
      ) : null}
    </div>
  );
}
