# ADR 0002 — Una sola solicitud pendiente por mascota y motivo

**Estado:** aceptado
**Fecha:** 2026-09-08
**Decide:** cátedra (docente + equipo de referencia)

---

## Contexto

Probando la API con `docs/api.http` apareció algo que ninguna historia de usuario contemplaba:
`POST /api/certificados` se puede llamar todas las veces que uno quiera y crea un certificado nuevo
cada vez. Tres requests seguidas para la misma mascota dejan tres filas en estado `SOLICITADO`.

No era un bug: la spec no decía nada al respecto. Era un **requisito que no existía y que apareció
usando el sistema** — el caso más honesto de todos, y uno de los doce principios del manifiesto
ágil ("dar la bienvenida a los requisitos cambiantes, incluso en etapas posteriores").

La restricción del contexto: la spec ya estaba escrita y el código ya estaba andando. La tentación
era resolverlo con un `if` en el handler y seguir. Eso habría dejado una regla de negocio sin
historia de origen, que es exactamente lo que el proyecto no quiere.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **A.** No hacer nada | Nadie pidió esta regla; menos código | Un dueño ansioso le llena la cola de solicitudes idénticas al veterinario |
| **B.** Una sola solicitud pendiente por mascota | Simple de explicar y de implementar | Rompe un caso legítimo: viajar **y** dejarla en la guardería son dos trámites distintos |
| **C.** Una sola solicitud pendiente por mascota **y motivo** | Corta el ruido y deja pasar el caso real | Hay que explicar por qué el motivo forma parte de la clave |
| **D.** Bloquear también si hay uno **emitido y vigente** | Evita certificados superpuestos | Impide renovar antes del vencimiento, que es justo cuando conviene hacerlo |

## Decisión

Elegimos **C**: se rechaza una solicitud si ya existe otra en estado `SOLICITADO` para la misma
mascota y el mismo motivo.

Porque el problema real no es tener varios certificados —eso es legítimo y el dominio lo pide—
sino **pedir dos veces lo mismo mientras el primero todavía espera**.

Un certificado ya emitido **no** bloquea: pedir uno nuevo antes de que venza es renovarlo.

## Consecuencias

- El dueño recibe un `409` que **le dice cuál es la solicitud que ya está esperando**, en vez de
  acumular filas que después no sabe cuál mirar. El id de esa solicitud viaja en la respuesta.
- La cola del veterinario deja de tener duplicados exactos.
- **La regla vive solo en el código.** A diferencia de otras —el borrado con historial, la unicidad
  del email— esta no se puede expresar como restricción de la base: Postgres lo resolvería con un
  índice único parcial (`WHERE estado = 'SOLICITADO'`) y Prisma no sabe declararlo en
  `schema.prisma`. O sea que perdemos la defensa en profundidad: si mañana alguien escribe un
  segundo camino para crear certificados y se olvida el chequeo, la base no lo va a frenar. Queda
  anotado a propósito.
- Si más adelante aparece la necesidad de renovar automáticamente, o de que un certificado emitido
  bloquee, hay que volver a esta decisión: es la opción **D** que descartamos hoy.
