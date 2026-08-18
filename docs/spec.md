# Especificación del sistema — Libreta Sanitaria

> Este documento **es** el relevamiento de requerimientos del proyecto (eje metodológico, clase 2).
> Se completa en la clase 2 y se mantiene actualizado todo el cuatrimestre.
> Regla práctica: si una funcionalidad no está acá, no se implementa.

## 1. El problema

**Para quién:** dueños de mascotas y veterinarios de clínicas chicas y de barrio.

**Qué hace hoy sin el sistema:** la libreta sanitaria es un cuadernito de papel que el
veterinario completa a mano y que guarda el dueño. Se pierde, se moja, se olvida en casa, y la
letra no siempre se entiende. Cuando hay que demostrar que la mascota está al día —para viajar,
para dejarla en una guardería, para anotarla en un concurso— no hay forma de verificar que lo que
dice el papel es cierto.

**Qué mejora:** lleva el historial sanitario de cada mascota en un solo lugar, calcula solo qué
vacunas están al día y cuáles vencidas, y permite emitir un certificado que un tercero puede
verificar online.

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
|---|---|---|
| **Dueño** | La persona que tiene la mascota | Registrar sus mascotas y solicitar certificados |
| **Veterinario** | El profesional que atiende | Registrar aplicaciones de vacunas y emitir o anular certificados |

Un tercer actor **no tiene cuenta**: quien verifica un certificado (aerolínea, guardería,
organizador de un concurso) entra a una página pública con el código y no se registra.

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Una persona con cuenta. Su `rol` define qué puede hacer | Mascota (1‑N como dueño) · Aplicacion (1‑N como veterinario) · Veterinaria (N‑N) |
| **Mascota** | El animal: nombre, especie, fecha de nacimiento, chip | Usuario (N‑1) · Aplicacion (1‑N) · Certificado (1‑N) |
| **Vacuna** | El catálogo: qué vacunas existen, a qué edad mínima se dan, cada cuánto se repiten, si son obligatorias | Aplicacion (1‑N) |
| **Aplicacion** | Que *esta* vacuna se le dio a *esta* mascota *este* día | Mascota (N‑1) · Vacuna (N‑1) · Usuario (N‑1) |
| **Certificado** | El comprobante de que la mascota está al día, con su estado y su código de verificación | Mascota (N‑1) · Usuario (N‑1, quien lo emitió) |
| **Veterinaria** | La clínica donde se atiende | Usuario (N‑N) |

**Relación 1‑N:** un dueño tiene muchas mascotas.
**Relación N‑N:** un veterinario atiende en varias veterinarias, y una veterinaria tiene varios
veterinarios.

## 4. Historias de usuario

Formato: **Como** \<rol>, **quiero** \<acción>, **para** \<beneficio>.
Cada historia lleva su criterio de aceptación: cómo se verifica que está terminada.

> **Todas las historias asumen que el usuario inició sesión con el rol indicado**, salvo la H6,
> que es pública. No se repite en cada criterio: el *Dado* se reserva para las condiciones que,
> si fueran distintas, cambiarían el resultado.

### H1 — Registrar una mascota
**Como** dueño, **quiero** cargar mis mascotas, **para** tener su historial sanitario en un
solo lugar.

Criterios de aceptación:
- [ ] Cuando el dueño carga nombre, especie y fecha de nacimiento, entonces la mascota queda
      asociada a su cuenta y aparece en su listado.
- [ ] Dado que el sistema tiene mascotas de varios dueños, cuando uno entra a su listado,
      entonces ve **solo** las suyas.
- [ ] Caso de error: si la fecha de nacimiento es posterior a hoy, no se guarda y se muestra el
      motivo.

### H2 — Registrar la aplicación de una vacuna
**Como** veterinario, **quiero** registrar la vacuna que acabo de aplicar, **para** que el dueño
vea el historial al día sin depender del papel.

Criterios de aceptación:
- [ ] Cuando el veterinario registra una aplicación indicando mascota, vacuna y fecha, entonces
      queda en el historial de esa mascota con su nombre como responsable.
- [ ] Dado que la vacuna tiene refuerzo, cuando se registra la aplicación, entonces el sistema
      calcula la fecha de la próxima dosis y la muestra.
- [ ] Caso de error: si la fecha de aplicación es posterior a hoy, no se guarda y se muestra el
      motivo — una vacuna no se puede aplicar en el futuro.
- [ ] Caso de error: si la mascota no alcanza la edad mínima de esa vacuna, no se guarda y se
      informa a partir de qué edad corresponde.

### H3 — Ver el estado sanitario de una mascota
**Como** dueño, **quiero** ver de un vistazo qué le falta a mi mascota, **para** no tener que
interpretar fechas sueltas.

Criterios de aceptación:
- [ ] Dado que la mascota tiene aplicaciones cargadas, cuando el dueño abre su ficha, entonces
      cada vacuna del plan aparece como **al día**, **pendiente** o **vencida**.
- [ ] Dado que una vacuna nunca se aplicó y la mascota ya alcanzó la edad mínima, entonces esa
      vacuna aparece como **pendiente**.
- [ ] Dado que la fecha de la próxima dosis ya pasó, entonces esa vacuna aparece como
      **vencida**.

### H4 — Solicitar un certificado
**Como** dueño, **quiero** pedir un certificado sanitario, **para** poder viajar o dejar a mi
mascota en una guardería.

Criterios de aceptación:
- [ ] Dado que la mascota está al día con las vacunas obligatorias, cuando el dueño solicita su
      certificado, entonces queda registrado en estado **solicitado**.
- [ ] Caso de error: si a la mascota le falta alguna vacuna obligatoria, la solicitud no se crea y
      el sistema **enumera cuáles faltan**.

### H5 — Emitir un certificado
**Como** veterinario, **quiero** emitir el certificado de una mascota que está al día, **para**
que el dueño tenga un comprobante verificable.

Criterios de aceptación:
- [ ] Dado que el certificado está solicitado y la mascota sigue al día, cuando el veterinario lo
      emite, entonces pasa a estado **emitido**, se genera su PDF y se le asigna un código de
      verificación único.
- [ ] Caso de error: si entre la solicitud y la emisión venció alguna vacuna obligatoria, no se
      emite y se informa cuál.
- [ ] Caso de error: si quien intenta emitirlo no es veterinario, el sistema responde 403 aunque
      la llamada no venga de la interfaz.

### H6 — Verificar un certificado
**Como** tercero sin cuenta (aerolínea, guardería), **quiero** comprobar que un certificado es
auténtico, **para** confiar en lo que me muestra el dueño.

Criterios de aceptación:
- [ ] Dado que el código de verificación es válido, cuando se abre la página pública, entonces se
      ve la mascota, la fecha de emisión, la de vencimiento y el estado, **sin necesidad de
      sesión**.
- [ ] Dado que el certificado está vencido o anulado, cuando se abre la página, entonces se lo
      muestra explícitamente como no vigente.
- [ ] Caso de error: si el código no existe, la página informa que no se encontró y **no revela**
      ningún dato de otra mascota.

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El dueño registra su mascota (especie y fecha de nacimiento).
2. El veterinario le aplica una vacuna y la registra; el sistema calcula la próxima dosis.
3. El dueño necesita viajar y solicita un certificado desde la ficha de la mascota.
4. El sistema evalúa el plan de vacunación que corresponde a esa especie y esa edad:
   - si falta alguna vacuna obligatoria, **rechaza la solicitud y enumera cuáles**;
   - si está todo al día, la solicitud queda pendiente de emisión.
5. El veterinario revisa y emite el certificado: se genera el PDF y un código de verificación.
6. El dueño muestra el certificado en el aeropuerto o la guardería.
7. Quien lo recibe abre la página pública con el código y ve si está vigente.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

- La **fecha de aplicación** de una vacuna no puede ser posterior a hoy.
- Si hay **próxima dosis**, tiene que ser posterior a la fecha de aplicación.
- Una vacuna **no se puede aplicar antes de la edad mínima** definida para esa especie.
- Un certificado **solo se emite** si todas las vacunas **obligatorias** para la especie y la edad
  de esa mascota están al día.
- Un certificado **vence** cuando vence la primera de las vacunas obligatorias que lo respaldan,
  **o a los 30 días de emitido, lo que ocurra primero**.
- Solo el **veterinario que lo emitió** puede anular un certificado.
- El **dueño ve únicamente sus propias mascotas**, y solo puede pedir certificados para ellas.
- El **veterinario no puede auto-registrarse** como tal: la cuenta con rol veterinario la crea un
  administrador. Si cualquiera pudiera declararse veterinario, podría emitir certificados falsos y
  el sistema entero perdería valor.
- El **código de verificación** es público pero no adivinable, y no expone datos del dueño.

## 7. Requisitos no funcionales

### Usabilidad

- **Eficiencia:** registrar una aplicación se hace en **4 interacciones o menos**, porque el
  veterinario lo hace de pie, con el animal en la camilla.
- **Errores:** si falta un campo obligatorio, se señala el campo y **no se pierde lo ya cargado**.
- **Aprendizaje:** un veterinario que nunca vio el sistema registra una aplicación sin que le
  expliquen.
- **Recuerdo:** el flujo principal está a un clic desde la home y siempre en el mismo lugar.
- **Satisfacción:** se prueba con un veterinario de afuera del equipo antes del Demo Day.

### Accesibilidad

Esta lista es **igual para todos los proyectos**: no hay que adaptarla, hay que cumplirla.

- [ ] Todo se puede operar **con el teclado**, y se ve dónde está el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo *placeholder*.
- [ ] Las imágenes que informan tienen texto alternativo; las decorativas, alternativo vacío.
- [ ] El **contraste** entre texto y fondo llega a **4,5:1** (3:1 si la letra es grande).
- [ ] El error nunca se comunica **solo con color**: siempre hay texto.

## 8. Integración externa

**Cuál:** almacenamiento de archivos (para el PDF del certificado) y envío de mail.

**Para qué:**
- El **PDF** del certificado emitido se guarda y se sirve desde un storage, no desde la base.
- Se manda un **mail al dueño** cuando una vacuna obligatoria está por vencer.

**Qué pasa si se cae:**
- Si falla el storage, el certificado **igual se emite y queda verificable online**; el PDF se
  regenera después. Lo que vale es el registro, no el archivo.
- Si falla el mail, el recordatorio se reintenta; el estado en el sistema no depende de eso.

## 9. Fuera de alcance

Lo que decidimos **no** hacer, para no volver a discutirlo en la clase 12.

- **Turnos y agenda** del veterinario. Este sistema registra lo que ya pasó, no lo que va a pasar.
- **Historia clínica completa** (diagnósticos, tratamientos, estudios). Solo vacunas y controles.
- **Pagos** de cualquier tipo.
- **Verificación real de la matrícula** del veterinario contra un colegio profesional. Se carga a
  mano y se confía.
- **Una persona con dos roles a la vez.** Cada usuario tiene un solo rol, así que un veterinario
  que además tenga mascotas propias necesitaría una segunda cuenta. Es una simplificación
  consciente: soportar varios roles por persona complicaría todos los permisos del sistema.
- **App nativa** y notificaciones push. Es una web, y tiene que andar bien en el celular.
- **Multi-idioma.**
