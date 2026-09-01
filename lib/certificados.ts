/**
 * Reglas de negocio del certificado.
 *
 * Ojo con la ubicación: esto NO va en `lib/db/`. Ahí viven las consultas;
 * acá, las reglas. Son dos capas distintas y se nota en que este archivo no
 * importa Prisma ni sabe que existe una base de datos: recibe datos y
 * devuelve datos, así que se puede probar con un test sin levantar nada.
 */
import { randomInt } from "node:crypto";

/** Sin I, O, 0 ni 1: se confunden al leer un código de un papel o una pantalla. */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const LARGO_CODIGO = 12;

/** Tope máximo de vigencia, en días, según la regla de negocio de la spec. */
const VIGENCIA_MAXIMA_DIAS = 30;

/**
 * El código que un tercero sin cuenta usa para verificar el certificado (H6).
 *
 * Es público pero tiene que ser IMPOSIBLE DE ADIVINAR, y ahí está el punto:
 * se usa `randomInt` de `node:crypto`, no `Math.random()`. `Math.random` es
 * predecible —está pensado para simulaciones, no para secretos— y con unas
 * cuantas muestras se puede reconstruir la secuencia. Un id autoincremental
 * sería todavía peor: probando 1, 2, 3 se listan todos los certificados del
 * sistema.
 */
export function generarCodigoVerificacion(): string {
  let codigo = "";

  for (let i = 0; i < LARGO_CODIGO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }

  return codigo;
}

/**
 * Hasta cuándo vale el certificado.
 *
 * La spec dice: vence cuando vence la primera de las vacunas obligatorias que
 * lo respaldan, O a los 30 días de emitido, lo que ocurra primero.
 *
 * El segundo término ya está implementado. El primero necesita el plan de
 * vacunación de la especie, que es la regla que se arma en la clase 5: por
 * eso `vencimientoDeVacunas` es opcional y hoy llega siempre `null`.
 *
 * Se calcula UNA VEZ, al emitir, y se guarda. A diferencia del estado
 * sanitario de una mascota —que se calcula al leerlo— esto es parte de lo que
 * el certificado afirma: no puede cambiar retroactivamente porque después se
 * aplique otra vacuna.
 */
export function calcularVencimiento(
  emitidoEn: Date,
  vencimientoDeVacunas: Date | null = null,
): Date {
  const tope = new Date(emitidoEn);
  tope.setDate(tope.getDate() + VIGENCIA_MAXIMA_DIAS);

  if (vencimientoDeVacunas === null) return tope;

  // "Lo que ocurra primero".
  return vencimientoDeVacunas < tope ? vencimientoDeVacunas : tope;
}
