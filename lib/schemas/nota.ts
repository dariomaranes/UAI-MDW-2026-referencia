/**
 * Schemas de validación de la entidad Nota.
 *
 * Un solo schema para el cliente y el servidor: el formulario valida con el
 * mismo objeto con el que valida la API. Si las reglas estuvieran duplicadas,
 * tarde o temprano quedarían distintas.
 *
 * `yup.InferType` deriva el tipo de TypeScript del schema, así el tipo y la
 * validación nunca se desincronizan.
 *
 * Ojo: en Yup los campos son OPCIONALES por defecto. Lo que es obligatorio en
 * el dominio se marca con .required().
 */
import * as yup from "yup";

export const crearNotaSchema = yup.object({
  titulo: yup
    .string()
    .trim()
    .min(3, "El título necesita al menos 3 caracteres")
    .max(120, "El título no puede superar los 120 caracteres")
    .required("El título es obligatorio"),
  contenido: yup
    .string()
    .trim()
    .min(1, "El contenido no puede estar vacío")
    .max(5000, "El contenido no puede superar los 5000 caracteres")
    .required("El contenido es obligatorio"),
});

export type CrearNotaInput = yup.InferType<typeof crearNotaSchema>;
