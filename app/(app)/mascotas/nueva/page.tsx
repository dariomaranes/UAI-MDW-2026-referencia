/**
 * La pantalla de alta de una mascota (H1).
 *
 * Es un Server Component y casi no hace nada: verifica el rol y dibuja el
 * encabezado. Todo lo que necesita estado está adentro de `formulario.tsx`,
 * que es el único archivo de cliente de esta pantalla.
 *
 * ---------------------------------------------------------------------------
 * LA VERIFICACIÓN DE ACÁ NO ALCANZA, Y LA DE LA ACCIÓN TAMPOCO SOBRA
 * ---------------------------------------------------------------------------
 * `requerirUsuario("DUENO")` acá evita que un veterinario vea un formulario
 * que no va a poder enviar: es cortesía, igual que esconder un botón. La
 * verificación que IMPIDE está en `acciones.ts`, porque la Server Action es un
 * endpoint y se puede llamar sin pasar por esta pantalla.
 *
 * Las dos son necesarias y hacen cosas distintas. Si tuvieran que elegir una,
 * la de la acción: sin ella hay un agujero; sin esta, solo una mala
 * experiencia.
 */
import { requerirUsuario } from "@/lib/auth";
import { FormularioMascota } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NuevaMascota() {
  await requerirUsuario("DUENO");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrar una mascota
        </h1>
        <p className="text-sm text-muted-foreground">
          Con la especie y la fecha de nacimiento alcanza para que el sistema
          sepa qué vacunas le corresponden.
        </p>
      </div>

      <FormularioMascota />
    </div>
  );
}
