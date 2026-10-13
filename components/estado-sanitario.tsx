/**
 * El estado sanitario en pantalla: la H3, por fin visible.
 *
 * El cálculo NO está acá. Está en `lib/estado-sanitario.ts` desde la clase 5,
 * con sus tests, y este archivo solo lo PINTA. Es la línea que separa la vista
 * del modelo, y se nota en una cosa: si mañana cambia la regla de cuándo una
 * vacuna vence, este archivo no se toca.
 *
 * ---------------------------------------------------------------------------
 * EL ESTADO NO SE COMUNICA SOLO CON COLOR
 * ---------------------------------------------------------------------------
 * Es el último punto de la lista de accesibilidad de la clase 2, y el que más
 * se incumple: un semáforo de puntitos verdes, amarillos y rojos es
 * invisible para el 8% de los varones, que distinguen mal el rojo del verde.
 *
 * Por eso cada fila dice la palabra. El color acompaña y no informa: tapando
 * la pantalla en blanco y negro, la información sigue estando completa. Es la
 * prueba de un minuto que conviene hacerle a cualquier pantalla de estados.
 *
 * ---------------------------------------------------------------------------
 * `NO_CORRESPONDE` NO SE ESCONDE
 * ---------------------------------------------------------------------------
 * Un cachorro de un mes no está "pendiente" de la antirrábica: todavía no le
 * toca. Filtrar esas filas de la lista parecería más limpio y sería peor: el
 * dueño quedaría sin saber que esa vacuna existe y que en dos meses se la van
 * a pedir. Se muestra, apagada, con la explicación adelante.
 */
import type {
  EstadoDeVacuna,
  ItemDelEstadoSanitario,
} from "@/lib/estado-sanitario";
import { Badge } from "@/components/ui/badge";

/**
 * Cómo se dice y cómo se ve cada estado, en un solo lugar.
 *
 * `Record<EstadoDeVacuna, ...>` por la misma razón que `NOMBRE_ESPECIE` en la
 * clase 8: el día que alguien agregue un quinto estado al dominio, esto deja
 * de compilar hasta que se decida cómo se llama y de qué color va. Con un
 * `switch` sin `default`, en cambio, el estado nuevo saldría sin etiqueta y
 * nadie se enteraría hasta verlo en producción.
 */
const PRESENTACION: Record<
  EstadoDeVacuna,
  { texto: string; variante: "default" | "secondary" | "destructive" | "outline" }
> = {
  AL_DIA: { texto: "Al día", variante: "default" },
  PENDIENTE: { texto: "Pendiente", variante: "secondary" },
  VENCIDA: { texto: "Vencida", variante: "destructive" },
  NO_CORRESPONDE: { texto: "Todavía no corresponde", variante: "outline" },
};

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

/**
 * El pie de cada fila: la fecha que explica el estado.
 *
 * Un "Vencida" sin fecha obliga a ir a buscar el historial para saber desde
 * cuándo. La fecha convierte el estado en algo verificable.
 */
function detalleDeLaFila(item: ItemDelEstadoSanitario): string {
  if (item.estado === "NO_CORRESPONDE") {
    return "Corresponde más adelante, según la edad.";
  }

  if (item.ultimaAplicacion === null) {
    return "Sin aplicaciones registradas.";
  }

  const ultima = `Última: ${formatoFecha.format(item.ultimaAplicacion)}`;

  if (item.proximaDosis === null) {
    return `${ultima} · dosis única, no vence.`;
  }

  return `${ultima} · próxima: ${formatoFecha.format(item.proximaDosis)}`;
}

export function EstadoSanitario({ items }: { items: ItemDelEstadoSanitario[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {items.map((item) => {
        const { texto, variante } = PRESENTACION[item.estado];

        return (
          <li
            key={item.vacunaId}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {item.nombre}
                {/* "Obligatoria" en texto y no con un asterisco: un asterisco
                    pide una leyenda, y una leyenda al pie de la lista obliga a
                    ir y volver. */}
                {item.obligatoria ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    obligatoria
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {detalleDeLaFila(item)}
              </p>
            </div>

            <Badge variant={variante}>{texto}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
