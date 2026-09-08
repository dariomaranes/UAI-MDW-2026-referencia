/**
 * Las reglas del plan de vacunación.
 *
 * Este archivo es la capa que faltaba: ni consultas ni respuestas HTTP, solo
 * las reglas del dominio. Fijate en lo que NO tiene arriba de todo: no hay un
 * solo `import`. No conoce Prisma, no conoce Next y no sabe leer la hora.
 *
 * Por qué importa:
 *
 *   - Se prueba con `npm test`, sin base y sin servidor (ver el .test.ts de
 *     al lado). Las reglas de negocio son lo único del proyecto que NO se
 *     puede verificar mirando la pantalla, así que son justo lo que hay que
 *     testear.
 *   - La misma regla la usan tres endpoints: el estado sanitario (H3), la
 *     solicitud del certificado (H4) y la emisión (H5). Escrita adentro de un
 *     handler, estaría copiada tres veces y se corregiría en una.
 *
 * Y el detalle que parece una manía: `hoy` entra POR PARÁMETRO. Una función
 * que lee el reloj adentro no se puede testear —el test "una vacuna vencida
 * aparece como vencida" tendría que esperar a que venza— y no se puede
 * reusar para preguntar "¿estaba al día el 3 de agosto?", que es exactamente
 * lo que un certificado emitido afirma. El reloj se lee una sola vez, en el
 * borde, y viaja hacia adentro.
 *
 * Por eso el chequeo del taller es un grep, y este archivo tiene que pasarlo
 * sin una sola coincidencia: ni el ORM, ni la respuesta HTTP, ni una llamada
 * al reloj sin argumentos aparecen acá.
 */

/**
 * Una vacuna del catálogo, con las dos reglas que hacen falta para razonar:
 * desde qué edad corresponde y cada cuánto se repite.
 *
 * Es un tipo propio y no el de Prisma a propósito: esta función necesita
 * cinco campos, no la fila entera. Así el test arma un plan a mano en dos
 * líneas, sin inventar `creadoEn` ni ids de relaciones que no usa.
 */
export type VacunaDelPlan = {
  id: string;
  nombre: string;
  edadMinimaMeses: number;
  /** `null` = dosis única, sin refuerzo. */
  intervaloRefuerzoDias: number | null;
  obligatoria: boolean;
};

/** Lo mínimo que se necesita saber de una aplicación ya registrada. */
export type AplicacionCargada = {
  vacunaId: string;
  fecha: Date;
  /** `null` cuando la vacuna es de dosis única. */
  proximaDosis: Date | null;
};

/**
 * Los cuatro estados posibles de una vacuna del plan para una mascota.
 *
 * Los tres primeros son los de la H3. El cuarto es el que se olvida siempre y
 * el que hace fallar la demo: un cachorro de un mes NO está "pendiente" de la
 * antirrábica, todavía no le corresponde. Sin este estado, ningún cachorro
 * podría tener un certificado nunca.
 */
export type EstadoDeVacuna =
  | "AL_DIA"
  | "PENDIENTE"
  | "VENCIDA"
  | "NO_CORRESPONDE";

export type ItemDelEstadoSanitario = {
  vacunaId: string;
  nombre: string;
  obligatoria: boolean;
  estado: EstadoDeVacuna;
  ultimaAplicacion: Date | null;
  proximaDosis: Date | null;
};

/**
 * Meses cumplidos entre dos fechas.
 *
 * "Cumplidos", no "aproximados": el día 29 del mes siguiente todavía no son
 * dos meses. Dividir por 30 días daría un resultado parecido y mal, y el
 * error aparecería solo en los bordes — que es donde vive esta regla.
 */
export function mesesCumplidos(desde: Date, hasta: Date): number {
  const meses =
    (hasta.getFullYear() - desde.getFullYear()) * 12 +
    (hasta.getMonth() - desde.getMonth());

  // Todavía no llegó el día del mes: falta un mes para cumplirlo.
  return hasta.getDate() < desde.getDate() ? meses - 1 : meses;
}

/** ¿La mascota ya tiene la edad a partir de la cual esta vacuna corresponde? */
export function alcanzaLaEdadMinima(
  fechaNacimiento: Date,
  edadMinimaMeses: number,
  hoy: Date,
): boolean {
  return mesesCumplidos(fechaNacimiento, hoy) >= edadMinimaMeses;
}

/**
 * Cuándo toca el refuerzo de una aplicación que se registra hoy.
 *
 * Es un dato DERIVADO: no lo manda el cliente, lo calcula el servidor a
 * partir del plan de la vacuna. La H2 lo dice así — "el sistema calcula la
 * fecha de la próxima dosis y la muestra"— y por eso `proximaDosis` salió del
 * schema de entrada en esta clase.
 *
 * Se guarda igual, aunque sea derivado, y eso no contradice nada: es el
 * resultado de una decisión tomada con el plan que regía ESE día. Si mañana
 * cambia el intervalo de refuerzo, las aplicaciones viejas conservan la fecha
 * que se le informó al dueño.
 */
export function calcularProximaDosis(
  fechaAplicacion: Date,
  intervaloRefuerzoDias: number | null,
): Date | null {
  if (intervaloRefuerzoDias === null) return null;

  const proxima = new Date(fechaAplicacion);
  proxima.setDate(proxima.getDate() + intervaloRefuerzoDias);
  return proxima;
}

/** La aplicación más reciente de esa vacuna, o `null` si nunca se aplicó. */
function ultimaAplicacionDe(
  vacunaId: string,
  aplicaciones: AplicacionCargada[],
): AplicacionCargada | null {
  return aplicaciones
    .filter((aplicacion) => aplicacion.vacunaId === vacunaId)
    .reduce<AplicacionCargada | null>(
      (masReciente, aplicacion) =>
        masReciente === null || aplicacion.fecha > masReciente.fecha
          ? aplicacion
          : masReciente,
      null,
    );
}

/**
 * El estado de UNA vacuna del plan. Es la regla completa, en cuatro
 * preguntas y en este orden — el orden importa: la edad se pregunta primero
 * porque decide si las otras tres tienen sentido.
 */
function estadoDeUnaVacuna(
  vacuna: VacunaDelPlan,
  ultima: AplicacionCargada | null,
  fechaNacimiento: Date,
  hoy: Date,
): EstadoDeVacuna {
  if (!alcanzaLaEdadMinima(fechaNacimiento, vacuna.edadMinimaMeses, hoy)) {
    return "NO_CORRESPONDE";
  }

  if (ultima === null) return "PENDIENTE";

  // Dosis única aplicada: no vence nunca.
  if (ultima.proximaDosis === null) return "AL_DIA";

  return ultima.proximaDosis > hoy ? "AL_DIA" : "VENCIDA";
}

/**
 * El estado sanitario completo: cada vacuna del plan con su estado.
 *
 * Es la H3 tal cual está escrita, y de acá salen las otras dos reglas de
 * abajo. Una sola función que calcula, tres formas de preguntarle.
 */
export function estadoSanitario(
  plan: VacunaDelPlan[],
  aplicaciones: AplicacionCargada[],
  fechaNacimiento: Date,
  hoy: Date,
): ItemDelEstadoSanitario[] {
  return plan.map((vacuna) => {
    const ultima = ultimaAplicacionDe(vacuna.id, aplicaciones);

    return {
      vacunaId: vacuna.id,
      nombre: vacuna.nombre,
      obligatoria: vacuna.obligatoria,
      estado: estadoDeUnaVacuna(vacuna, ultima, fechaNacimiento, hoy),
      ultimaAplicacion: ultima?.fecha ?? null,
      proximaDosis: ultima?.proximaDosis ?? null,
    };
  });
}

/**
 * Las vacunas OBLIGATORIAS que no están al día (H4 y H5).
 *
 * Devuelve los nombres y no un booleano, y esa es la decisión de diseño del
 * archivo: el criterio de aceptación de la H4 pide que la respuesta
 * **enumere cuáles faltan**. Un `true/false` obligaría a hacer el cálculo dos
 * veces o a mostrar un mensaje genérico. El array vacío ya significa "está al
 * día": el booleano sobra.
 *
 * Y las que dicen NO_CORRESPONDE no cuentan: al cachorro no le "falta" una
 * vacuna que todavía no puede recibir.
 */
export function vacunasFaltantes(
  plan: VacunaDelPlan[],
  aplicaciones: AplicacionCargada[],
  fechaNacimiento: Date,
  hoy: Date,
): string[] {
  return estadoSanitario(plan, aplicaciones, fechaNacimiento, hoy)
    .filter((item) => item.obligatoria)
    .filter((item) => item.estado === "PENDIENTE" || item.estado === "VENCIDA")
    .map((item) => item.nombre);
}

/**
 * La primera fecha en que vence alguna de las obligatorias que hoy están al
 * día, o `null` si ninguna vence (todas de dosis única).
 *
 * Es el primer término de la regla de vencimiento del certificado: "vence
 * cuando vence la primera de las vacunas obligatorias que lo respaldan, o a
 * los 30 días de emitido, lo que ocurra primero". El segundo término ya vivía
 * en `calcularVencimiento` desde la clase 4, esperando este valor con un
 * `null` puesto a mano.
 */
export function primerVencimientoObligatorio(
  plan: VacunaDelPlan[],
  aplicaciones: AplicacionCargada[],
  fechaNacimiento: Date,
  hoy: Date,
): Date | null {
  return estadoSanitario(plan, aplicaciones, fechaNacimiento, hoy)
    .filter((item) => item.obligatoria && item.estado === "AL_DIA")
    .reduce<Date | null>(
      (primero, item) =>
        item.proximaDosis !== null &&
        (primero === null || item.proximaDosis < primero)
          ? item.proximaDosis
          : primero,
      null,
    );
}
