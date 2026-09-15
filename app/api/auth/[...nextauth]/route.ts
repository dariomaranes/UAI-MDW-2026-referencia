/**
 * La ruta que publica Auth.js: login, logout y el callback del proveedor.
 *
 * Son tres líneas y no se vuelven a tocar en todo el cuatrimestre. Todo lo
 * que hay para decidir está en `lib/auth.ts`.
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
