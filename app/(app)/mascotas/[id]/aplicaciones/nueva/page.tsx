/**
 * La pantalla de registro de una aplicación (H2).
 *
 * El Server Component hace lo que el cliente no puede hacer bien: resuelve
 * quién mira, busca la mascota y trae el plan de vacunación QUE CORRESPONDE A
 * SU ESPECIE. El formulario recibe una lista corta y cerrada en vez de un
 * catálogo entero que tendría que filtrar.
 *
 * El 404 de acá es el mismo criterio del detalle: una mascota que no existe y
 * una que existe pero no se puede ver se responden igual.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { requerirUsuario } from "@/lib/auth";
import { obtenerMascotaVisiblePara } from "@/lib/db/mascotas";
import { planDeVacunacion } from "@/lib/db/vacunas";
import { NOMBRE_ESPECIE } from "@/lib/etiquetas";
import { FormularioAplicacion } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NuevaAplicacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // El rol se exige acá y se vuelve a exigir en la acción. Acá es para que un
  // dueño no vea un formulario que no puede enviar; allá es para que no lo
  // pueda enviar aunque se saltee la pantalla.
  const veterinario = await requerirUsuario("VETERINARIO");

  const mascota = await obtenerMascotaVisiblePara(
    id,
    veterinario.id,
    veterinario.rol,
  );

  if (!mascota) notFound();

  const plan = await planDeVacunacion(mascota.especie);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href={`/mascotas/${mascota.id}`} className="underline">
            {mascota.nombre}
          </Link>{" "}
          · {NOMBRE_ESPECIE[mascota.especie]}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrar una aplicación
        </h1>
        <p className="text-sm text-muted-foreground">
          Queda asentado quién la aplicó y cuándo. El sistema calcula solo la
          próxima dosis.
        </p>
      </div>

      <FormularioAplicacion
        mascotaId={mascota.id}
        vacunas={plan.map((vacuna) => ({
          id: vacuna.id,
          nombre: vacuna.nombre,
          edadMinimaMeses: vacuna.edadMinimaMeses,
        }))}
      />
    </div>
  );
}
