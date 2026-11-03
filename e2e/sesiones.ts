/** Dónde quedan las sesiones de prueba que arma `preparar.ts`. */
import path from "node:path";

const carpeta = path.join(__dirname, ".sesiones");

export const SESION = {
  dueno: path.join(carpeta, "dueno.json"),
  otraDuena: path.join(carpeta, "otra-duena.json"),
  veterinario: path.join(carpeta, "veterinario.json"),
} as const;
