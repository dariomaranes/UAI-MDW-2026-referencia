/**
 * El esqueleto del detalle.
 *
 * Existe aparte del de la home —`app/(app)/loading.tsx`— porque esta pantalla
 * tiene otra forma: un título, una ficha de datos y dos listas. Reusar el de
 * la home haría que al llegar el contenido la página se reacomode, que es
 * exactamente lo que un esqueleto viene a evitar.
 *
 * El criterio para decidir si hace falta uno propio es ese y no otro: ¿el
 * esqueleto de arriba reserva más o menos espacio que el contenido real? Si
 * sí, es un salto, y conviene uno acá.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function CargandoDetalle() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-56 w-full" />

      <p className="sr-only" role="status">
        Cargando la mascota…
      </p>
    </div>
  );
}
