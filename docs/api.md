# Contrato de la API — Libreta Sanitaria

Una fila por operación. Cada una sale de una historia de `spec.md`: si una historia no genera
ninguna operación, o está mal escrita o no era una historia.

Las cuatro columnas son las que se piden en el taller de la clase 4:

- **Método y ruta** — sustantivo en plural en la URL, verbo en el método HTTP.
- **Qué hace** — una línea. Si no entra en una línea, probablemente sean dos operaciones.
- **Rol** — quién puede llamarla. **Ninguna fila puede quedar vacía.** Las que dicen *Público*
  son públicas a propósito.
- **Errores** — los status que devuelve además del camino feliz. Salen de los
  *"caso de error"* de los criterios de aceptación.

> El `401` aparece en toda operación que exige sesión. Hoy no hay sesión —llega en la clase 6— y
> por eso los handlers tienen su `TODO (clase 6)` escrito donde va. El contrato se escribe
> completo igual: **un TODO escrito es una decisión postergada; un TODO ausente es una que nadie
> tomó.**

---

## Mascotas

La entidad principal del dominio, y la única con CRUD completo.

| Método y ruta | Qué hace | Rol | Errores |
|---|---|---|---|
| `GET /api/mascotas` | Lista las mascotas del dueño de la sesión | Dueño | 401 |
| `POST /api/mascotas` | Registra una mascota | Dueño | 400, 401 |
| `GET /api/mascotas/:id` | La ficha de una mascota | Dueño (la suya) | 401, 404 |
| `PATCH /api/mascotas/:id` | Corrige datos de la mascota | Dueño (la suya) | 400, 401, 404 |
| `DELETE /api/mascotas/:id` | Borra una mascota | Dueño (la suya) | 401, 404, 409 |

**Por qué el `404` y no un `403`** en las tres últimas: si la mascota existe pero es de otro
dueño, responder `403` confirma que existe. Para este dueño, la mascota del vecino **no existe**.
El `403` se reserva para cuando el problema es el rol, no la pertenencia.

**El `409` del `DELETE`**: la spec dice que una mascota con aplicaciones o certificados no se
borra —la libreta existe para conservar historial— y la base lo impide con `onDelete: Restrict`.
No es un error del cliente: es el estado actual que choca con la operación.

**El `400` del `POST` y del `PATCH`**: lo devuelve Zod. Incluye la regla de negocio de la H1, que
la fecha de nacimiento no puede ser posterior a hoy.

---

## Aplicaciones de vacunas

Anidadas bajo la mascota: una aplicación **no tiene sentido sin su mascota**, que es la única
razón válida para anidar. Un solo nivel, nunca dos.

| Método y ruta | Qué hace | Rol | Errores |
|---|---|---|---|
| `GET /api/mascotas/:id/aplicaciones` | El historial de aplicaciones de la mascota | Dueño (la suya) · Veterinario | 401, 403, 404 |
| `POST /api/mascotas/:id/aplicaciones` | Registra la aplicación de una vacuna | Veterinario | 400, 401, 403, 404, 409 |

**El `403` del `POST`**: acá sí es `403` y no `404`, porque el problema es el rol. Un dueño no
registra aplicaciones aunque la mascota sea suya: la vacuna la aplica un profesional.

**Las tres reglas de la H2 caen en tres capas distintas**, y es el mejor ejemplo del criterio de
la clase 5 — lo que las separa no es su importancia, es con qué información alcanza para
decidirlas:

| Regla | Con qué se decide | Dónde vive | Status |
|---|---|---|---|
| La fecha de aplicación no puede ser futura | El body y el calendario | `registrarAplicacionSchema` | `400` |
| La vacuna tiene que ser de la especie de la mascota | Hay que ir a buscar las dos | El handler | `409` |
| La mascota tiene que alcanzar la edad mínima | Fecha de nacimiento + catálogo | `lib/estado-sanitario.ts` | `409` |

La edad se evalúa contra la **fecha de la aplicación**, no contra hoy: registrar hoy una vacuna
que se aplicó hace dos años tiene que verificar la edad que la mascota tenía **ese día**.

**`proximaDosis` no es un campo de entrada.** Salió del body en la clase 5: es un dato derivado
que calcula el servidor sumando el `intervaloRefuerzoDias` del catálogo, y la H2 lo pedía así
desde el principio —"el sistema calcula la fecha de la próxima dosis y la muestra"—. Es la misma
regla que el `duenoId`: **el cliente no manda lo que el servidor sabe.**

---

## Estado sanitario

| Método y ruta | Qué hace | Rol | Errores |
|---|---|---|---|
| `GET /api/mascotas/:id/estado-sanitario` | Cada vacuna del plan como al día, pendiente o vencida | Dueño (la suya) · Veterinario | 401, 404 |

**No hay columna `estado` en la base.** Esto se calcula al consultarlo, a partir de las
aplicaciones y del plan de la vacuna. Si se guardara, quedaría desactualizado solo el día que una
vacuna vence, sin que nadie toque el sistema.

---

## Certificados

Acá vive **la operación que no es un ABM**, que es la que decide si esto es un producto o una
planilla de cálculo.

| Método y ruta | Qué hace | Rol | Errores |
|---|---|---|---|
| `GET /api/certificados` | Los certificados de las mascotas del dueño | Dueño | 401 |
| `POST /api/certificados` | Solicita un certificado para una mascota | Dueño (la suya) | 400, 401, 404, 409 |
| `GET /api/certificados/:id` | El detalle de un certificado | Dueño (el suyo) · Veterinario | 401, 404 |
| `POST /api/certificados/:id/emision` | **Lo emite**: genera el código y congela el vencimiento | Veterinario | 401, 403, 404, 409 |
| `POST /api/certificados/:id/anulacion` | Lo anula | Veterinario (el que lo emitió) | 401, 403, 404, 409 |

### Por qué `POST /emision` y no `PATCH { "estado": "EMITIDO" }`

Es la decisión de diseño más importante de este archivo.

Con el `PATCH`, **es el cliente el que decide la transición** y el servidor obedece: nada impide
mandar `{ "estado": "ANULADO" }` o saltarse un paso. Con el sub-recurso, el cliente *pide que
ocurra la operación* y el servidor decide si corresponde.

Además cada transición tiene **su propio permiso** —emitir lo hace cualquier veterinario, anular
solo el que emitió— y así cada una queda en su endpoint, con su propia verificación. Mezcladas en
un `PATCH`, esos dos permisos distintos conviven en el mismo lugar.

Emitir, además, no es escribir un campo: verifica que las obligatorias sigan al día, genera un
código único, congela el vencimiento y guarda quién lo emitió. Nada de eso es un ABM.

### Los `409` de esta sección

| Operación | Qué choca |
|---|---|
| `POST /api/certificados` | A la mascota le falta alguna vacuna obligatoria. La respuesta **enumera cuáles** |
| `POST /api/certificados/:id/emision` | Venció una obligatoria entre la solicitud y la emisión, o el certificado ya está emitido |
| `POST /api/certificados/:id/anulacion` | El certificado no está emitido |

---

## Verificación pública

| Método y ruta | Qué hace | Rol | Errores |
|---|---|---|---|
| `GET /api/verificacion/:codigo` | Dice si un certificado es auténtico y si está vigente | **Público** | 404 |

Es la única operación **sin sesión**, y es pública a propósito: quien verifica —una aerolínea, una
guardería— no tiene cuenta ni la va a crear.

Tres cosas que la hacen distinta de todas las demás:

- **Devuelve lo mínimo**: mascota, fecha de emisión, vencimiento y estado. **Ningún dato del
  dueño.** El `select` de `lib/db/` es acá una medida de seguridad, no una optimización.
- **El `404` no revela nada.** Un código que no existe devuelve "no encontrado" a secas, sin
  pistas sobre si estuvo bien escrito.
- **Es cacheable y compartible por URL**, que es justo lo que un `GET` bien hecho permite y una
  Server Action no.

---

## Los errores, en detalle

Arriba, la columna **Errores** dice *qué status* devuelve cada operación. Acá está lo otro:
**qué situación concreta produce cada uno y qué ve el usuario.**

Un número solo no alcanza. `409` en `POST /api/certificados` puede ser "le falta la antirrábica"
o "ya tiene uno vigente", y al dueño hay que decirle cuál. Cada fila de esta tabla sale de un
*"caso de error"* de un criterio de aceptación de `spec.md`: si una fila no tiene historia de
origen, sobra; si un caso de error de la spec no aparece acá, es una regla que nadie implementó.

### La forma de una respuesta de error

Una sola, para toda la API. El campo `error` siempre está; los otros dos aparecen según el caso.

```json
{
  "error": "La mascota no está al día con las vacunas obligatorias",
  "faltantes": ["Antirrábica", "Triple felina"]
}
```

| Campo | Cuándo | Para quién |
|---|---|---|
| `error` | Siempre | La **persona**. Una oración en castellano que dice qué hacer |
| `detalles` | Cuando lo rechazó Zod: es su `error.flatten()`, campo por campo | El **formulario**, que resalta el input que falló |
| Un campo propio (`faltantes`, `edadMinimaMeses`) | Cuando el criterio de aceptación pide enumerar o informar un valor | La **pantalla**, que lo muestra sin parsear castellano |

El dato estructurado va **aparte del mensaje**, nunca embutido en el string. Toda respuesta de
error tiene dos audiencias y escribir para una sola es el error más común.

### El criterio: `400` o `409`

> **¿El cliente puede arreglarlo cambiando lo que manda?**
> Si sí, es `400`. Si tiene que pasar otra cosa en el sistema —vacunar al animal, esperar, que
> otro anule el certificado— es `409`.

`422` existe y muchas APIs lo usan para lo que acá mandamos con `400`. No está mal; lo que está
mal es mezclar los dos sin criterio. **En este proyecto: `400` para todo lo que rechaza Zod,
`409` para las reglas de negocio.** Otro criterio es válido si va en un ADR.

### El catálogo

| Operación | Situación | Status | Qué ve el usuario | Quién lo agarra |
|---|---|---|---|---|
| `POST /api/mascotas` | Falta un campo o la especie no está en el catálogo | `400` | El detalle campo por campo | Zod |
| `POST /api/mascotas` | La fecha de nacimiento es posterior a hoy (H1) | `400` | "La fecha de nacimiento no puede ser futura" | Zod |
| `POST /api/mascotas` | El chip no tiene 15 dígitos | `400` | "El chip tiene 15 dígitos" | Zod |
| `GET·PATCH·DELETE /api/mascotas/:id` | El id no existe, **o la mascota es de otro dueño** | `404` | "No encontrada" | La consulta (`duenoId` en el WHERE) |
| `DELETE /api/mascotas/:id` | La mascota tiene aplicaciones o certificados | `409` | "La mascota tiene historial sanitario cargado y no se puede borrar" | Regla + `onDelete: Restrict` |
| `POST /api/mascotas/:id/aplicaciones` | La fecha de aplicación es futura (H2) | `400` | "Una vacuna no se puede aplicar en el futuro" | Zod |
| `POST /api/mascotas/:id/aplicaciones` | El `vacunaId` no está en el catálogo | `404` | "Vacuna no encontrada" | La consulta |
| `POST /api/mascotas/:id/aplicaciones` | La vacuna es de otra especie | `409` | "Antirrábica del catálogo corresponde a GATO, y Laika es PERRO" | Regla |
| `POST /api/mascotas/:id/aplicaciones` | La mascota no alcanza la edad mínima (H2) | `409` | "Antirrábica se aplica a partir de los 3 meses" + `edadMinimaMeses` | Regla |
| `POST /api/certificados` | Le falta alguna vacuna obligatoria (H4) | `409` | "La mascota no está al día con las vacunas obligatorias" + `faltantes` | Regla |
| `POST /api/certificados` | La mascota no existe o no es del solicitante | `404` | "Mascota no encontrada" | La consulta |
| `POST /api/certificados/:id/emision` | Venció una obligatoria entre la solicitud y la emisión (H5) | `409` | "La mascota dejó de estar al día…" + `faltantes` | Regla |
| `POST /api/certificados/:id/emision` | El certificado ya está emitido o anulado | `409` | "El certificado no está pendiente de emisión (EMITIDO)" | El WHERE del `updateMany` |
| `POST /api/certificados/:id/anulacion` | El certificado no está emitido | `409` | "El certificado no está emitido" | El WHERE del `updateMany` |
| `GET /api/verificacion/:codigo` | El código no existe **o tiene formato inválido** | `404` | "No encontrado", a secas (H6) | La consulta |
| *Cualquiera* | Sin sesión | `401` | "No autenticado" | `requerirUsuario` — **clase 6** |
| *Cualquiera* | Con sesión y sin el rol necesario | `403` | "No podés realizar esta operación" | `requerirUsuario` — **clase 6** |
| *Cualquiera* | Se rompió algo del lado del servidor | `500` | "Error interno", **sin detalles** | El `catch` del handler |

### Tres decisiones que se leen en la tabla

**Enumerar acá sí, en el login no.** Que la respuesta liste las vacunas que le faltan a *su*
mascota está bien: el dueño ya tiene derecho a ese dato. El mismo detalle en un login —"el email
existe pero la contraseña está mal"— confirma qué direcciones están registradas, así que ahí el
mensaje correcto es el genérico, **a propósito y aunque sea peor UX**. La diferencia no es
técnica: es quién pregunta y sobre qué.

**El `500` no cuenta nada.** El mensaje de una excepción de Prisma revela nombres de tablas y a
veces el SQL. Eso va al `console.error` del servidor, que es de ustedes; la respuesta la lee un
desconocido.

**Ningún error esperado pasa por el `catch`.** Los `400`, `404` y `409` de esta tabla salen por
`return` mucho antes. Si un `throw` propio vive adentro de un `try`, ese error tendría que haber
sido un `return`: desde afuera, "falta la antirrábica" y "se cayó Postgres" se verían idénticos.

---

## Qué está implementado hoy

El contrato de arriba está completo; el código no. Se construye clase a clase, y este es el
estado real del repositorio:

| Clase | Qué se agregó |
|---|---|
| 3 | `POST` y `GET` de `/api/mascotas`, como ejemplo del patrón |
| 4 | Mascotas, certificados, emisión y verificación pública |
| 5 | Las aplicaciones, el estado sanitario, y las reglas de negocio con sus `409` |
| 6 | La sesión: desaparecen los `TODO (clase 6)` y los `401` empiezan a ser reales |

De la clase 5 salieron `lib/estado-sanitario.ts` —las reglas del plan de vacunación, sin Prisma y
sin Next, con sus tests— y el `try/catch` de cada handler. Lo único que sigue pendiente de esta
tabla es la **anulación**: es la única operación que no se puede escribir sin sesión, porque su
regla de negocio es *quién* la ejecuta —solo el veterinario que lo emitió—.

Las operaciones que todavía no existen están escritas y **comentadas** en `docs/api.http`, así
que se puede ver la sintaxis antes de que el endpoint responda.
