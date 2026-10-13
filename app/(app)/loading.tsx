/**
 * El estado "todavía está cargando", para todo el grupo `(app)`.
 *
 * ---------------------------------------------------------------------------
 * NADIE ESCRIBE UN `if (cargando)` ACÁ
 * ---------------------------------------------------------------------------
 * Y ese es el punto. Un archivo llamado `loading.tsx` al lado de una página
 * hace que Next.js envuelva esa página en un `<Suspense>` con esto como
 * fallback. No hay estado, no hay `useEffect`, no hay bandera: hay un archivo.
 *
 * Mientras el Server Component de arriba espera la base, el navegador ya
 * recibió y pintó ESTO. Cuando la consulta termina, llega el contenido de
 * verdad y lo reemplaza. Es el mismo HTML en dos entregas, por streaming.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESQUELETOS Y NO UN "Cargando…"
 * ---------------------------------------------------------------------------
 * Porque un esqueleto que ocupa el mismo lugar que el contenido real evita
 * que la pantalla SALTE cuando llega. Un spinner centrado no reserva nada: la
 * página se reacomoda entera y, si la lista tardó poco, el salto es lo único
 * que la persona alcanza a percibir.
 *
 * El esqueleto no tiene que ser exacto. Tiene que tener la MISMA FORMA: un
 * título, un subtítulo, un campo de búsqueda y unas filas.
 *
 * Y una advertencia honesta: un esqueleto de más de dos o tres segundos es
 * peor que nada, porque promete algo que no llega. Si una pantalla tarda eso,
 * el problema es la consulta, y eso se mide en la clase 14.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function Cargando() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-9 w-full" />

      {/*
        `aria-hidden` y el texto para lector de pantalla van juntos: los
        rectángulos grises no significan nada si no se ven, y "cargando" leído
        una vez vale más que doce cajas vacías anunciadas de a una.
      */}
      <div aria-hidden className="space-y-3">
        {[0, 1, 2].map((fila) => (
          <Skeleton key={fila} className="h-20 w-full" />
        ))}
      </div>

      <p className="sr-only" role="status">
        Cargando el listado…
      </p>
    </div>
  );
}
