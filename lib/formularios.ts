/**
 * El tipo que viaja entre una Server Action y su formulario.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN TIPO COMPARTIDO Y NO UNO POR FORMULARIO
 * ---------------------------------------------------------------------------
 * Porque `useActionState` obliga a que la acción y el componente se pongan de
 * acuerdo en una forma, y si cada pantalla inventa la suya, el tercer
 * formulario termina devolviendo `{ error: string }`, el cuarto
 * `{ mensaje: string }` y ninguno sabe pintar los errores del otro.
 *
 * Con una sola forma, el componente que muestra un error de campo sirve para
 * todos los formularios del sistema.
 *
 * ---------------------------------------------------------------------------
 * LOS DOS TIPOS DE ERROR, QUE NO SE MUESTRAN EN EL MISMO LUGAR
 * ---------------------------------------------------------------------------
 *   errores   por campo, y van DEBAJO DEL CAMPO
 *             "El nombre necesita al menos 2 caracteres"
 *
 *   mensaje   del caso de uso, y va ARRIBA DEL FORMULARIO
 *             "La antirrábica se aplica a partir de los 3 meses"
 *
 * La diferencia no es estética: el primero lo arregla corrigiendo ese campo;
 * el segundo puede que no se pueda arreglar, y ponerlo debajo de un input
 * sugiere que sí. Es la distinción del 400 contra el 409 de la clase 5,
 * traducida a una pantalla.
 */

/** Lo que la persona había escrito, para no vaciarle el formulario al fallar. */
export type ValoresDelFormulario = Record<string, string>;

export type EstadoDelFormulario = {
  ok: false;
  /** Errores de validación, por nombre de campo. Los produce Zod. */
  errores?: Record<string, string[] | undefined>;
  /** Un rechazo del caso de uso: los datos eran válidos y aun así no se pudo. */
  mensaje?: string;
  valores?: ValoresDelFormulario;
};

/**
 * El estado con el que arranca un formulario que todavía nadie envió.
 *
 * Existe como constante para que ninguna pantalla escriba `{ ok: false }` a
 * mano y se olvide un campo. Y es `ok: false` sin errores, que se lee raro
 * hasta que se entiende: "todavía no pasó nada" y "salió mal" se distinguen
 * por si hay errores, no por el estado inicial.
 */
export const SIN_ENVIAR: EstadoDelFormulario = { ok: false };
