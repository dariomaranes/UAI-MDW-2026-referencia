/**
 * El estado vacío, una sola vez para todo el sistema.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO ES UN COMPONENTE Y NO UN `<p>` EN CADA PANTALLA
 * ---------------------------------------------------------------------------
 * Porque un estado vacío bien hecho tiene tres partes, y escribirlas de nuevo
 * en cada pantalla garantiza que en la tercera queden dos:
 *
 *   1. QUÉ pasa, sin ambigüedad: "todavía no cargaste ninguna mascota".
 *   2. POR QUÉ está así: porque nadie cargó nada, no porque falló algo.
 *   3. QUÉ hacer para salir de ahí.
 *
 * Un "No hay resultados" en gris cumple la 1 a medias y ninguna de las otras
 * dos. Y es el momento en que más gente abandona un sistema: la primera vez
 * que lo abre, cuando por definición está vacío.
 *
 * El borde punteado no es decoración: distingue de un golpe de vista "este
 * lugar va a tener contenido y hoy no lo tiene" de un bloque que simplemente
 * terminó. Es la misma convención que usa todo el mundo, y aprovecharla es
 * gratis.
 *
 * `accion` es opcional porque hasta la clase 11 no hay formularios: por ahora
 * varias pantallas pueden explicar el vacío pero no ofrecer el botón que lo
 * resuelve. Prometer un botón que no existe es peor que no tenerlo.
 */
export function SinDatos({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {detalle}
      </p>
      {accion ? <div className="mt-4 flex justify-center">{accion}</div> : null}
    </div>
  );
}
