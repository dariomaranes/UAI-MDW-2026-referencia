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
| `POST /api/mascotas/:id/aplicaciones` | Registra la aplicación de una vacuna | Veterinario | 400, 401, 403, 404 |

**El `403` del `POST`**: acá sí es `403` y no `404`, porque el problema es el rol. Un dueño no
registra aplicaciones aunque la mascota sea suya: la vacuna la aplica un profesional.

**El `400`** cubre las dos reglas de la H2: la fecha de aplicación no puede ser futura, y la
mascota tiene que alcanzar la edad mínima de esa vacuna.

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

> **Esta sección se completa en la clase 5.** Está vacía a propósito, y el hueco es
> parte del contrato: **un TODO escrito es una decisión postergada; un TODO ausente
> es una que nadie tomó.**

Arriba, la columna **Errores** dice *qué status* devuelve cada operación. Lo que falta
es lo otro: **qué situación concreta produce cada uno y qué mensaje ve el usuario.**

Un número solo no alcanza. `409` en `POST /api/certificados` puede ser "le falta la
antirrábica" o "ya tiene uno vigente", y al dueño hay que decirle cuál — el criterio de
aceptación de la H4 pide que la respuesta **enumere** las vacunas que faltan, no que
avise que algo salió mal.

El insumo sale de un solo lugar: los **"caso de error"** que ya están escritos en los
criterios de aceptación de cada historia de `spec.md`. Hoy están desperdigados, uno por
historia. Acá se juntan, y a cada uno se le agrega el status y el mensaje.

La única sección que ya tiene algo de esto es la de certificados, con *"Los `409` de
esta sección"*. Sirve como muestra del formato; falta el resto, y falta el mensaje.

---

## Qué está implementado hoy

El contrato de arriba está completo; el código no. Se construye clase a clase, y este es el
estado real del repositorio:

| Clase | Qué se agregó |
|---|---|
| 3 | `POST` y `GET` de `/api/mascotas`, como ejemplo del patrón |
| 4 | El resto de los endpoints de esta tabla |
| 5 | Los errores de negocio con su mensaje: los `409` dejan de ser genéricos |
| 6 | La sesión: desaparecen los `TODO (clase 6)` y los `401` empiezan a ser reales |

Las operaciones que todavía no existen están escritas y **comentadas** en `docs/api.http`, así
que se puede ver la sintaxis antes de que el endpoint responda.
