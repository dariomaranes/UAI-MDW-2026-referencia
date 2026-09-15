# ADR 0003 — Identidad delegada en Google y sesión en token

**Estado:** aceptado
**Fecha:** 2026-09-15
**Decide:** cátedra (docente + equipo de referencia)

---

## Contexto

Hasta la clase 5 la API no sabía quién la llamaba. Cada handler tenía un
`TODO (clase 6)` y un id de usuario escrito a mano, y el `seed` fijaba esos
ids para que el andamio funcionara. Con eso, cualquiera podía listar las
mascotas de cualquiera y emitir un certificado desde Postman.

La spec pide dos roles con permisos distintos y una regla que los ordena: un
veterinario **no puede auto-registrarse** como tal, porque si cualquiera
pudiera declararse veterinario podría emitir certificados falsos y el sistema
entero perdería su valor.

Hay dos decisiones que tomar, y son independientes.

## Decisión 1 — La identidad la prueba un tercero

Se usa **Auth.js con un proveedor OAuth (Google)** en lugar de usuario y
contraseña propios.

**A favor:** no guardamos contraseñas, así que no las podemos filtrar. No hay
que construir registro, recuperación, verificación de mail ni política de
complejidad, que son cuatro pantallas y varias reglas de seguridad que no
están en la spec.

**En contra:** el sistema depende de un servicio que no controlamos. Si Google
no responde, nadie entra. Y obliga al usuario a tener cuenta ahí.

**Por qué igual conviene:** la alternativa no es "no depender de nadie", es
"hacerse cargo del hash de contraseñas y de su filtración". Para un sistema
que maneja registros sanitarios, delegar la prueba de identidad a un proveedor
serio es la opción más segura y la más barata.

### El rol no viene del proveedor

Google prueba que alguien es dueño de un mail. **No sabe ni puede saber si esa
persona es veterinaria.** Por eso la separación:

    el proveedor  →  prueba quién sos
    nuestra base  →  dice QUÉ sos adentro del sistema

El `upsert` del callback `jwt` en `lib/auth.ts` crea siempre el rol `DUENO`, y
su `update` va vacío a propósito: si alguien ya existe, lo que dice el
proveedor no pisa lo que dice nuestra base. Con `{ rol: "DUENO" }` ahí, un
veterinario perdería su rol en el login siguiente.

El rol de veterinario lo asigna un administrador. **Hoy se hace a mano en la
base**, y está bien que así sea: la pantalla de administración no está en la
spec y lo que la regla exige es que no exista forma de auto-asignarse un rol
desde la API, no que exista un panel.

## Decisión 2 — La sesión viaja en un token, no en una tabla

Se usa `session: { strategy: "jwt" }`.

**A favor:** cero consultas a la base para saber quién llama. En Vercel, donde
cada request puede caer en una instancia distinta, eso es la diferencia entre
abrir una conexión y no abrirla.

**En contra, y hay que saber contestarlo en la defensa:** el rol del token es
**una foto del momento del login**. Si un admin promueve a alguien a
veterinario, esa persona sigue siendo dueña hasta que cierre sesión y vuelva a
entrar. Tampoco se puede revocar una sesión al instante.

**La alternativa** era guardar la sesión en la base: el cambio de rol es
inmediato y se puede revocar, al precio de una consulta por request y de las
tablas del adapter.

**Qué se eligió:** el token, porque en este sistema los cambios de rol son
excepcionales —un veterinario se da de alta una vez— y la revocación
instantánea no es un requisito de la spec. Si algún día lo fuera, el cambio es
de una línea más las tablas del adapter.

## Consecuencias

- Ninguna tabla nueva ni migración: `Usuario` alcanza, ligado por `email`.
- `lib/auth.ts` es el único lugar del proyecto que decide quién es alguien.
- `requerirUsuario` **lanza** en vez de devolver, y es la única excepción del
  proyecto: la traduce `responderError` en el borde de cada handler.
- Los `TODO (clase 6)` desaparecen y el `seed` vuelve a ids `cuid()`.
- Para probar el camino del veterinario alcanza con que el mail sembrado en
  `prisma/seed.ts` coincida con la cuenta con la que se inicia sesión.
