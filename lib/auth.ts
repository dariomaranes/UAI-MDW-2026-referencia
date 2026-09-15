/**
 * Autenticación y autorización. LAS DOS PREGUNTAS DE LA CLASE 6.
 *
 *   ¿Quién sos?        → autenticación. La resuelve Auth.js con un proveedor
 *                        externo. Se configura una vez y no se toca más.
 *   ¿Esto lo podés?    → autorización. La resuelve el dominio de ustedes, y
 *                        es lo que se defiende en el parcial.
 *
 * La división que ordena este archivo:
 *
 *   el proveedor  →  prueba que sos el dueño de ese mail
 *   nuestra base  →  dice QUÉ sos adentro del sistema (el rol)
 *
 * Google sabe el mail de alguien. No sabe —ni puede saber— si esa persona es
 * veterinaria. Eso sale de la tabla `Usuario`, y por eso el `upsert` de abajo
 * crea SIEMPRE el rol de menor privilegio.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * Lo que el resto del proyecto conoce de quien está haciendo el request.
 *
 * `rol` sale de `@prisma/client`, no de una unión escrita a mano. Si acá
 * dijera "USUARIO" y la base dijera "DUENO", la comparación de rol daría
 * `false` siempre y el sistema respondería 403 a todo el mundo sin que nada
 * falle a la vista.
 */
export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

/**
 * Los dos errores de autorización, con nombre propio.
 *
 * Tienen tipo porque el `catch` del handler necesita distinguirlos del resto
 * para responder 401 o 403 en lugar de 500. Con `new Error("No autenticado")`
 * habría que comparar strings, que es exactamente el tipo de acoplamiento que
 * se rompe el día que alguien corrige una tilde.
 */
export class NoAutenticado extends Error {}
export class NoAutorizado extends Error {}

/**
 * Lo que Auth.js guarda en el token y expone en la sesión.
 *
 * Sin esta declaración, TypeScript no conoce `session.user.rol` y hay que
 * castear en cada endpoint.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      rol: Rol;
    };
  }
}

// El import sin nombre existe para que TypeScript cargue el módulo y acepte
// la ampliación de abajo. Sin esta línea: "module cannot be found".
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    usuarioId?: string;
    rol?: Rol;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  /**
   * La sesión viaja en una cookie cifrada, no en una tabla.
   *
   * Cifrada y no solo firmada: Auth.js usa JWE, así que el contenido no se
   * puede leer sin `AUTH_SECRET` — pegarlo en jwt.io no muestra nada. El JWT
   * "clásico" de los tutoriales solo va firmado, y ahí cualquiera lee el
   * payload con un copiar y pegar.
   *
   * Qué se gana: cero consultas a la base para saber quién llama, que en
   * serverless es la diferencia entre una conexión y ninguna.
   *
   * Qué se resigna, y hay que saber contestarlo: EL ROL DEL TOKEN ES UNA
   * FOTO. Si un admin promueve a alguien a veterinario, esa persona sigue
   * siendo dueña hasta que cierre sesión y vuelva a entrar. La decisión y su
   * alternativa están en `docs/adr/0003-identidad-delegada-y-sesion-en-token.md`.
   */
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Corre UNA vez, al entrar: es el único momento en que `user` viene con
     * los datos del proveedor.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const usuario = await prisma.usuario.upsert({
          where: { email: user.email },
          // Vacío a propósito: si la persona ya existe, lo que dice el
          // proveedor NO pisa lo que dice nuestra base. Con `{ rol: "DUENO" }`
          // acá, un veterinario perdería su rol en el siguiente login.
          update: {},
          create: {
            email: user.email,
            nombre: user.name ?? user.email,
            rol: "DUENO",
          },
        });

        token.usuarioId = usuario.id;
        token.rol = usuario.rol;
      }

      return token;
    },

    /**
     * Corre en cada request: pasa del token a lo que ve el código.
     */
    async session({ session, token }) {
      if (token.usuarioId && token.rol) {
        session.user.id = token.usuarioId;
        session.user.rol = token.rol;
      }

      return session;
    },
  },
});

/**
 * El usuario de la sesión, o null si no hay.
 * Se usa donde la página funciona con y sin alguien logueado.
 */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const sesion = await auth();

  if (!sesion?.user?.id) return null;

  return {
    id: sesion.user.id,
    email: sesion.user.email,
    nombre: sesion.user.name ?? sesion.user.email,
    rol: sesion.user.rol,
  };
}

/**
 * El usuario de la sesión, o se corta el request.
 *
 * Por qué esta LANZA, si en la clase 5 dijimos que lo esperado se devuelve:
 * porque esta pregunta es la primera línea de los treinta endpoints. Si
 * devolviera un valor, cada handler tendría que abrirse con un `if`, y el día
 * que alguien lo olvide el endpoint queda ABIERTO sin que nada avise.
 * Lanzando, olvidarse rompe el request en vez de dejarlo pasar: el error se
 * va para el lado seguro.
 *
 * Es la única excepción del proyecto, vive en este módulo, y la traduce
 * `responderError` en el borde.
 */
export async function requerirUsuario(rol?: Rol): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();

  if (!usuario) throw new NoAutenticado();

  // Se compara acá y no en la interfaz: esconder un botón no impide que
  // alguien llame al endpoint con curl.
  if (rol && usuario.rol !== rol) throw new NoAutorizado();

  return usuario;
}
